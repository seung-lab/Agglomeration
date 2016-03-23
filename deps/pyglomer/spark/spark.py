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

    conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
    conf.set("spark.executor.memory", "5g")
    conf.set("spark.executor.cores", 1)
    conf.set("spark.driver.memory","5g")

    self.sc = SparkContext(conf=conf)
    self.sqlContext = SQLContext(self.sc)

    log4j = self.sc._jvm.org.apache.log4j
    log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

    self.dataset = Dataset(self.sc,  self.sqlContext)
    

  def get_next_edges_to_merge_unfiltered(self):
    """ Return the edges we are most CERTAIN about merging,
        This is used by greedy agglomeration"""

    edges =  self.sqlContext.sql("""select e.src, e.dst, e.mean_affinity
                      FROM edges as e
                      INNER JOIN vertices as v1 on e.src = v1.id
                      INNER JOIN vertices as v2 on e.dst = v2.id
                      WHERE (v1.size > 100000 and v2.size > 10000)
                      OR (v1.size > 10000 and v2.size > 100000)
                      order by e.mean_affinity DESC""").collect()

    return edges

  def get_next_edges_to_ask(self):
    """ Return the edges we are most UNCERTAIN about merging,
        This edges are sent to proofreaders."""

    edges =  self.sqlContext.sql("""select e.src, e.dst, e.mean_affinity
                      FROM edges as e
                      INNER JOIN vertices as v1 on e.src = v1.id
                      INNER JOIN vertices as v2 on e.dst = v2.id
                      WHERE (v1.size > 100000 and v2.size > 10000)
                      OR (v1.size > 10000 and v2.size > 100000)
                      order by abs(0.5 - e.mean_affinity)""").collect()
    return edges


  def get_neighbours_for_merges(self, merges):
    """ It does return a dictionary where the keys corresponds to the ids of the new node,
        represented as a tuple of keys.
        When using that key, it will return a second dictionary with all the neighbours of
        the new node.
        When using both keys ( the new node, and the neighboors) it will return a set with
        the ids of the parents who has and edge with the neighboor.
        TODO: improve this data structure
    """

    neighbours = defaultdict(lambda : defaultdict(list))
    def parse_n(r):
      m_src = tuple(r.m_src)
      m_dst = tuple(r.m_dst)
      new_node = m_src + m_dst #cocatenate tuple

      #neighbour
      e_dst = tuple(r.e_dst)
      e_src = tuple(r.e_src)

      if m_src == e_src and m_dst != e_dst:
        neighbours[new_node][e_dst].append(m_src)

      elif m_dst == e_dst and m_src != e_src:
        neighbours[new_node][e_src].append(m_dst)

    schema = StructType([StructField('src',ArrayType(LongType())),StructField('dst',ArrayType(LongType()))])
    self.sqlContext.createDataFrame(merges,schema).registerTempTable('merges')
    n = self.sqlContext.sql("""SELECT m.src as m_src, m.dst as m_dst, e.src as e_src , e.dst as e_dst
                                 FROM merges as m 
                                 INNER JOIN edges as e on m.src = e.src
                                  """).collect()
    map(parse_n, n)
    n = self.sqlContext.sql("""SELECT m.src as m_src, m.dst as m_dst, e.src as e_src , e.dst as e_dst
                               FROM merges as m 
                               INNER JOIN edges as e on m.src = e.dst
                                  """).collect()
    map(parse_n, n)
    n = self.sqlContext.sql("""SELECT m.src as m_src, m.dst as m_dst, e.src as e_src , e.dst as e_dst
                                 FROM merges as m 
                                 INNER JOIN edges as e on m.dst = e.src
                                  """).collect()
    map(parse_n, n)
    n = self.sqlContext.sql("""SELECT m.src as m_src, m.dst as m_dst, e.src as e_src , e.dst as e_dst
                                 FROM merges as m 
                                 INNER JOIN edges as e on m.dst = e.dst
                                  """).collect()
    map(parse_n, n)

    return neighbours

  def filter_edges_no_duplicate_nodes(self, edges):
    """ Filter edges,keep the order of the input list, such that,
        A node does not appear it more that on edge,
        this is important to keep merging procedures completly independent.
        Another necesary thing would be to filter such that neighbours nodes to a merging node
        are not duplicate neither, that filtering is done afterwards"""

    nodes = set()
    filtered_edges = []
    for edge in edges:
      src = tuple(edge.src)
      dst = tuple(edge.dst)

      if src not in nodes and dst not in nodes: 
        filtered_edges.append( Row(src=src, dst=dst) ) #concatenate tuples
        nodes.add(src)
        nodes.add(dst)

    return filtered_edges

  def filter_edges_no_duplicate_neighbours(self, edges, neighbours_for_edges):

    visited_neighbours = set()
    def are_there_duplicates_neighbours(new_node):
      for n in neighbours_for_edges:
        if n in visited_neighbours:
          return False
        else:
          visited_neighbours.add(n)
      return True

    filtered_edges = []
    for e in edges:
      src = tuple(e.src)
      dst = tuple(e.dst)
      new_node = src + dst #cocatenate tuple

      if are_there_duplicates_neighbours(neighbours_for_edges[new_node]):
        filtered_edges.append(  Row(src=src, dst=dst) )

    return filtered_edges

  def get_next_edges_to_merge(self):
    merges = self.get_next_edges_to_merge_unfiltered()
    merges = self.filter_edges_no_duplicate_nodes(merges)
    neighbours_for_merges = self.get_neighbours_for_merges(merges)
    self.get_neighbours_edges_to_be_merged(neighbours_for_merges)

    # merges = self.filter_edges_no_duplicate_neighbours(merges, neighbours_for_merges) #TODO this shoudln't be necessary
    return merges

  def get_node_pairs_to_be_merge(self, merges):
    schema = StructType([StructField('src',ArrayType(LongType())),StructField('dst',ArrayType(LongType()))])
    self.sqlContext.createDataFrame(merges,schema).registerTempTable('merges')

    node_pairs = self.sqlContext.sql("""SELECT v1.id as v1_id, v1.size as v1_size,
                            v2.id as v2_id, v2.size as v2_size
                            FROM merges as m
                            INNER JOIN vertices as v1 on m.src = v1.id
                            INNER JOIN vertices as v2 on m.dst = v2.id""")
    return node_pairs

  def get_neighbours_edges_to_be_merged(self, neighbours_for_edges):

    neighbours = defaultdict(list)
    for new_node in neighbours_for_edges:
      for neighbor in neighbours_for_edges[new_node]:
        parents = neighbours_for_edges[new_node][neighbor]
        neighbours[neighbor] =  neighbours[neighbor] + parents #concatenate lists

    edges_to_merge = []
    for neighbor in neighbours:
      if len(neighbours[neighbor]) > 1:
        for second_neighbor in neighbours[neighbor]:
          edges_to_merge.append( Row( src=neighbor , dst=second_neighbor) )

    print edges_to_merge
    
    schema = StructType([StructField('src',ArrayType(LongType())),StructField('dst',ArrayType(LongType()))])
    self.sqlContext.createDataFrame(edges_to_merge,schema).registerTempTable('edges_to_merge')
    self.sqlContext.sql("""select em.src, em.dst,
                                  greatest(e1.src,e2.src) as e_src, 
                                  greatest(e1.dst,e2.dst) as e_dst, 
                                  greatest(e1.mean_affinity, e2.mean_affinity) as e_mean_affinity
                           from edges_to_merge as em
                           LEFT JOIN edges as e1 on em.src = e1.src AND em.dst = e1.dst
                           LEFT JOIN edges as e2 on em.src = e2.dst AND em.dst = e2.src
                           order by em.src, em.dst""").show(n=1000)


if __name__ == '__main__':
  s = SparkServer()
  merges = s.get_next_edges_to_merge()
  vertex_pairs = s.get_node_pairs_to_be_merge(merges)

  def merge_vertices(r):
    new_ids = r.v1_id + r.v2_id
    new_size = r.v1_size + r.v2_size
    return Row(id=new_ids, size=new_size)

  new_vertex = vertex_pairs.map(merge_vertices).toDF()
  s.dataset.g.vertices.unionAll( new_vertex )
  s.dataset.g.vertices.orderBy('size',ascending=False).show()

  # s.get_edges()
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
