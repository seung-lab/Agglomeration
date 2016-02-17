import matplotlib.pyplot as plt
import networkx as nx
from heapq import *
from collections import namedtuple

class Node(object):

  def __init__(self):
    return

  def __str__(self):
     return "ids:" + str(self.ids) + "\t size:"+ str(self.size)

  def from_tuple(self, t ):

    key , values = t
    self.ids = key
    self.contact = values[0]
    self.size = values[1]
    self.mesh = values[2]

  def Merge( otherNode ):
    pass


class Edge(object):

  def __init__(self):
    pass

MergeTask = namedtuple('MergeTask', ['ids_to_merge', 'ids_neighbors' , 'nodes'])
class Graph(object):

  def __init__(self, sc):
    self.sc = sc
    self.g = nx.Graph()
    self.pq_edges = []
    return

  def plot(self):
    # https://networkx.github.io/documentation/latest/examples/drawing/labels_and_colors.html
    pos = nx.spring_layout(self.g)
    print pos
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

  def add_edge(self, seg_1, seg_2 , weight=None):
    # node_1 = Node(seg_1)
    # node_2 = Node(seg_2)

    self.g.add_edge( seg_1, seg_2 )
    heappush( self.pq_edges , (weight, seg_1, seg_2))

  def join_nodes(self, seg_1, seg_2):
    neighbors_1 = self.g.neighbors(seg_1)
    neighbors_2 = self.g.neighbors(seg_2)
    neighbors = neighbors_1 + neighbors_2

    self.g.remove_node(seg_1)
    self.g.remove_node(seg_2)

    for neighbor in neighbors:
      self.g.add_edge( (seg_1, seg_2) , neighbor )

    return neighbors

  def merge_next_n(self, n , max_weight = 0.4):

    to_merge = []
    while len(self.pq_edges) and  len(to_merge) < n:
      edge = heappop(self.pq_edges)
      if edge[0] > max_weight:
        return to_merge
      
      try:
        neighbors = self.join_nodes(edge[1], edge[2])
      except Exception, e:
        continue

      mt = MergeTask((edge[1], edge[2]), neighbors, {})
      to_merge.append( mt )

    return to_merge




  def stats(self):
    T=nx.minimum_spanning_tree(self.g)
    print(sorted(T.edges(data=True)))
