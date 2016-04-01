from pyspark import *
from pyglomer.spark.datasets import *
from pyglomer.spark.graph import *
from pyspark.sql import SQLContext, Row
from pyspark.sql.functions  import explode, array, count, struct, col, collect_set, collect_list, concat
from collections import defaultdict
from pyspark.sql.types import *
from graph import Graph

import pprint
pp = pprint.PrettyPrinter(indent=2, depth=5)

from heapq import *

decisions_since_last_agglomeration = 0

class SparkServer(object):
  def __init__(self):

    conf = SparkConf().setMaster("local[16]").setAppName("Agglomerator")
    conf.set("spark.executor.memory", "5g")
    conf.set("spark.executor.cores", 1)
    conf.set("spark.driver.memory","5g")

    self.sc = SparkContext(conf=conf)
    self.sqlContext = SQLContext(self.sc)

    log4j = self.sc._jvm.org.apache.log4j
    log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

    self.dataset = Dataset(self.sc,  self.sqlContext)
    self.graph = Graph(self.sc , self.sqlContext, self.dataset.vertices, self.dataset.edges)

    self.edges = []
    self.edge_index = 0

    for batch in range(20):
      print 'batch = ' + str(batch)
      self.graph.agglomerate()

  def get_edge(self):

    if len(self.edges) == self.edge_index:
      self.edges = self.graph.get_edges_for_humans()
      self.edge_index = 0
    else:
      self.edge_index += 1

    return self.edges[self.edge_index] 

  def set_human_decision(self, decision):

    global decisions_since_last_agglomeration
    print 'decision submited' , decision
    if decision['answer'] == 'y':
      new_weight = 1.0
    else:
      new_weight = 0.0

    self.graph.set_edge_weight(decision['edge'] , new_weight)

    decisions_since_last_agglomeration += 1

    if decisions_since_last_agglomeration > 20:
      decisions_since_last_agglomeration = 0
      self.graph.agglomerate()


if __name__ == '__main__':
  s = SparkServer()


