from abc import ABCMeta, abstractmethod
from collections import *   
import operator
import numpy as np

from pyglomer.util import mesh
from pyglomer.eyewire import Tile
import pickle
import json

class VoxelFeature(object):

  @abstractmethod
  def map(self):
    pass

  @abstractmethod
  def reduce(self):
    pass

  @staticmethod
  def subtract_overlap(array, overlap):
    end_without_overlap = array.shape - overlap
    array_without_overlap = array[:end_without_overlap[0],
                                  :end_without_overlap[1],
                                  :end_without_overlap[2]]
    return array_without_overlap

class SegmentSize(VoxelFeature):

  @staticmethod
  def map(vol):
    data = SegmentSize.subtract_overlap(vol.machine_labels, vol.overlap)

    unique, counts = np.unique(data , return_counts=True)
    
    segment_sizes = dict(zip(unique, counts))

    return segment_sizes.iteritems()

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

      vertices += np.asarray(vol.start).astype(np.uint16) * 2 #translate mesh
      meshes[seg_id] = mesh.get_adjacent( vertices, triangles )
    
    return meshes.iteritems()

  @staticmethod
  def reduce(adj_1, adj_2):

    return mesh.merge_adjacents(adj_1,adj_2)

class PrepareForServe(VoxelFeature):

  @staticmethod 
  def get_meshes(vol):
    meshes = dict()
    for seg_id in np.unique( vol.machine_labels ):
      if seg_id == 0:
        continue

      vertices, triangles = mesh.marche_cubes( seg_id , vol.machine_labels )

      assert len(vertices) != 0

      vertices += np.asarray(vol.start).astype(np.uint16) * 2 #translate mesh

      #json requires all keys to be strings
      meshes[str(seg_id)] = mesh.export_mesh_as_threejs(vertices, triangles)
    return meshes


  @staticmethod 
  def get_base64(image_stack):

    stack = []
    for z in range(image_stack.shape[2]):
      tile = {'data': Tile.array_to_base64( image_stack[:,:,z]) }
      stack.append(tile)
    return stack



  @staticmethod
  def map(vol):
    channel = PrepareForServe.get_base64( 
      PrepareForServe.subtract_overlap(vol.channel, vol.overlap).transpose((2,1,0))
    )
    machine_labels = PrepareForServe.get_base64( 
      PrepareForServe.subtract_overlap(vol.machine_labels, vol.overlap).transpose((1,2,0))
    )
    meshes = PrepareForServe.get_meshes(vol)
    obj = {
        "channel": channel,
        "segmentation": machine_labels,
        "meshes": meshes
    }
    path = '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/chunks/{}-{}-{}.json'.format(*vol.chunk)
    with open(path, 'wb') as handle:
      json.dump(obj, handle)
    return vol.chunk, 0
