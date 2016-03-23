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
    #or someother tree structure where it takes O(1) to
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
    self.nx_g.add_node( vertex_id, needs_update=needs_update)
    self.node_dendogram.add_node(vertex_id)
    for child in children:
      self.node_dendogram.add_edge(vertex_id,child)
    return vertex_id

  def create_edge(self, one, another, weight=None , children = []):
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
      assert edge.src < edge.dst,'edge src has to be smaller than edge.dst'
      self.create_edge(edge.src, edge.dst, edge.weight)

    map(add_edge, edges)

  @staticmethod
  def sort_tuple( elem_1 , elem_2 ):
    if elem_1 < elem_2:
      return elem_1, elem_2
    else:
      return elem_2, elem_1


  def agglomerate(self):

    nodes_to_merge = list()
    #sort edges from largest weight to smallest one, 
    #largest weight menas that it is more probable that two pieces should go together
    sorted_edges = filter(lambda edge: Edge(edge).weight > .85, sorted(self.nx_g.edges(data=True), key=lambda edge: Edge(edge).weight, reverse=True))
    print sorted_edges
    for edge in sorted_edges:
      edge = Edge(edge)

      #Check if the edge is still valid.
      #If one of the nodes has been removed, it means it has been
      #used for some other merge operation
      if not self.nx_g.has_edge(edge.src, edge.dst):
        continue

      #create new vertex
      new_node = self.create_node(children=[edge.src, edge.dst])
      nodes_to_merge.append((new_node , edge.src, edge.dst))
      #Recompute this edges because at least one of the nodes
      #has changed
      n_src = self.nx_g.neighbors(edge.src)
      n_dst = self.nx_g.neighbors(edge.dst)
      for neighbor in n_src + n_dst:

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

    self.merge_nodes(nodes_to_merge)
    self.update_edges()

    #If an edge doesn't have a weight attribute I should update it
    # print self.nx_g.edges(data="weight")

  def merge_nodes(self, nodes_to_merge):
    #TODO modify this so it doesn't require an argument, and it only uses the dendogram
    #maybe we can keep a list of nodes add which needs_update

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

  def update_edges(self):

    def get_successors_edges_which_not_need_updates(edge, l_edge=[] ):

      for succesor in self.edge_dendogram.successors_iter( edge ):
        succesor = self.sort_tuple(*succesor)

        if self.edge_dendogram.node[succesor]['needs_update']:
          l_edge = l_edge + get_successors_edges_which_not_need_updates(succesor, l_edge)
        else:
          l_edge.append( succesor )

      return l_edge


    edges_to_update = {}
    rows_to_get = []
    for edge in self.get_edges_to_update():
      edges_to_update[edge] = get_successors_edges_which_not_need_updates(edge)
      # self.edge_dendogram.node[edge]['needs_update'] = False
      for existent_edge in edges_to_update[edge]:
        rows_to_get.append( (edge , existent_edge[0],existent_edge[1]) )



    schema = StructType([StructField('new_edge',ArrayType(LongType())),
                         StructField('src',LongType()),
                         StructField('dst',LongType())])
     
    self.sqlContext.createDataFrame(rows_to_get,schema).registerTempTable('edges_to_update')
    rows = self.sqlContext.sql("""select eu.new_edge,  e.weight
                           from edges_to_update as eu
                           LEFT JOIN edges as e on eu.src = e.src AND eu.dst = e.dst""")

    # rows2 = self.sqlContext.sql("""select eu.*,  e.*
    #                        from edges_to_update as eu
    #                        LEFT JOIN edges as e on eu.src = e.src AND eu.dst = e.dst""")
    # rows2.filter("weight is null").show()
    #Convert dataframe in a key value rdd so that I can reduce by key
    #this is used to merge the features
    kv = rows.rdd.map(lambda row: ( tuple(row.new_edge) , (row.weight,)) ) #I have to convert to tuples here, otherwise it is unhasable and cannot get reduce
    def merge_edges(edge_1, edge_2):
      weight_1 = edge_1[0]
      weight_2 = edge_2[0]
      new_weight = (weight_1 + weight_2) / 2
      return (new_weight,)

    #Add new edges
    new_edges = kv.reduceByKey(merge_edges).map(lambda row: (row[0][0], row[0][1], row[1][0])).toDF(['src','dst','weight'])
    new_edges.registerTempTable('new_edges')

    def compute_new_weight(row): #TODO finish this
      return Row(src= row.src, dst=row.dst, weight=row.weight)

    triplets = self.sqlContext.sql("""select u.* , v.*, ne.*
                           FROM new_edges as ne
                           INNER JOIN nodes as u on ne.src = u.id 
                           INNER JOIN nodes as v on ne.dst = v.id""")
    triplets = triplets.map(compute_new_weight).toDF(['src','dst','weight'])

    triplets.filter("src = 1772 and dst = 21783").show()

    self.df_edges = self.df_edges.unionAll(triplets)
    self.df_edges.filter("weight is null").show()

    #remove old edges
    # edges_to_remove = self.sc.broadcast(set(edges_to_remove))
    # self.df_edges = self.df_edges.rdd.filter(lambda edge: (edge.src , edge.dst) not in edges_to_remove.value).toDF(['src','dst','weight'])

    #Everytime you replace the dataframe , remember to re-register the table

    self.df_edges.registerTempTable('edges')


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

  # def get_next_edges_to_merge_unfiltered(self):
  #   """ Return the edges we are most CERTAIN about merging,
  #       This is used by greedy agglomeration"""

  #   edges =  self.sqlContext.sql("""select e.src, e.dst, e.weight
  #                     FROM edges as e
  #                     INNER JOIN vertices as v1 on e.src = v1.id
  #                     INNER JOIN vertices as v2 on e.dst = v2.id
  #                     WHERE (v1.size > 100000 and v2.size > 10000)
  #                     OR (v1.size > 10000 and v2.size > 100000)
  #                     order by e.mean_affinity DESC""").collect()

  #   return edges

  # def get_next_edges_to_ask(self):
  #   """ Return the edges we are most UNCERTAIN about merging,
  #       This edges are sent to proofreaders."""

  #   edges =  self.sqlContext.sql("""select e.src, e.dst, e.mean_affinity
  #                     FROM edges as e
  #                     INNER JOIN vertices as v1 on e.src = v1.id
  #                     INNER JOIN vertices as v2 on e.dst = v2.id
  #                     WHERE (v1.size > 100000 and v2.size > 10000)
  #                     OR (v1.size > 10000 and v2.size > 100000)
  #                     order by abs(0.5 - e.mean_affinity)""").collect()
  #   return edges