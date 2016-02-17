from abc import ABCMeta, abstractmethod
from collections import *   
import operator
import numpy as np

from pyglomer.util import mesh

class VoxelFeature(object):

  @abstractmethod
  def map(self):
    pass

  @abstractmethod
  def reduce(self):
    pass

class SegmentSize(VoxelFeature):

  @staticmethod
  def map(vol):
    segment_size = defaultdict(int)

    end_without_overlap = vol.data.shape - vol.overlap
    data = vol.data[:end_without_overlap[0],
                    :end_without_overlap[1],
                    :end_without_overlap[2]]
    for seg in data.flatten():
      segment_size[(seg,)] += 1

    return segment_size.iteritems()

  @staticmethod
  def reduce(size_a, size_b):
    return size_a + size_b 

class ContactRegion(VoxelFeature):

  @staticmethod
  def map(vol):
    shape = vol.end - vol.start

    def union_seg(id_1, id_2, voxel_position):
      if id_1 == 0 or id_2 == 0 or id_1 == id_2:
        return 
      position = tuple(map(operator.add, voxel_position, vol.start))
      adjacency[(id_1,)][(id_2,)].append(position)
      adjacency[(id_2,)][(id_1,)].append(position)
      return 
      
    adjacency = defaultdict(lambda : defaultdict(list))
    for x in range(shape[0]):
      for y in range(shape[1]):
        for z in range(shape[2]): 

          if x + 1 < shape[0] and vol.data[x,y,z] != vol.data[x+1,y,z]:
            union_seg(vol.data[x,y,z], vol.data[x+1,y,z], (x+0.5,y,z))
          if y + 1 < shape[1] and vol.data[x,y,z] != vol.data[x,y+1,z]:
            union_seg(vol.data[x,y,z], vol.data[x,y+1,z], (x,y+0.5,z))
          if z + 1 < shape[2] and vol.data[x,y,z] != vol.data[x,y,z+1]:
            union_seg(vol.data[x,y,z], vol.data[x,y,z+1], (x,y,z+0.5))

    return adjacency.iteritems()

  @staticmethod
  def reduce(dict_1, dict_2):

    dict_1 = defaultdict(list, dict_1)
    for seg_id, voxels in dict_2.iteritems():
        dict_1[seg_id] += voxels
    return dict_1

class Mesh(VoxelFeature):

  @staticmethod
  def map(vol):

    meshes = dict()

    for seg_id in np.unique( vol.data ):
      if seg_id == 0:
        continue

      vertices, triangles = mesh.marche_cubes( seg_id , vol.data )
      if len(vertices) == 0:
        continue

      vertices += vol.start * 2.0 #translate mesh
      meshes[(seg_id,)] = mesh.get_adjacent( vertices, triangles )
    
    return meshes.iteritems()

  @staticmethod
  def reduce(adj_1, adj_2):

    return mesh.merge_adjacents(adj_1,adj_2)
    
