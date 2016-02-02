#Path hack.
import sys; import os; sys.path.insert(0, os.path.abspath('..'));
import inspect
filename = inspect.getframeinfo(inspect.currentframe()).filename
path = os.path.dirname(os.path.abspath(filename))  
  
import pickle
import numpy as np
import matplotlib.pyplot as plt

from mysql import db

class Player:
    
  def __init__(self, CUBES_TO_CONSIDER= 1e6):
    
    self.groups = {}
    self.CUBES_TO_CONSIDER=  CUBES_TO_CONSIDER
  
  def get_confusion_matrix(self, user_id ,finish_time, difficulty, val_type=None):

    if user_id == 1:

      return { 'tp':None, 'fp':None, 'fn':None, 'n_validations':0 }

    if val_type == 'SCYTHED':
      type_statement = 'AND validations.type = "SCYTHED"'
    else:
      val_type =  None
      type_statement = ''

    query = """SELECT 
                avg(fn) as fn,avg(tp) as tp, avg(fp) as fp , count(1) as n_validations
             FROM
                 validations
             left join tasks ON validations.task_id = tasks.id
             left join cells ON tasks.cell = cells.id
             WHERE
                 validations.user_id = {user_id} 
                 AND cells.difficulty = {difficulty}
                 AND validations.finish < '{finish_time}' 
                 AND validations.status = 0
                 {scythed}
            """. format(user_id=user_id, difficulty= difficulty,finish_time= finish_time, scythed=type_statement)
    
    r = db.first(query)
    
    return { 'tp': self._parse_decimal(r['tp']),
             'fp': self._parse_decimal(r['fp']),
             'fn': self._parse_decimal(r['fn']),
             'n_validations': r['n_validations']
           }

  def _parse_decimal(self, dec):

    if dec == None:
      return 0.0
    else:
      return float( dec )


  def get_average_confusion_matrix(self, difficulty, n_validations, val_type = None):

    if val_type != 'SCYTHED':
      val_type = None

    groups = self._get_groups(difficulty, val_type)

    closest_group = self._find_closest_group( groups ,n_validations )

    interval = self._interval_to_consider(  groups, closest_group )

    average = self._average_groups( groups, interval['left'], interval['right'] )

    return average

  def _find_closest_group(self, groups, n_validations):
  
    diff_vector = np.abs(  n_validations - groups[:]['n_validations'] )

    closest_group = np.argmin( diff_vector )
    
    return closest_group

  def _interval_to_consider(self, groups, closest_group ):
    """Known possible issue: it considers that every group( bucket ) 
       has the same amount of validations inside,
       if you really want and average of the zone it should 
       keep count on cubes_considered in left and right separetly"""
    
    left = closest_group
    right = closest_group

    cubes_considered = groups[ closest_group ]['group_size']

    while True:

      if cubes_considered > self.CUBES_TO_CONSIDER:
        break

      if right < len(groups) - 1 :
        right += 1
        cubes_considered += groups[right]['group_size']

      if left > 0:
        left -= 1
        cubes_considered += groups[left]['group_size']

      if left == 0 and right == len(groups) - 1:
        break
      
    

    return { 'left':left, 'right':right}

  def _average_groups(self, groups, left, right):
    
    tp, fp, fn = 0.0, 0.0, 0.0


    for i in range(left, right+1):
      tp += float( groups[i]['tp'] )
      fp += float( groups[i]['fp'] )
      fn += float( groups[i]['fn'] )

    interval = max( right-left, 1)
    tp = tp / interval;
    fp = fp / interval;
    fn = fn / interval;
    tn = 256**3 - (tp + fp + fn);

    return {
      'tp': tp,
      'fp': fp,
      'fn': fn,
      'tn': tn
    };


  def _get_groups(self, difficulty, val_type):

    if difficulty not in self.groups:

      self.groups[difficulty] = {}

    if val_type not in self.groups[difficulty]:

      try:
        
        self.groups[difficulty][val_type] = pickle.load( open( "{}/../tests/data/datasets/groups_{}_{}.p".format(path, difficulty, val_type) , "r" )  )
   
      except Exception:

        if val_type == 'SCYTHED':
          type_statement = 'AND validations.type = "SCYTHED"'
        else:
          type_statement = ''


        query = """SELECT 
            avg(tp) as tp,
            avg(fp) as fp,
            avg(fn) as fn,
            cubes as n_validations,
            sum(cubes) as group_size
        FROM
            (SELECT 
                avg(tp) as tp,
                    avg(fp) as fp,
                    avg(fn) as fn,
                    count(1) as cubes
            FROM
                validations
            INNER JOIN tasks ON (validations.task_id = tasks.id)
            INNER JOIN cells ON (tasks.cell = cells.id)
            WHERE validations.status = 0 
              AND cells.difficulty = {difficulty}
              {scythed} 
            GROUP BY validations.user_id
            ORDER BY cubes ASC) sub
        GROUP BY round(cubes, - 2)""". format(difficulty= difficulty, scythed=type_statement)
      
        self.groups[difficulty][val_type] = db.query(query)

        pickle.dump( self.groups[difficulty][val_type] , open( "{}/../tests/data/datasets/groups_{}_{}.p".format(path, difficulty, val_type) , "wb" ) )




    return self.groups[difficulty][val_type]

if __name__ == '__main__':
  from tqdm import *
 
  player = Player()

  # for difficulty in range(1,4):
  p_0 = []
  p_1 = []

  for n_validations in tqdm(range(0, 8000, 1)):
    avg = player.get_average_confusion_matrix(1, n_validations, 'SCYTHED' )

    p_0.append( avg['tn'] / ( avg['tn'] + avg['fp'] ) )
    p_1.append( avg['tp'] / ( avg['tp'] + avg['fn'] ) )

  # avg = np.asarray( avg )
  fig = plt.figure(num=None, figsize=(17, 10), facecolor='w', edgecolor='k')
  ax = fig.add_subplot(211)
  plt.grid(True)
  plt.hold(True)
  ax.set_title('P0->0')
  ax.set_ylim([0,1.1])
  ax.plot(p_0, alpha=1, color='r')
  
  ax = fig.add_subplot(212)
  plt.grid(True)
  plt.hold(True)
  ax.plot(p_1, alpha=1, color='r')
  ax.set_title('P1->1')
  ax.set_ylim([0,1.1])
  plt.show()