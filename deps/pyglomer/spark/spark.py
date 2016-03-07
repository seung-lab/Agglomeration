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



def read_features( dataset ):

  nodes =  sc.pickleFile(dataset.files('nodes'))
  dataset.g.g = nx.read_gpickle(dataset.files('graph'))
  
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

  g.edges.registerTempTable('edges')

  g.edges.show()
  sqlContext.sql("""select e.src, e.dst, e.mean_affinity 
                    from edges e
                    where not exists (select src from edges where src = e.dst)""").show()
 
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

  sc.stop()

  # d = Dataset()
  # print volumes.take(1)
