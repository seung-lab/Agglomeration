import numpy as np

class Chunk(object):
  
  def __init__(self, stack, bounds):
    self.stack = stack
    self.max_bound = bounds['max']
    self.min_bound = bounds['min']

  @staticmethod
  def bound_to_array(bound):
    return  np.array( [bound['x'], bound['y'], bound['z']] )

  def merge_chunk(self, other ):
    min_coincidence = np.equal(self.min_bound , other.min_bound)
    max_coincidence = np.equal(self.max_bound , other.max_bound)
    if np.sum(min_coincidence) != 2:
      raise Exception('do not know how to merge {}-{} and {}-{}'.format(self.min_bound , other.min_bound, self.max_bound , other.max_bound))

    axis = np.where(min_coincidence == False)[0]
    if self.min_bound[axis] < other.min_bound[axis]:
      self.stack = np.concatenate((self.stack , other.stack) , axis=axis)
    else:
      self.stack = np.concatenate((other.stack , self.stack) , axis=axis)

    self.max_bound = np.maximum(self.max_bound, other.max_bound)
    self.min_bound = np.minimum(self.min_bound, other.min_bound)

    print '{}-{} , axis {}'.format(self.min_bound , other.min_bound , axis)

    return self

