from pyspark import *
from pyglomer.spark.datasets import *
from pyglomer.spark.graph import *
from pyspark.sql import SQLContext
from graphframes import *
from pyspark.sql  import functions as f

import networkx as nx

import pprint
pp = pprint.PrettyPrinter(indent=2, depth=5)

from heapq import *

class SparkServer(object):
  def __init__(self):

    conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
    conf.set("spark.executor.memory", "5g")
    conf.set("spark.executor.cores", 1)
    conf.set("spark.driver.memory","5g")

    self.sc = SparkContext(conf=conf)
    self.sqlContext = SQLContext(self.sc)

    log4j = self.sc._jvm.org.apache.log4j
    log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

    self.dataset = Dataset(self.sc,  self.sqlContext)

    # self.dataset.compute_voxel_features()
    # g = GraphFrame(self.dataset.nodes, self.dataset.edges)
    # g.vertices.write.parquet(self.dataset.files('vertices'))
    # g.edges.write.parquet(self.dataset.files('edges'))


    # Load the vertices and edges back.
    sameV =  self.sqlContext.read.parquet(self.dataset.files('vertices'))
    sameE =  self.sqlContext.read.parquet(self.dataset.files('edges'))
    self.g = GraphFrame(sameV, sameE)


  def __del__(self):
    self.sc.stop()


  def get_edges(self):
      self.g.edges.registerTempTable('edges')
      self.g.vertices.registerTempTable('vertices')
      edges =  self.sqlContext.sql("""select e.src, e.dst, e.mean_affinity 
                        FROM edges as e
                        INNER JOIN vertices as v1 on e.src = v1.id
                        INNER JOIN vertices as v2 on e.dst = v2.id
                        WHERE v1.sizes > 20000
                        AND v2.sizes > 20000 
                        order by abs(0.5 - e.mean_affinity)""").collect()
     


      nodes = set()
      filtered_edges = []
      for edge in edges:
        if tuple(edge.src) not in nodes and tuple(edge.dst) not in nodes:
          filtered_edges.append(edge)
          nodes.add(tuple(edge.src))
          nodes.add(tuple(edge.dst))
          print edge
      return filtered_edges
  # sqlContext.sql("""select e.src, e.dst, e.mean_affinity 
  #                   from edges e
  #                   where not exists (select src from edges where src = e.dst)""").show()
 
  # edges = g.edges.groupBy('src').agg(
  # f.max( 
  #   f.struct(
  #     f.col("mean_affinity"),
  #     f.col("dst"))
  #   ).alias("max")
  # ).select( f.col('src'), f.col('max.dst') ,f.col('max.mean_affinity'))
  # edges.show()
  # #dropDuplicates('dst')


  # edges = edges.sort('mean_affinity' , ascending=False)

  # src_vertices = edges.select('src').rdd.collect()
  # print src_vertices
  # def filter_edges(edge):
  #   print edge.dst


  # edges = edges.rdd.filter(filter_edges).toDF()
  # edges.show()

  #read_features(dataset)


  # d = Dataset()
  # print volumes.take(1)
