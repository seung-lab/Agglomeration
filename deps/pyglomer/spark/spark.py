# #Path hack.
# import sys; import os; sys.path.insert(0, os.path.abspath('../pyglomer/eyewire/'))
# from mysql import db

import findspark
findspark.init()

from pyspark import *

from pyglomer.spark.datasets import *
import networkx as nx

import pprint
pp = pprint.PrettyPrinter(indent=4, depth=2)

from heapq import *


def read_features( dataset ):

  nodes =  sc.pickleFile(dataset.files('nodes'))
  tasks = dataset.graph().merge_next_n(10)
  parsed_tasks = []
  for task in tasks:
    for node in task.ids_neighbors + list(task.ids_to_merge):
      task.nodes[node] = nodes.lookup( node ) #remove this 0 after recomputing adj
    parsed_tasks.append(task)

  parsed_tasks = sc.parallelize(parsed_tasks)
  
  def do_somthing(task):
    print task.ids_to_merge

  parsed_tasks.map(do_somthing)

if __name__ == '__main__':

  conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "4g")
  conf.set("spark.executor.cores", 1)
  conf.set("spark.driver.memory",'5g')
  sc = SparkContext(conf=conf)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

  dataset = Dataset(sc)
  dataset.compute_voxel_features()
  
  # read_features##(dataset)

  sc.stop()

  # d = Dataset()
  # print volumes.take(1)
