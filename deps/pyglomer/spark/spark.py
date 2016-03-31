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

class SparkServer(object):
  def __init__(self):

    conf = SparkConf().setMaster("local[4]").setAppName("Agglomerator")
    conf.set("spark.executor.memory", "5g")
    conf.set("spark.executor.cores", 1)
    conf.set("spark.driver.memory","5g")

    self.sc = SparkContext(conf=conf)
    self.sqlContext = SQLContext(self.sc)

    log4j = self.sc._jvm.org.apache.log4j
    log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

    self.dataset = Dataset(self.sc,  self.sqlContext)
    self.graph = Graph(self.sc , self.sqlContext, self.dataset.vertices, self.dataset.edges)

    for batch in range(1):
      print 'batch = ' + str(batch)
      self.graph.agglomerate()

  def get_edge(self):
    return self.graph.get_edge_for_humans();

  def get_human_decision(self, decision):

    print 'decision submited' , decision
    if decision['answer'] == 'y':
      new_weight = 1.0
    else:
      new_weight = 0.0

    self.graph.set_edge_weight(decision['edge'] , new_weight)
    self.graph.agglomerate()


if __name__ == '__main__':
  s = SparkServer()


