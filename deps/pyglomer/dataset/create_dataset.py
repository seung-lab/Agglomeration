import sys; import os
sys.path.insert(0, os.path.abspath('../eyewire'))

import mesh
from volume import *
from shove import Shove

from tqdm import *
import pickle


def _dump(object, filename):

  pickle.dump( object , open( "./{}.p".format(filename) , "wb" ) )

def _load(filename):

  try:
    
    return pickle.load( open( "./{}.p".format(filename) , "r" )  )

  except Exception, e:

    return None

def find_examples_in_tasks(volume_id, tasks , adjacency, volume , segment_meshes ,segment_sizes, dataset):

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

    disp_1, disp_2 = mesh.compute_feature(seg_1, seg_2, adj_1, adj_2, volume)

    dataset[key] = ({ 'disp_1':disp_1, 
                      'disp_2':disp_2,
                      'size_1':segment_sizes[seg_1],
                      'size_2':segment_sizes[seg_2] , 
                      'merged':positive})

    return

  
  for task_id , task_segments in tasks.iteritems():
    for seg_id in task_segments:

      for adjacent_seg_id in tqdm(adjacency[seg_id]):

        if adjacent_seg_id in task_segments:
          add_example( seg_id , adjacent_seg_id, True )
        else:
          add_example( seg_id , adjacent_seg_id, False )


def get_most_traced_volumes( limit=50 ):
  query = """
          SELECT 
              segmentation_id 
          FROM
              tasks
          GROUP BY  
            segmentation_id
          ORDER BY count(tasks.id) DESC
          LIMIT {limit};
            """.format(limit=limit)

  volume_list = db.query ( query )
  volume_list = [x[0] for x in volume_list]

  return volume_list

def main():
  # dataset = dict()
  dataset = Shove("lite://tmp/dataset","lite://:memory:")

  volumes =  get_most_traced_volumes()
  segment_meshes =  Shove("lite://tmp/segments","lite://:memory:")
  for volume_id in volumes:

    try:
      vol = volume(volume_id , True) 
      vol.getTile() 
      segment_sizes = vol.get_segment_sizes()
      adjacency = vol.get_adjacency_segments()
      tasks = vol.get_tasks()
      find_examples_in_tasks(volume_id, tasks , adjacency, vol.data , segment_meshes, segment_sizes ,dataset)
      dataset.sync()
      segment_meshes.sync()
    except Exception, e:
      print 'failed to prepare volume' , volume_id
      print e

    # print 'saving'
    # _dump(dataset, 'dataset')

if __name__ == '__main__':
  main()