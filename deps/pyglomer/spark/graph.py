import matplotlib.pyplot as plt
import networkx as nx
from heapq import *
from collections import namedtuple
from graphframes import GraphFrame
from pyspark.sql.types import *
from pyspark.sql import Row



class Edge(object):

  def __init__(self, edge_tuple ):
    self.src = edge_tuple[0]
    self.dst = edge_tuple[1]
    data = edge_tuple[2]
    self.weight = data['weight']

  def to_row(self):
    # return Row(src=self.src, dst=self.dst, weight=self.weight)
    return Row(src=list(self.src), dst=list(self.dst))

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
    needs_update = len(children) > 0
    self.edge_dendogram.add_node( (one, another) , needs_update=needs_update)

    for child in children:
      #Make sure the child edge has the right order
      child = self.sort_tuple(*child)
      self.edge_dendogram.add_edge( (one, another) , child)


  def populate_nx_from_df(self):
    nodes_ids = self.sqlContext.sql("select id from nodes").collect()
    map(lambda row: self.create_node(row.id) , nodes_ids)

    edges =  self.sqlContext.sql("select src, dst, weight from edges").collect()
    def add_edge(edge):
      assert edge.src < edge.dst, 'edge src has to be smaller than edge.dst'
      self.create_edge(edge.src, edge.dst, edge.weight)

    map(add_edge, edges)

  @staticmethod
  def sort_tuple( elem_1 , elem_2 ):
    if elem_1 < elem_2:
      return elem_1, elem_2
    else:
      return elem_2, elem_1

  @profile
  def agglomerate(self):

    nodes_to_merge = list()
    #sort edges from largest weight to smallest one, 
    #largest weight menas that it is more probable that two pieces should go together
    sorted_edges = self.nx_g.edges(data=True)
    sorted_edges = filter(lambda edge: Edge(edge).weight > 0.7, sorted_edges)
    sorted_edges = list(sorted(sorted_edges , key=lambda edge: Edge(edge).weight, reverse=True))
    for edge in sorted_edges:
      edge = Edge(edge)

      #Check if the edge is still valid.
      #If one of the nodes has been removed, it means it has been
      #used for some other merge operation
      if not self.nx_g.has_edge(edge.src, edge.dst):
        continue
      
      #create new vertex
      new_node = self.create_node(children=[edge.src, edge.dst])

      # if new_node == 21593 or edge.src == 21593 or edge.dst == 21593:
      #   import ipdb; ipdb.set_trace()

      nodes_to_merge.append((new_node , edge.src, edge.dst))
      #Recompute this edges because at least one of the nodes
      #has changed
      n_src = self.nx_g.neighbors(edge.src)
      n_dst = self.nx_g.neighbors(edge.dst)
      for neighbor in n_src + n_dst:
        if neighbor == edge.src or neighbor == edge.dst:
          continue

        children = []
        if neighbor in n_src:
          children.append( self.sort_tuple(neighbor, edge.src) )

        neighbor_dst_edge = self.nx_g.get_edge_data(neighbor, edge.dst)
        if neighbor in n_dst:
          children.append( (neighbor, edge.dst) )

        assert len(children) > 0
        self.create_edge( new_node, neighbor, children=children)


      #remove both nodes which got merge, this will remove all the old edges around them
      #making merges be independent
      self.nx_g.remove_node(edge.src)
      self.nx_g.remove_node(edge.dst)

      assert edge.src not in self.nx_g
      assert edge.dst not in self.nx_g
      assert self.nx_g.has_edge(edge.src, edge.dst) == False

    self.merge_nodes(nodes_to_merge)
    self.update_edges()
    self.info()

    #If an edge doesn't have a weight attribute I should update it
    # print self.nx_g.edges(data="weight")
  
  @profile
  def merge_nodes(self, nodes_to_merge):
    #TODO modify this so it doesn't require an argument, and it only uses the dendogram
    #maybe we can keep a list of nodes add which needs_update

    #TODO we are leaving the edge that connect this two nodes in df_edges
    #maybe we need the edge features when merge the two nodes.
    if len(nodes_to_merge) == 0:
      print 'no nodes to merge'
      return

    schema = StructType([StructField('new_id',LongType()), StructField('u',LongType()),StructField('v',LongType())])
    to_merge = self.sqlContext.createDataFrame(nodes_to_merge,schema)
    to_merge.registerTempTable('nodes_to_merge')
    nodes_pair = self.sqlContext.sql("""SELECT vm.new_id, v1.id as v1_id, v1.size as v1_size,
                                        v2.id as v2_id, v2.size as v2_size
                                        FROM nodes_to_merge as vm
                                        INNER JOIN nodes as v1 on vm.u = v1.id
                                        INNER JOIN nodes as v2 on vm.v = v2.id
                                        """)

    def merge_nodes(r):
      new_size = r.v1_size + r.v2_size
      return Row(id=r.new_id, size=new_size)

    new_nodes = nodes_pair.map(merge_nodes).toDF()
    self.df_nodes = self.df_nodes.unionAll(new_nodes)

    #remove old nodes
    nodes_to_remove = set()
    def add_vertex_ids(node):
      nodes_to_remove.add(node[0])
      nodes_to_remove.add(node[1])
    map(add_vertex_ids, nodes_to_merge)

    # nodes_to_remove = self.sc.broadcast(nodes_to_remove)
    # self.df_nodes = self.df_nodes.rdd.filter(lambda vertex: vertex.id not in nodes_to_remove.value).toDF(['id','size'])

    #Everytime you replace the dataframe , remember to re-register the table
    self.df_nodes.registerTempTable('nodes')

    #set dendogram nodes as don't needs update
    for vetex_to_merge in nodes_to_merge:
      new_vertex = vetex_to_merge[0]
      self.node_dendogram.node[new_vertex]['needs_update'] = False

  def get_edges_to_update(self):
    return self.get_needs_update_from_dendogram(self.edge_dendogram)

  def get_nodes_to_update(self):
    return self.get_needs_update_from_dendogram(self.node_dendogram)

  def get_needs_update_from_dendogram(self, dendogram):
    #TODO maybe convert this to an iterator

    items_to_update = []
    for item in nx.nodes_iter(dendogram):
      has_no_predeccessors = len(dendogram.predecessors(item)) == 0
      needs_update = dendogram.node[item]['needs_update']
      if not has_no_predeccessors or not needs_update:
        continue
      items_to_update.append(item)

    return items_to_update
 
  @profile
  def update_edges(self):

    def get_successors_edges_which_not_need_updates(edge):
      edges = []
      for succesor in self.edge_dendogram.successors_iter( edge ):
        succesor = self.sort_tuple(*succesor)

        if self.edge_dendogram.node[succesor]['needs_update']:
          edges = edges + get_successors_edges_which_not_need_updates(succesor)
        else:
          edges.append( succesor )

      return edges


    edges_to_update = {}
    rows_to_get = []
    for edge in self.get_edges_to_update():
      edges_to_update[edge] = get_successors_edges_which_not_need_updates(edge)
      self.edge_dendogram.node[edge]['needs_update'] = False

      for existent_edge in edges_to_update[edge]:
        rows_to_get.append( (edge , existent_edge[0],existent_edge[1]) )

    schema = StructType([StructField('new_edge',ArrayType(LongType())),
                         StructField('src',LongType()),
                         StructField('dst',LongType())])
     
    self.sqlContext.createDataFrame(rows_to_get,schema).registerTempTable('edges_to_update')
    rows = self.sqlContext.sql("""select eu.new_edge,  e.weight
                           from edges_to_update as eu
                           LEFT JOIN edges as e on eu.src = e.src AND eu.dst = e.dst""")

    if len(edges_to_update)  == 0:
      return

    kv = rows.rdd.map(lambda row: ( tuple(row.new_edge) , (row.weight,)) ) #I have to convert to tuples here, otherwise it is unhasable and cannot get reduce
    def merge_edges(edge_1, edge_2):
      weight_1 = edge_1[0]
      weight_2 = edge_2[0]
      new_weight = (weight_1 + weight_2) / 2
      return (new_weight,)

    #Add new edges
    new_edges = kv.reduceByKey(merge_edges).map(lambda row: (row[0][0], row[0][1], row[1][0])).toDF(['src','dst','weight'])
    new_edges.registerTempTable('new_edges')


    triplets = self.sqlContext.sql("""select ne.src as ne_src, ne.dst as ne_dst, ne.weight as ne_weight,
                            u.* , v.*
                           FROM new_edges as ne
                           INNER JOIN nodes as u on ne.src = u.id 
                           INNER JOIN nodes as v on ne.dst = v.id""")

    def compute_new_weight(row): #TODO finish this
      assert row.ne_src < row.ne_dst
      return (row.ne_src, row.ne_dst, row.ne_weight)

    triplets = triplets.map(compute_new_weight).toDF(['src','dst','weight'])
    #update weight in networkx
    #TODO don't get more that the weight
    for edge in triplets.collect():
      self.nx_g[edge.src][edge.dst]['weight'] = edge.weight

    self.df_edges = self.df_edges.unionAll(triplets)

    #remove old edges
    # edges_to_remove = self.sc.broadcast(set(edges_to_remove))
    # self.df_edges = self.df_edges.rdd.filter(lambda edge: (edge.src , edge.dst) not in edges_to_remove.value).toDF(['src','dst','weight'])

    #Everytime you replace the dataframe , remember to re-register the table

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
      assert Edge(edge).weight != None
      return  0.5 - Edge(edge).weight

    sorted_edges = filter(lambda edge: Edge(edge).weight < 0.75, sorted_edges)
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

  def stats(self):
    T=nx.minimum_spanning_tree(self.g)
    print(sorted(T.edges(data=True)))

