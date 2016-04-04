import networkx as nx
from pyspark.sql.types import *
from pyspark.sql import Row

class Nx_Edge(object):

  def __init__(self, edge_tuple ):
    self.src = edge_tuple[0]
    self.dst = edge_tuple[1]
    data = edge_tuple[2]
    self.weight = data['weight']

class Df_Edge(object):
  """This class represented one of the edges of df_edges,
  and NOT any of the edges of networkx"""

  def __init__(self, features):
    self.features = ["affinities_sum",
                     "contact_region_size"]
    self.affinities_sum = features[0]
    self.contact_region_size = features[1]

  @staticmethod
  def merge_edges(edge_1, edge_2):
    
    edge_1 = Df_Edge(edge_1)
    edge_2 = Df_Edge(edge_2)

    affinities_sum = edge_1.affinities_sum + edge_2.affinities_sum
    contact_region_size = edge_1.contact_region_size + edge_2.contact_region_size

    return (affinities_sum, contact_region_size)

  @staticmethod
  def map_key_value( kv ):
    k , features = kv
    return (k[0], k[1], features[0], features[1] )

class Node(object):

  @staticmethod
  def merge_nodes(r):
    new_size = r.v1_size + r.v2_size
    return Row(id=r.new_id, size=new_size)

class Triplets(object):

  @classmethod
  def compute_new_weight(cls, r):

    cls.u = Node()
    cls.v = Node()

    assert r.src < r.dst

    weight = r.affinities_sum/ float(r.contact_region_size)
    return (r.src, r.dst, weight)

class Graph(object):

  def __init__(self, sc,  sqlContext, df_nodes, df_edges):
    self.sc = sc
    self.sqlContext = sqlContext

    #dataframes distributed graph
    #it containes the large information and does the heavy computation
    self.next_node_id = 0
    self.df_nodes = df_nodes
    self.df_edges = df_edges
    self.df_nodes.registerTempTable("nodes")
    self.df_edges.registerTempTable("edges")

    #TODO change the dendograms for a heap
    #or some other tree structure where it takes O(1) to
    #find successors and predeccessors
    self.edge_dendogram = nx.DiGraph()
    self.node_dendogram = nx.DiGraph()

    #networx graph contains ids and weights, orchestrates the aglomeration, resides only in the driver
    self.nx_g = nx.Graph()
    self.populate_nx_from_df()

    for edge in self.nx_g.edges(data=True):
      assert Nx_Edge(edge).weight != None

  def create_node(self, vertex_id=None, children = []):
    if vertex_id == None:
      vertex_id = self.next_node_id
      self.next_node_id += 1
    else:
     self.next_node_id = max(self.next_node_id , vertex_id)
    
    #If it has childrens this node has to be created based on them
    needs_update = len(children) > 0 
    self.nx_g.add_node( vertex_id)
    self.node_dendogram.add_node(vertex_id, needs_update=needs_update)
    for child in children:
      self.node_dendogram.add_edge(vertex_id,child)
    return vertex_id

  def create_edge(self, one, another, weight=None , children = []):

    assert one in self.node_dendogram and another in self.node_dendogram
    #src should be always smaller done the destination
    one , another = self.sort_tuple(one, another)

    self.nx_g.add_edge( one, another, weight= weight )

    #If it has childrens this edge has to be created based on them
    needs_update = len(children) > 0 or weight == None  # is the second condition enogh?
    self.edge_dendogram.add_node( (one, another) , needs_update=needs_update)

    for child in children:
      #Make sure the child edge has the right order
      child = self.sort_tuple(*child)
      self.edge_dendogram.add_edge( (one, another) , child)

  def populate_nx_from_df(self):
    nodes_ids = self.sqlContext.sql("select id from nodes").collect()
    map(lambda row: self.create_node(row.id) , nodes_ids)

    edges =  self.sqlContext.sql("select src, dst from edges")
    def add_edge(edge):
      assert edge.src < edge.dst, 'edge src has to be smaller than edge.dst'
      self.create_edge(edge.src, edge.dst)
    map(add_edge, edges.collect())

    self.df_edges.registerTempTable('new_edges')
    self.update_weights()    
    self.df_edges.registerTempTable('edges')

  @staticmethod
  def sort_tuple( elem_1 , elem_2 ):
    if elem_1 < elem_2:
      return elem_1, elem_2
    else:
      return elem_2, elem_1

  def get_edges_to_agglomerate(self, min_threshold = 0.0001):
    #sort edges from largest weight to smallest one, 
    #largest weight means that it is more probable that two pieces should go together
    sorted_edges = self.nx_g.edges(data=True)
    sorted_edges = filter(lambda edge: Nx_Edge(edge).weight > min_threshold, sorted_edges)
    sorted_edges = list(sorted(sorted_edges , key=lambda edge: Nx_Edge(edge).weight, reverse=True))
    return sorted_edges

  def update_neighboor_edges(self, new_node, u, v):
    #Recompute this edges because at least one of the nodes
    #has changed
    n_u = self.nx_g.neighbors(u)
    n_v = self.nx_g.neighbors(v)
    for neighbor in n_u + n_v:
      #Don't create a new between the nodes we are merging
      if neighbor == u or neighbor == v:
        continue

      children = []
      if neighbor in n_u:
        children.append( self.sort_tuple(neighbor, u) )

      if neighbor in n_v:
        children.append( self.sort_tuple(neighbor, v) )

      assert len(children) > 0
      self.create_edge( new_node, neighbor, children=children)

  def agglomerate(self):

    for edge in self.get_edges_to_agglomerate():
      edge = Nx_Edge(edge)

      #Check if the edge is still valid.
      #If one of the nodes has been removed, if it has it means it has been
      #used for some other merge operation before
      if not self.nx_g.has_edge(edge.src, edge.dst):
        continue
      
      #create new vertex
      new_node = self.create_node(children=[edge.src, edge.dst])
      self.update_neighboor_edges(new_node, edge.src, edge.dst)
      #remove both nodes which got merge, this will remove all the old edges around them
      #making merges be independent
      self.nx_g.remove_node(edge.src)
      self.nx_g.remove_node(edge.dst)

    self.update_nodes()
    self.update_edges()
    self.info()
  
  def update_nodes(self):
    #TODO we are leaving the edge that connect this two nodes in df_edges
    #maybe we need the edge features when merge the two nodes.
    nodes_to_update = self.get_nodes_to_update() 
    if len(nodes_to_update) == 0:
      print 'no nodes to merge'
      return

    rows_to_get = []
    for new_node , successor_nodes in nodes_to_update.iteritems():
      
      #if this start failing we can take same approach as in update edges, where we merge many 
      #edges at the same time
      assert len(successor_nodes) == 2 
      rows_to_get.append( (new_node, successor_nodes[0], successor_nodes[1]) )
      self.node_dendogram.node[new_node]['needs_update'] = False
    
    schema = StructType([StructField('new_id',LongType()), StructField('u',LongType()),StructField('v',LongType())])
    to_merge = self.sqlContext.createDataFrame(rows_to_get,schema)
    to_merge.registerTempTable('rows_to_get')
    nodes_pair = self.sqlContext.sql("""SELECT vm.new_id, v1.id as v1_id, v1.size as v1_size,
                                        v2.id as v2_id, v2.size as v2_size
                                        FROM rows_to_get as vm
                                        INNER JOIN nodes as v1 on vm.u = v1.id
                                        INNER JOIN nodes as v2 on vm.v = v2.id
                                        """)

    new_nodes = nodes_pair.map(Node.merge_nodes).toDF()
    self.df_nodes = self.df_nodes.unionAll(new_nodes)
    self.remove_old_nodes(nodes_to_update)
    #Everytime you replace the dataframe , remember to re-register the table
    self.df_nodes.registerTempTable('nodes')

  def update_weights(self):
    triplets = self.sqlContext.sql("""select ne.*,
                            u.* , v.*
                           FROM new_edges as ne
                           INNER JOIN nodes as u on ne.src = u.id 
                           INNER JOIN nodes as v on ne.dst = v.id""")

    triplets = triplets.map(Triplets.compute_new_weight).toDF(['src','dst','weight'])
    for edge in triplets.collect():
      self.nx_g[edge.src][edge.dst]['weight'] = edge.weight


  def get_edges_to_update(self):
    return self.get_needs_update_from_dendogram(self.edge_dendogram)

  def get_nodes_to_update(self):
    return self.get_needs_update_from_dendogram(self.node_dendogram)

  def get_needs_update_from_dendogram(self, dendogram):
    #TODO maybe convert this to an iterator

    items_to_update = {}
    for item in nx.nodes_iter(dendogram):
      has_no_predeccessors = len(dendogram.predecessors(item)) == 0
      needs_update = dendogram.node[item]['needs_update']
      if not has_no_predeccessors or not needs_update:
        continue

      has_succesors = len(dendogram.successors(item)) != 0
      if has_succesors:
        items_to_update[item] = self.get_successors_which_not_need_updates(item,dendogram)
      else:
        #update the edge based on itself
        items_to_update[item] = [item]
    return items_to_update

  @staticmethod
  def get_successors_which_not_need_updates(node, dendogram):
    succesors_list = []
    for succesor in dendogram.successors_iter(node):
      if type(succesor) == tuple:
        succesor = Graph.sort_tuple(*succesor)

      if dendogram.node[succesor]['needs_update']:
        succesors_list.extend(
          Graph.get_successors_which_not_need_updates(succesor, dendogram)
        )
      else:
        succesors_list.append( succesor )
    return succesors_list

  def remove_old_edges(self, edges_to_update):
    edges_to_remove = [item for sublist in edges_to_update.values() for item in sublist]
    print 'planning to remove {} of {} edges'.format( len(edges_to_remove) ,  self.df_edges.count() )
    edges_to_remove = self.sc.broadcast(set(edges_to_remove))
    self.df_edges = self.df_edges.rdd.filter(
      lambda edge: (edge.src , edge.dst) not in edges_to_remove.value)
    print 'new size is {}'.format(self.df_edges.count())
    self.df_edges = self.df_edges.toDF(['src','dst','affinities_sum', 'contact_region_size'])

  def remove_old_nodes(self, nodes_to_update):
    nodes_to_remove = [item for sublist in nodes_to_update.values() for item in sublist] 
    nodes_to_remove = self.sc.broadcast(set(nodes_to_remove))
    self.df_nodes = self.df_nodes.rdd.filter(
      lambda vertex: vertex.id not in nodes_to_remove.value)
    self.df_nodes = self.df_nodes.toDF(['id','size'])

  def update_edges(self):

    edges_to_update = self.get_edges_to_update()
    if len(edges_to_update)  == 0:
      return
    
    rows_to_get = []
    for edge in edges_to_update:
      self.edge_dendogram.node[edge]['needs_update'] = False

      for existent_edge in edges_to_update[edge]:
        rows_to_get.append( (edge , existent_edge[0],existent_edge[1]) )

    schema = StructType([StructField('new_edge',ArrayType(LongType())),
                         StructField('src',LongType()),
                         StructField('dst',LongType())])
       
    self.sqlContext.createDataFrame(rows_to_get,schema).registerTempTable('edges_to_update')
    rows = self.sqlContext.sql("""select eu.new_edge,  e.affinities_sum, e.contact_region_size
                           from edges_to_update as eu
                           LEFT JOIN edges as e on eu.src = e.src AND eu.dst = e.dst""")

    #I have to convert to tuples here, otherwise it is unhasable and cannot get reduce
    kv = rows.rdd.map(lambda row: ( tuple(row.new_edge) , (row.affinities_sum, row.contact_region_size)) ) 


    #Add new edges
    new_edges = kv.reduceByKey(Df_Edge.merge_edges).map(Df_Edge.map_key_value).toDF(['src','dst','affinities_sum', 'contact_region_size'])
    new_edges.registerTempTable('new_edges')
    self.update_weights()

    self.remove_old_edges(edges_to_update)
    #Everytime you replace the dataframe , remember to re-register the table
    self.df_edges = self.df_edges.unionAll(new_edges)
    self.df_edges.registerTempTable('edges')

  def get_edges_for_humans(self):
    def get_atomic_supervoxels(node):
      atomics = set()
      successors = list(self.node_dendogram.successors_iter( node ))

      if len(successors) != 0:
        for succesor in successors:
          atomics = atomics.union(get_atomic_supervoxels(succesor))
      else:
        atomics.add( node )
      return atomics

    sorted_edges = self.nx_g.edges(data=True)

    def edge_priority(edge):
      assert Nx_Edge(edge).weight != None
      return  0.5 - Nx_Edge(edge).weight

    sorted_edges = filter(lambda edge: Nx_Edge(edge).weight < 0.75, sorted_edges)
    sorted_edges = list(sorted(sorted_edges , key=edge_priority))

    responses = []
    for edge in sorted_edges:
      atomic_1 = list(get_atomic_supervoxels(edge[0]))
      atomic_2 = list(get_atomic_supervoxels(edge[1]))
      response = { "edge": [edge[0],edge[1]] , "atomic_1":atomic_1, "atomic_2":atomic_2 }
      responses.append(response)

      if len(responses) == 40:
        return responses

    return response

  def set_edge_weight(self, edge, weight):

    if not self.nx_g.has_edge(*edge):
      print 'we do not have this edge anymore'
      return

    self.nx_g[edge[0]][edge[1]]['weight'] = weight

  def plot(self):
    import matplotlib.pyplot as plt
    # https://networkx.github.io/documentation/latest/examples/drawing/labels_and_colors.html
    pos = nx.spring_layout(self.g)
    nx.draw_networkx_nodes(self.g, pos, node_color='b', node_size=500, alpha=0.8)
    nx.draw_networkx_edges(self.g, pos, width=8, alpha=0.5, edge_color='b')

      
    labels = self.g.nodes()
    dict_labels = dict()
    for n in range(len(labels)):
      dict_labels[n] = str(labels[n].ids)

    # nx.draw_networkx_labels(self.g, pos.values(), dict_labels, font_size=16)
    plt.axis('off')
    plt.show()
 
    return

  def info(self):
    print nx.info(self.nx_g)
    print 'df_nodes count:', self.df_nodes.count() 
    print 'df_edges count:', self.df_edges.count() 


  def stats(self):
    T=nx.minimum_spanning_tree(self.g)
    print(sorted(T.edges(data=True)))

