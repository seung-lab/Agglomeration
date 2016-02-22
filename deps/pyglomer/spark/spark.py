# #Path hack.
# import sys; import os; sys.path.insert(0, os.path.abspath('../pyglomer/eyewire/'))
# from mysql import db

import findspark
findspark.init()

from pyspark import *

from pyglomer.spark.datasets import *
import networkx as nx

import pprint
pp = pprint.PrettyPrinter(indent=2, depth=5)

from heapq import *


def read_features( dataset ):

  nodes =  sc.pickleFile(dataset.files('nodes'))
  dataset.g.g = nx.read_gpickle(dataset.files('graph'))
  edges = sc.parallelize(dataset.g.g.edges())
  print edges.take(1)

  def remove_id(id1_edge_n1):
    id1 = id1_edge_n1[0]
    edge = id1_edge_n1[1][0]
    n1 = id1_edge_n1[1][1]
    return edge, n1 

  n1 = edges.map(lambda edge: (edge[0], edge) ).join(nodes).map(remove_id)
  n2 = edges.map(lambda edge: (edge[1], edge) ).join(nodes).map(remove_id)
  edges = n1.join(n2)
  edges.saveAsPickleFile('./pyglomer/spark/tmp/edges')

  first_edge = edges.take(1)
  print first_edge[0]
  print len(first_edge[1])
  # tasks = dataset.graph().merge_next_n(10)
  # print tasks
  # parsed_tasks = []
  # for task in tasks:
  #   for node in task.ids_neighbors + list(task.ids_to_merge):
  #     task.nodes[node] = nodes.lookup( node )
  #   parsed_tasks.append(task)

  # parsed_tasks = sc.parallelize(parsed_tasks)
  
  def do_somthing(task):
    print task.ids_to_merge

  # parsed_tasks.map(do_somthing)

if __name__ == '__main__':

  conf = SparkConf().setMaster("local[3]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "5g")
  conf.set("spark.executor.cores", 1)
  conf.set("spark.driver.memory",'4g')
  sc = SparkContext(conf=conf)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

  dataset = Dataset(sc)
  # dataset.compute_voxel_features()
  read_features(dataset)

  sc.stop()

  # d = Dataset()
  # print volumes.take(1)
