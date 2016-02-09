from eyewire.mysql import db
from eyewire.volume import *

class Dataset:
  def __init__(self):
    pass
  
  @staticmethod 
  def get_most_traced_volumes(limit=50 ):
    query = """
            SELECT 
                segmentation_id
            FROM
                tasks
            JOIN volumes on tasks.segmentation_id = volumes.id
            WHERE volumes.dataset = 1
            GROUP BY segmentation_id
            ORDER BY count(tasks.id) DESC
            LIMIT {limit};
              """.format(limit=limit)

    volume_list = db.query ( query )
    volume_list = [x[0] for x in volume_list]

    return volume_list


  def find_examples_in_tasks(self, volume_id, tasks , adjacency, volume , segment_sizes):

    segment_meshes = {}
    dataset = {}

    def get_mesh( seg_id ):

      key =  ( volume_id, seg_id )
      if key not in segment_meshes:

        vertices, triangles = mesh.marche_cubes( seg_id , volume )
        adj =  mesh.get_adjacent( vertices, triangles )
        segment_meshes[key] = adj

      return segment_meshes[key]


    def add_example( id_1 , id_2 , positive ):

      seg_1 = max( id_1, id_2)
      seg_2 = min( id_1, id_2)
      
      key = ( volume_id, seg_1, seg_2 )

      if key in dataset:
        return

      adj_1 = get_mesh(seg_1)
      adj_2 = get_mesh(seg_2)

      disp_1, disp_2 = mesh.compute_feature(seg_1, seg_2, adj_1, adj_2, adjacency[seg_1][seg_2], volume)

      dataset[key] = ({ 'disp_1':disp_1, 
                        'disp_2':disp_2,
                        'size_1':segment_sizes[seg_1],
                        'size_2':segment_sizes[seg_2] , 
                        'merged':positive})

      return dataset

    
    for task_id , task_segments in tasks.iteritems():
      for seg_id in task_segments:

        for adjacent_seg_id in adjacency[seg_id]:

          if adjacent_seg_id in task_segments:
            add_example( seg_id , adjacent_seg_id, True )
          else:
            add_example( seg_id , adjacent_seg_id, False )
      
    return dataset

  def get_volumes(self, volume_id ):
    try:
      vol = volume(volume_id , True) 
      vol.getTile()
      segment_sizes = vol.get_segment_sizes()
      adjacency = vol.get_adjacency_segments()
      tasks = vol.get_tasks()
      examples = self.find_examples_in_tasks(volume_id, tasks , adjacency, vol.data , segment_sizes )
      return {'task': volume_id, 'volume' : vol.data, 'examples': examples}
    except Exception, e:
      print volume_id, e
      return {'task': volume_id , 'volume' : 'error'}

