#Path hack.
import sys; import os
sys.path.insert(0, os.path.abspath('..'))

from volume import *
from mysql import db


class task:
  def __init__(self, id):
      self.id = id
      self.local = True
      self.channel_id , self.segmentation_id = db.query("select channel_id, segmentation_id from tasks where id="+str(id))[0]
      
  def getSegmentation(self):    
      return volume(self.segmentation_id , isSegmentation = True)
      
  def getChannel(self):    
      return volume(self.channel_id, isSegmentation = False)

if __name__ == '__main__':
	
	task = task(914441)