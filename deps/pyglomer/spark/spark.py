from pyspark import *
from pyglomer.spark.datasets import *
from pyglomer.spark.graph import *
from pyspark.sql import SQLContext
from graphframes import *

import networkx as nx

import pprint
pp = pprint.PrettyPrinter(indent=2, depth=5)

from heapq import *

def _remove_id(id1_edge_n1):
  id1 = id1_edge_n1[0]
  edge = id1_edge_n1[1][0]
  n1 = id1_edge_n1[1][1]
  return edge, n1 


def _evaluate_triple( unused ):
    return unused[0], np.random.rand()

def merge_nodes(node_pairs , nodes):
  pairs = sc.parallelize(node_pairs)
  n1 = pairs.map(lambda pair: (pair[0], pair) ).join(nodes).map(_remove_id)
  n2 = pairs.map(lambda pair: (pair[1], pair) ).join(nodes).map(_remove_id)
  triple = n1.join(n2)
  new_nodes = triple.map(lambda pair: pair[1][0].merge(pair[1][1]) )
  print new_nodes.take(1)
  return nodes.join(new_nodes)


def score_edges(edges, nodes):
  edges = sc.parallelize(edges)
  n1 = edges.map(lambda edge: (edge[0], edge) ).join(nodes).map(_remove_id)
  n2 = edges.map(lambda edge: (edge[1], edge) ).join(nodes).map(_remove_id)
  triple = n1.join(n2)

  print edges.count() , triple.count()
  edge_scores = triple.map(_evaluate_triple).collect()
  for edge_score in edge_scores:
      edge = edge_score[0]
      score = edge_score[1]
      dataset.graph().add_edge(*edge, weight=score)
  
def read_features( dataset ):

  nodes =  sc.pickleFile(dataset.files('nodes'))
  dataset.g.g = nx.read_gpickle(dataset.files('graph'))
  score_edges( dataset.g.g.edges(), nodes )
  
  nodes_to_merge, edges_to_score = dataset.graph().merge_next_n(10)
  nodes = merge_nodes( nodes_to_merge, nodes )
  score_edges( edges_to_score, nodes )



if __name__ == '__main__':

  conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "5g")
  conf.set("spark.executor.cores", 1)
  conf.set("spark.driver.memory","5g")

  sc = SparkContext(conf=conf)
  sqlContext = SQLContext(sc)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)




  dataset = Dataset(sc, sqlContext)
  dataset.compute_voxel_features()
  g = GraphFrame(dataset.nodes, dataset.edges)
  g.inDegrees.show()
  
  #read_features(dataset)

  sc.stop()

  # d = Dataset()
  # print volumes.take(1)
