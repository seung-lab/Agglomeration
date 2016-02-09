class voxel_feature:

  def __init__( overlap = 0):
    self.needed_overlap = overlap
    return

  @abstractmethod
  def map(self):
    pass

  @abstractmethod
  def reduce(self):
    pass


class segment_size(voxel_feature):

  @static
  def map(vol):
    segment_size = defaultdict(int)
    for seg in vol.flatten():
      segment_size[seg] += 1

    return segment_size

  @static
  def reduce(*dicts):
    ret = defaultdict(int)
    for d in dicts:
        for k, v in d.items():
            ret[k] += v
    return dict(ret) 

class contact_region(voxel_feature):

  def __init__(self):
    super(contact_region, self).__init__(overlap=1)

  @static
  def map(vol):
    def get_adjacency_segments(vol):
    
      
    adjacency = defaultdict(lambda : defaultdict(list))
    def union_seg(id_1, id_2, voxel_position):
      if id_1 == 0 or id_2 == 0 or id_1 == id_2:
        return 

      adjacency[id_1][id_2].append(voxel_position)
      adjacency[id_2][id_1].append(voxel_position)
      return 


    for x, y, z in range(vol.shape[0]-1):
      for y in range(vol.shape[1]-1):
        for z in range(vol.shape[2]-1): 

          if vol[x,y,z] != vol[x+1,y,z]:
            union_seg(vol[x,y,z], vol[x+1,y,z], (x+0.5,y,z))

          if vol[x,y,z] != vol[x,y+1,z]:
            union_seg(vol[x,y,z], vol[x,y+1,z], (x,y+0.5,z))

          if vol[x,y,z] != vol[x,y,z+1]:
            union_seg(vol[x,y,z], vol[x,y,z+1], (x,y,z+0.5))

    return adjacency

  @static
  def reduce(*dicts):
    ret = defaultdict(int)
    for d in dicts:
        for k, v in d.items():
            ret[k] += v
    return dict(ret) 