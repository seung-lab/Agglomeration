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

    conf = SparkConf().setMaster("local[1]").setAppName("Agglomerator")
    conf.set("spark.executor.memory", "5g")
    conf.set("spark.executor.cores", 1)
    conf.set("spark.driver.memory","5g")

    self.sc = SparkContext(conf=conf)
    self.sqlContext = SQLContext(self.sc)

    log4j = self.sc._jvm.org.apache.log4j
    log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

    self.dataset = Dataset(self.sc,  self.sqlContext)
    self.graph = Graph(self.sc , self.sqlContext, self.dataset.vertices, self.dataset.edges)

    for batch in range(3):
      print 'batch = ' + str(batch)
      self.graph.info()
      self.graph.agglomerate()
    # self.graph.agglomerate()
    # self.graph.info()

  
    # Vertex DataFrame
    # v = self.sqlContext.createDataFrame([
    #   ("a", "Alice", 34),
    #   ("b", "Bob", 36),
    #   ("c", "Charlie", 30),
    #   ("d", "David", 29),
    #   ("e", "Esther", 32),
    #   ("f", "Fanny", 36),
    #   ("g", "Gabby", 60)
    # ], ["id", "name", "age"])
    # # Edge DataFrame
    # e = self.sqlContext.createDataFrame([
    #   ("a", "b", "friend"),
    #   ("a", "b", "friend"),
    #   ("b", "c", "follow"),
    #   ("c", "b", "follow"),
    #   ("f", "c", "follow"),
    #   ("e", "f", "follow"),
    #   ("e", "d", "friend"),
    #   ("d", "a", "friend"),
    #   ("a", "e", "friend")
    # ], ["src", "dst", "relationship"])
    # # Create a GraphFrame
    # g = GraphFrame(v, e)
    # g.edges.show()
if __name__ == '__main__':
  s = SparkServer()


