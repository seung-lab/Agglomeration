from pyglomer.spark import features
from pyspark.sql import Row

import h5py
import numpy as np
from itertools import product
from collections import namedtuple
from pyspark.sql.types import *
import os

class Dataset(object):

  def __init__(self, sc, sqlContext):
    """
      SparkContext is required to return rdds
    """
    self.sc = sc
    self.sqlContext = sqlContext
    self.vertices =  None
    self.chunks = None
    self._get_subvolumes()

    if not os.path.isdir(self.files('vertices')) or not os.path.isdir(self.files('edges')):
      self.compute_voxel_features()
      self.vertices.write.parquet(self.files('vertices'))
      self.edges.write.parquet(self.files('edges'))
    else:
      # Load the vertices and edges back.
      self.vertices =  self.sqlContext.read.parquet(self.files('vertices'))
      self.edges =  self.sqlContext.read.parquet(self.files('edges'))

  def _import_hdf5(self, chunk_size=128, overlap=1 ):

    ImportTask = namedtuple('ImportTask', ['chunk_pos', 'start', 'end' , 'overlap' , 'files']) 
    importTasks = []

    f = h5py.File(self.files('machine_labels'),'r')
    if 'main' not in f: raise ImportError("Main dataset doesn't exists")

    shape =  np.array(f['main'].shape)
    n_chunks = np.ceil( shape / float(chunk_size)).astype(int)
    n_chunks = np.maximum( n_chunks , np.array([1,1,1]))
    n_chunks = np.minimum( n_chunks, np.array([1,4,4]))

    for chunk in product(*list(map(range,n_chunks))):

      start = np.maximum(np.array(chunk) * chunk_size, np.array([0,0,0]))
      end =  np.minimum((np.array(chunk) + 1)* chunk_size + overlap, shape)
      chunk_overlap = (end == shape) * overlap

      files = { 'channel': self.files('channel'),
                'machine_labels': self.files('machine_labels'),
                'human_labels': self.files('human_labels'),
                'affinities': self.files('affinities')}
      it = ImportTask( chunk , start, end , chunk_overlap , files)
      importTasks.append(it)
      
    f.close()
    return importTasks

  @staticmethod
  def _get_subvolume( it ):
    SubVolume = namedtuple('SubVolume', ['chunk','channel', 'machine_labels','human_labels','affinities', 'start', 'end' , 'overlap']) 

    data = {}
    for h5file in ['channel','machine_labels', 'human_labels' , 'affinities']:
      f = h5py.File(it.files[h5file],'r')
      if 'main' not in f:
        raise ImportError("Main dataset doesn't exists")

      if h5file == 'affinities':
        chunk_data = f['main'][:,
                               it.start[0]:it.end[0],
                               it.start[1]:it.end[1],
                               it.start[2]:it.end[2]]
      else:
        chunk_data = f['main'][it.start[0]:it.end[0],
                               it.start[1]:it.end[1],
                               it.start[2]:it.end[2]]

      data[h5file] = chunk_data

    sv = SubVolume(it.chunk_pos,
                   data['channel'],
                   data['machine_labels'],
                   data['human_labels'],
                   data['affinities'],
                   it.start,
                   it.end,
                   it.overlap)
    return sv

  def _get_subvolumes(self):
    
    volumes = self._import_hdf5()
    volumes = self.sc.parallelize(volumes)
    self.subvolumes = volumes.map(self._get_subvolume)
    self.chunks = self.subvolumes.map(lambda subvolume: (subvolume.chunk, (subvolume.channel, subvolume.machine_labels))).cache()


  def compute_voxel_features(self):
    
    def to_row( data ):
      return map(int,data)

    cr = features.ContactRegion()
    adjcency = self.subvolumes.flatMap(cr.map).reduceByKey(cr.reduce)
    edges = []
    for edge, voxels in adjcency.toLocalIterator():
        mean = float( np.mean([pair[1] for pair in voxels]) )

        #The src should always be an smaller id that the dst
        if edge[0] > edge[1]:
          edge[0] , edge[1] = edge[1] , edge[0]
        edges.append( edge + (mean,) )


    self.edges = self.sqlContext.createDataFrame(edges, ['src','dst','weight'])
    ss = features.SegmentSize()
    sizes = self.subvolumes.flatMap(ss.map).reduceByKey(ss.reduce).map(to_row).toDF(['id','size'])
    self.vertices = sizes


    # m = features.Mesh()
    # meshes = self.subvolumes.flatMap(m.map).reduceByKey(m.reduce).map(to_row).toDF(['id','meshes'])
    # vertices = sizes.join(meshes, 'id')
    # self.vertices = vertices

    # vertices.saveAsTable( tableName='vertices', mode='overwrite', path=self.files('vertices') )
    #nx.write_gpickle(self.g.g , self.files('graph'))
    return


  def files(self, file):
    production = False

    if production:
  
      files = {
        'machine_labels': 's3://agglomeration/snemi3d_ds_test/machine_labels.h5',
        'human_labels': 's3://agglomeration/snemi3d_ds_test/human_labels.h5',
        'affinities': 's3://agglomeration/snemi3d_ds_test/affinities.h5',
        'adjcency':'s3://agglomeration/snemi3d_ds_test/adjcency',
        'sizes': 's3://agglomeration/snemi3d_ds_test/sizes',
        'meshes':'s3://agglomeration/snemi3d_ds_test/meshes',
        'vertices': 's3://agglomeration/snemi3d_ds_test/vertices',
        'graph': 's3://agglomeration/snemi3d_ds_test/graph'
      }

    else:

      files = {
        'channel': '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/channel.h5',
        'machine_labels': '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/machine_labels.h5',
        'human_labels': '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/machine_labels.h5',
        'affinities': '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/affinities.h5',
        'vertices': './pyglomer/spark/tmp/vertices',
        'edges': './pyglomer/spark/tmp/edges'
      }
  
    return files[file]