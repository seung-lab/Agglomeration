import matplotlib.pyplot as plt
import networkx as nx
from heapq import *
from collections import namedtuple

class Node(object):

  def __init__(self):
    return

  def __str__(self):
     return "ids:" + str(self.ids) + "\t size:"+ str(self.size)

  def from_tuple(self, values ):

    print len(values)
    # key , values = t
    # self.ids = key
    self.contact = values[0]
    self.size = values[1]
    self.mesh = values[2]

    return self

  def to_tuple(self):
    return ( self.ids, ( self.contact, self.size, self.mesh ))

  def merge(self, other ):
    self.ids = ( list(self.ids) + list( other.ids ) )
    self.contact = self.contact.union(other.contact)
    self.size += other.size
    #TODO merge meshes
    return self

class Edge(object):

  def __init__(self):
    pass

class Graph(object):

  def __init__(self, sc):
    self.sc = sc
    self.g = nx.Graph()
    self.pq_edges = []
    return



  def add_edge(self, seg_1, seg_2 , weight=None):
  

    if weight:
      self.g.add_edge( seg_1, seg_2, weight=weight )
      heappush( self.pq_edges , (-weight, seg_1, seg_2)) # the negative in the weight is to convert from minpq to maxpq
    else:
      self.g.add_edge( seg_1, seg_2 )


  def join_nodes(self, seg_1, seg_2):
    neighbors_1 = self.g.neighbors(seg_1)
    neighbors_2 = self.g.neighbors(seg_2)
    neighbors = neighbors_1 + neighbors_2
    neighbor_edges = []

    self.g.remove_node(seg_1)
    self.g.remove_node(seg_2)

    for neighbor in neighbors:
      self.g.add_edge( (seg_1, seg_2) , neighbor )
      neighbor_edges.append( ((seg_1, seg_2) ,neighbor) )

    return neighbor_edges

  def merge_next_n(self, n , max_weight = 0.9):
    """
      
    """
    nodes_to_merge = []
    edges_to_compute = []
    while len(self.pq_edges) and  len(nodes_to_merge) < n:
      edge = heappop(self.pq_edges)
      if -edge[0] < max_weight:
        return nodes_to_merge
      
      try:
        neighbors = self.join_nodes(edge[1], edge[2])
      except  nx.NetworkXError, e:
        continue

      nodes_to_merge.append( (edge[1], edge[2]) )
      edges_to_compute += neighbors

    return nodes_to_merge, edges_to_compute

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


  def stats(self):
    T=nx.minimum_spanning_tree(self.g)
    print(sorted(T.edges(data=True)))