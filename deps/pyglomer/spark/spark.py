# #Path hack.
# import sys; import os; sys.path.insert(0, os.path.abspath('../pyglomer/eyewire/'))
# from mysql import db

import findspark
findspark.init()

from pyspark import *
import h5py
import numpy as np
from itertools import product
from collections import namedtuple

from pyglomer.spark import features
from pyglomer.util import mesh
from pyglomer.spark.datasets import *
import networkx as nx

import pprint
pp = pprint.PrettyPrinter(indent=4)

from heapq import *

def import_hdf5( filename, chunk_size=10, overlap=1 ):

  SubVolume = namedtuple('SubVolume', ['filename', 'chunk', 'start', 'end' , 'overlap']) 
  subvolumes = []
  f = h5py.File(filename,'r')
  if 'main' not in f:
    raise ImportError("Main dataset doesn't exists")
  shape =  np.array(f['main'].shape)
  n_chunks =  np.maximum( np.ceil( shape / float(chunk_size)).astype(int) , np.array([1,1,1]))
  for chunk in product(*list(map(range,n_chunks))):

    start = np.maximum(np.array(chunk) * chunk_size, np.array([0,0,0]))
    end =  np.minimum((np.array(chunk) + 1)* chunk_size + overlap, shape)
    chunk_overlap = (end == shape) * overlap
    sv = SubVolume( filename, chunk , start, end , chunk_overlap )
    subvolumes.append(sv)
    
  f.close()
  return subvolumes

def get_subvolume( volume ):
  SubVolume = namedtuple('chunk', ['data', 'start', 'end' , 'overlap']) 
  f = h5py.File(volume.filename,'r')
  if 'main' not in f:
    raise ImportError("Main dataset doesn't exists")

  chunk_data = f['main'][volume.start[0]:volume.end[0], volume.start[1]:volume.end[1], volume.start[2]:volume.end[2]]
  return SubVolume(chunk_data, volume.start, volume.end, volume.overlap)

def compute_features(dataset):
  # import shutil
  # shutil.rmtree('./tmp/spark', ignore_errors=True)

  volumes = import_hdf5(dataset.files('machine_labels'))
  volumes = sc.parallelize(volumes)
  subvolumes = volumes.map(get_subvolume)
  subvolumes.persist()

  cr = features.ContactRegion()
  adjcency = subvolumes.flatMap(cr.map).reduceByKey(cr.reduce)
  adjcency.saveAsPickleFile(dataset.files('adjcency'))
  ss = features.SegmentSize()
  sizes = subvolumes.flatMap(ss.map).reduceByKey(ss.reduce)
  sizes.saveAsPickleFile(dataset.files('sizes'))

  m = features.Mesh()
  meshes = subvolumes.flatMap(m.map).reduceByKey(m.reduce)
  meshes.saveAsPickleFile(dataset.files('meshes'))
  return



def read_features( dataset ):

  adj = sc.pickleFile(dataset.files('adjcency'))
  sizes = sc.pickleFile(dataset.files('sizes'))
  nodes = adj.join(sizes)
 
  g = Graph(sc)
  
  for seg_1, neighbors in adj.toLocalIterator():
    for seg_2 , voxels in neighbors.iteritems():
      g.add_edge(seg_1, seg_2, weight= np.random.rand())

  task = g.merge_next_n(100)[0]
  for node in task.ids_neighbors + list(task.ids_to_merge):
    task.nodes[node] = nodes.lookup( node ) #remove this 0 after recomputing adj
  print task
 
if __name__ == '__main__':

  conf = SparkConf().setMaster("local[7]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "4g")
  conf.set("spark.executor.cores", 1)
  conf.set("spark.driver.memory",'5g')
  sc = SparkContext(conf=conf)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

  dataset = Dataset(sc)

  compute_features(dataset)
  # read_features(dataset)

  sc.stop()

  # d = Dataset()
  # print volumes.take(1)
