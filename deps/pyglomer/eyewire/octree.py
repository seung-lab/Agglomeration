import numpy as np

from volume import *

def to_octree( volume ):

  queue = [volume]
  octree = []
  while len(queue):
    octree += _to_octree( queue.pop(0) , queue )

  return octree


def _to_octree( volume, queue ):

  if volume.shape == (1,1,1):
    return volume

  octree = []
  for sub_idx in range(8):
    sub_slice = get_subvolume_slice(sub_idx, volume.shape)
    sub = volume[sub_slice]
    if more_than_one_id(sub):
      octree.append(-1)
      queue.append(sub)
    else:
      octree.append(sub[0,0,0])

  return octree

def get_subvolume_slice( subvolume_idx, shape ):

  # z = 0  z = 1
  #  0 1    4 5
  #  2 3    6 7

  if subvolume_idx == 0:
    return slice(0, shape[0]/2), slice(0,shape[1]/2), slice(0,shape[2]/2)
  if subvolume_idx == 1:
    return slice(shape[0]/2, shape[0]), slice(0,shape[1]/2), slice(0,shape[2]/2)
  if subvolume_idx == 2:
    return slice(0, shape[0]/2), slice(shape[1]/2,shape[1]), slice(0,shape[2]/2)
  if subvolume_idx == 3:
    return slice(shape[0]/2, shape[0]), slice(shape[1]/2,shape[1]), slice(0,shape[2]/2)
  if subvolume_idx == 4:
    return slice(0, shape[0]/2), slice(0,shape[1]/2), slice(shape[2]/2, shape[2])
  if subvolume_idx == 5:
    return slice(shape[0]/2, shape[0]), slice(0,shape[1]/2), slice(shape[2]/2, shape[2])
  if subvolume_idx == 6:
    return slice(0, shape[0]/2), slice(shape[1]/2,shape[1]), slice(shape[2]/2, shape[2])
  if subvolume_idx == 7:
    return slice(shape[0]/2, shape[0]), slice(shape[1]/2,shape[1]), slice(shape[2]/2, shape[2])


def more_than_one_id( volume ):

  return len(np.unique(volume)) > 1

def to_array( octree ):
  pass


if __name__ == '__main__':
  
  # vol = np.zeros((256,256,256)).astype(int)
  # vol[0,0,0] = 1

  vol = volume(116624 , True)
  vol.getTile()
  
  octree = to_octree( vol.data )
  print len(octree) * 2 / 1024**2
  octree = np.array(octree).astype(np.uint16)
  np.save('octree.npy', octree)