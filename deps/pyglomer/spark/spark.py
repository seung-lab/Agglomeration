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

def init():

  conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "5g")
  conf.set("spark.executor.cores", 1)
  conf.set("spark.driver.memory","5g")

  sc = SparkContext(conf=conf)
  sqlContext = SQLContext(sc)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

  dataset = Dataset(sc, sqlContext)

  # dataset.compute_voxel_features()
  # g = GraphFrame(dataset.nodes, dataset.edges)
  # g.vertices.write.parquet(dataset.files('vertices'))
  # g.edges.write.parquet(dataset.files('edges'))


  # Load the vertices and edges back.
  # sameV = sqlContext.read.parquet(dataset.files('vertices'))
  # sameE = sqlContext.read.parquet(dataset.files('edges'))
  # sameG = GraphFrame(sameV, sameE)


  # g.edges.registerTempTable('edges')
  # edges = sqlContext.sql("""select e.src, e.dst, e.mean_affinity 
  #                   from edges e
  #                   order by abs(0.5 - e.mean_affinity)""").collect()
 


  # nodes = set()
  # filtered_edges = []
  # for edge in edges:
  #   if tuple(edge.src) not in nodes and tuple(edge.dst) not in nodes:
  #     filtered_edges.append(edge)
  #     nodes.add(tuple(edge.src))
  #     nodes.add(tuple(edge.dst))
  #     print edges


  sc.stop()


init()
def get_edges():
  pass
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
