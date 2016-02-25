from pyglomer.spark.graph import *
from pyglomer.spark import features

import h5py
import numpy as np
from itertools import product
from collections import namedtuple

class Dataset:

  def __init__(self, sc):
    """
      SparkContext is required to return rdds
    """
    self.sc = sc
    self.g = Graph(sc)
    pass

  def graph(self):
    return self.g


  def _import_hdf5(self, chunk_size=50, overlap=1 ):

    ImportTask = namedtuple('ImportTask', ['chunk_pos', 'start', 'end' , 'overlap' , 'files']) 
    importTasks = []

    f = h5py.File(self.files('machine_labels'),'r')
    if 'main' not in f: raise ImportError("Main dataset doesn't exists")

    shape =  np.array(f['main'].shape)
    n_chunks = np.ceil( shape / float(chunk_size)).astype(int)
    n_chunks = np.maximum( n_chunks , np.array([1,1,1]))

    for chunk in product(*list(map(range,n_chunks))):

      start = np.maximum(np.array(chunk) * chunk_size, np.array([0,0,0]))
      end =  np.minimum((np.array(chunk) + 1)* chunk_size + overlap, shape)
      chunk_overlap = (end == shape) * overlap

      files = { 'machine_labels': self.files('machine_labels'),
                'human_labels': self.files('human_labels'),
                'affinities': self.files('affinities')}
      it = ImportTask( chunk , start, end , chunk_overlap , files)
      importTasks.append(it)
      
    f.close()
    return importTasks

  @staticmethod
  def _get_subvolume( it ):
    SubVolume = namedtuple('SubVolume', ['machine_labels','human_labels','affinities', 'start', 'end' , 'overlap']) 

    data = {}
    for h5file in ['machine_labels', 'human_labels' , 'affinities']:
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

    sv = SubVolume(data['machine_labels'],
                   data['human_labels'],
                   data['affinities'],
                   it.start,
                   it.end,
                   it.overlap)
    return sv

  def _get_subvolumes(self):
    
    volumes = self._import_hdf5()
    volumes = self.sc.parallelize(volumes)
    subvolumes = volumes.map(self._get_subvolume)
    return subvolumes

  def compute_voxel_features(self):

    subvolumes = self._get_subvolumes()
    cr = features.ContactRegion()
    adjcency = subvolumes.flatMap(cr.map).reduceByKey(cr.reduce)
    for seg_1, neighbors in adjcency.toLocalIterator():
      for seg_2 , voxels in neighbors.iteritems():
        self.g.add_edge(seg_1, seg_2, weight= np.random.rand())

    # ss = features.SegmentSize()
    # sizes = subvolumes.flatMap(ss.map).reduceByKey(ss.reduce)
    # nodes = adjcency.join(sizes)

    # m = features.Mesh()
    # meshes = subvolumes.flatMap(m.map).reduceByKey(m.reduce)
    # nodes = adjcency.join(meshes)

    # nodes.saveAsPickleFile(self.files('nodes'))
    nx.write_gpickle(self.g.g , self.files('graph'))
    return


  def files(self, file):
    production = False

    if production:
  
      files = {
        'machine_labels': 's3://agglomeration/snemi3d_ds_test/machine_labels.h5',
        'human_labels': 's3://agglomeration/snemi3d_ds_test/human_labels.h5',
        'affinities': 's3://agglomeration/snemi3d_ds_test/ffinities.h5',
        'adjcency':'s3://agglomeration/snemi3d_ds_test/adjcency',
        'sizes': 's3://agglomeration/snemi3d_ds_test/sizes',
        'meshes':'s3://agglomeration/snemi3d_ds_test/meshes',
        'nodes': 's3://agglomeration/snemi3d_ds_test/nodes',
        'graph': 's3://agglomeration/snemi3d_ds_test/graph'
      }

    else:

      files = {
        'machine_labels': '/usr/people/it2/code/Agglomerator/deps/datasets/SNEMI3D/ds_test/machine_labels.h5',
        'human_labels': '/usr/people/it2/code/Agglomerator/deps/datasets/SNEMI3D/ds_test/human_labels.h5',
        'affinities': '/usr/people/it2/code/Agglomerator/deps/datasets/SNEMI3D/ds_test/affinities.h5',
        'adjcency':'./pyglomer/spark/tmp/adjcency',
        'sizes': './pyglomer/spark/tmp/sizes',
        'meshes':'./pyglomer/spark/tmp/meshes',
        'nodes': './pyglomer/spark/tmp/nodes',
        'graph': './pyglomer/spark/tmp/graph'
      }
  
    return files[file]