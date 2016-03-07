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

    end_without_overlap = vol.machine_labels.shape - vol.overlap
    data = vol.machine_labels[:end_without_overlap[0],
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

    def union_seg(id_1, id_2, voxel_position, axis):
      if id_1 == 0 or id_2 == 0 or id_1 == id_2:
        return 
      
      affinity = tuple( [axis] + list(np.floor(np.asarray(voxel_position)).astype(int))) 
      position = tuple(map(operator.add, voxel_position, vol.start))

      if id_1 > id_2:
        id_1 , id_2 = id_2, id_1

      id_1 = int(id_1); id_2 = int(id_2)
      adjacency[(id_1, id_2)].append( (position, vol.affinities[affinity] ) )
      return 
      
    adjacency = defaultdict(list)
    for x in range(shape[0]):
      for y in range(shape[1]):
        for z in range(shape[2]): 

          if x + 1 < shape[0] and vol.machine_labels[x,y,z] != vol.machine_labels[x+1,y,z]:
            union_seg(vol.machine_labels[x,y,z], vol.machine_labels[x+1,y,z], (x+0.5,y,z), 0)
          if y + 1 < shape[1] and vol.machine_labels[x,y,z] != vol.machine_labels[x,y+1,z]:
            union_seg(vol.machine_labels[x,y,z], vol.machine_labels[x,y+1,z], (x,y+0.5,z), 1)
          if z + 1 < shape[2] and vol.machine_labels[x,y,z] != vol.machine_labels[x,y,z+1]:
            union_seg(vol.machine_labels[x,y,z], vol.machine_labels[x,y,z+1], (x,y,z+0.5), 2)

    return adjacency.iteritems()

  @staticmethod
  def reduce(voxels_1, voxels_2):

    return voxels_1 + voxels_2

class Mesh(VoxelFeature):

  @staticmethod
  def map(vol):

    meshes = dict()

    for seg_id in np.unique( vol.machine_labels ):
      if seg_id == 0:
        continue

      vertices, triangles = mesh.marche_cubes( seg_id , vol.machine_labels )
      if len(vertices) == 0:
        continue

      vertices += vol.start * 2.0 #translate mesh
      meshes[(seg_id,)] = mesh.get_adjacent( vertices, triangles )
    
    return meshes.iteritems()

  @staticmethod
  def reduce(adj_1, adj_2):

    return mesh.merge_adjacents(adj_1,adj_2)
    
