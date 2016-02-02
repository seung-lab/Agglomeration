import numpy as np
import os.path
import json

import matplotlib.pyplot as plt
import matplotlib.cm as cm

from construct import *
import requests
import base64
import png
from io import BytesIO
import itertools
import Image


#Path hack.
import sys; import os
sys.path.insert(0, os.path.abspath('..'))

from mysql import db
print db

class volume:

  def __init__(self, id , isSegmentation = None):

    self.id = id
    self.local = False
    self.data = None
    self.path = None
    self.isSegmentation = isSegmentation
    
  def getProjectPath(self):

    if self.path == None:

      fullPath = db.query("SELECT path FROM volumes WHERE id = "+str(self.id))[0][0]
      relativePath = os.path.relpath(fullPath, '/usr/local/omni/data/omelette2')
      home = os.path.expanduser("~")
      mountPoint = '/seung/EyeWire/'
      self.path = os.path.join(home + mountPoint +  relativePath)
    
    return self.path

  def getSegmentSize(self, segId):
    segId = int(segId)
    
    if self.local and False: #Get segments local sometimes return the wrong results
    
      return self.getSegmentLocal(segId)

    else:
      
      return self.getSegmentAPI(segId)
             
  def getSegmentLocal(self, segId):
                  
    metadataPath = '/segmentations/segmentation1/segments/segment_page0.data.ver4'
    builtPath = os.path.join(self.getProjectPath() + metadataPath)

    f = open(builtPath, 'rU')
    f.seek(48 *(segId))
    fbuffer = f.read(48)

    struct = Struct("OmSegmentDataV4",
           ULInt32("OmSegID"),     
           Padding(4),             
           ULInt64("size"),   
           Padding(32))
    
    if segId != int(struct.parse(fbuffer)['OmSegID']):
        raise Exception(str(segId) + ' is different from ' + str(int(struct.parse(fbuffer)['OmSegID'])))
        
    return int(struct.parse(fbuffer)['size'])    
      
  def getSegmentAPI(self,segId):
    
    try:
        r = requests.get('http://data.eyewire.org/volume/'+str(self.id)+'/segment/' + str(segId))
        return float(json.loads(r.text)[str(segId)]['size'])
    except:
        return 0.0
      
  def getSegmentsSize(self, segmentsIds):
      
    acumSize=0
    for segId in segmentsIds:
        acumSize = acumSize + self.getSegmentSize(segId)
    
    return acumSize
                  
  def getSubTile(self,x,y,z):

    url = 'http://cache.eyewire.org/volume/' + str(self.id) + '/chunk/0/' + str(x) + '/' + str(y) + '/' + str(z) + '/tile/xy/0:128'

    r = requests.get(url)
    stack = None
    for tile in r.json():
        mine,encoded =  tile['data'].split(',') #if it is segmentation
        decoded = base64.decodestring(encoded)

        if mine == 'data:image/png;base64':
            pngReader = png.Reader(bytes=decoded)
            row_count, column_count, pngdata, meta = pngReader.asDirect()
            bitdepth=meta['bitdepth']
            plane_count=meta['planes']

            image_2d = np.vstack(itertools.imap(np.uint8, pngdata)) 
            image_3d = np.reshape(image_2d,(row_count,column_count,plane_count))
            img = image_3d.view(np.uint16)
            
            if stack == None:
                stack = img[:,:,0]
            else:
                stack = np.dstack((stack,img[:,:,0]))
            
            #Record that this volumes is a segmentation volume    
            self.isSegmentation = True

        elif mine == 'data:image/jpeg;base64':
            #image = Image.open(decoded)
            #image.save('test.jpg', image.format, quality = 100)
            im = Image.open(BytesIO(decoded))
            
            if stack == None:
                stack = np.array(im)
            else:
                stack = np.dstack((stack,np.array(im)))
                
            #Record that this volumes is a channel volume    
            self.isSegmentation = False 

        else:
            raise Exception("Unkown format :"+mine)
    
    return stack
  
  def getTileAPI(self):
      
    x0y0z0 = self.getSubTile(0,0,0)
    x0y1z0 = self.getSubTile(0,1,0)                
    x1y0z0 = self.getSubTile(1,0,0)
    x1y1z0 = self.getSubTile(1,1,0)
    
    y0z0 = np.append(x0y0z0 ,x1y0z0 , axis=1)
    y1z0 = np.append(x0y1z0, x1y1z0 , axis=1)
    
    z0 = np.append(y0z0,y1z0, axis = 0)
    
    x0y0z1 = self.getSubTile(0,0,1)
    x0y1z1 = self.getSubTile(0,1,1)                
    x1y0z1 = self.getSubTile(1,0,1)
    x1y1z1 = self.getSubTile(1,1,1)
    
    y0z1 = np.append(x0y0z1 ,x1y0z1 , axis=1)
    y1z1 = np.append(x0y1z1 ,x1y1z1 , axis=1)
    
    z1 = np.append(y0z1,y1z1, axis = 0)
          
    self.data = np.append( z0, z1 , axis=2)
    
    return self.data
  
  def getTileLocal(self):

    if self.isSegmentation == None:
        raise Exception('We should know which type of volume we are dealing with')
    elif self.isSegmentation == True:
        filepath = '/segmentations/segmentation1/0/volume.uint32_t.raw'
        builtPath = os.path.join( self.getProjectPath() + filepath)
        fileArray = np.fromfile(builtPath , dtype=np.uint32)
    else:
        filepath = '/channels/channel1/0/volume.float.raw'
        builtPath = os.path.join( self.getProjectPath() + filepath)
        fileArray = np.fromfile(builtPath , dtype=np.float32)
 
    fileArray = np.split(fileArray,8)
    
    x0y0z0 = fileArray[0].reshape((128, 128, 128) , order='C') 
    x0y1z0 = fileArray[4].reshape((128, 128, 128) , order='C')
    x1y0z0 = fileArray[2].reshape((128, 128, 128) , order='C') 
    x1y1z0 = fileArray[6].reshape((128, 128, 128) , order='C')
    
    y0z0 = np.append(x0y0z0 ,x1y0z0 , axis=1)
    y1z0 = np.append(x0y1z0, x1y1z0 , axis=1)
    
    z0 = np.append(y0z0,y1z0, axis = 0)
    
    x0y0z1 = fileArray[1].reshape((128, 128, 128) , order='C') 
    x0y1z1 = fileArray[5].reshape((128, 128, 128) , order='C')               
    x1y0z1 = fileArray[3].reshape((128, 128, 128) , order='C') 
    x1y1z1 = fileArray[7].reshape((128, 128, 128) , order='C') 
        
    y0z1 = np.append(x0y0z1 ,x1y0z1 , axis=1)
    y1z1 = np.append(x0y1z1 ,x1y1z1 , axis=1)
        
    z1 = np.append(y0z1,y1z1, axis = 0)
              
    data = np.append( z0, z1 , axis=2)
      
    data = np.swapaxes( data , 0 ,2)
    self.data = np.swapaxes( data , 0 ,1)
    
    return self.data
           
  def getTile(self):
    
    tmp_filename = '/tmp/volume_'+str(self.id)

    if os.path.isfile(tmp_filename + '.npy'):
      self.data = np.load(tmp_filename+ '.npy')
      print 'from disk'
      return

    if self.local:
        self.getTileLocal()
    else:
        self.getTileAPI()

    np.save(tmp_filename, self.data)
    
    return self
  
  def plotTile(self,z, plane='xy'):
      
    if self.data == None:
      self.getTile()
    
    if plane == 'xy':
        sliced = self.data[:,:,z]
    elif plane == 'yz':
        sliced = self.data[z,:,:]
    elif plane == 'xz':
        sliced = self.data[:,z,:]
    else:
        raise Exception("Unkown plane:"+plane +"  options are, xy , yz, xz")
    
    fig = plt.figure()
    if self.isSegmentation:
      im = plt.imshow(sliced) #Needs to be in row,col order
    else:
      im = plt.imshow(sliced, cmap = cm.Greys_r) #Needs to be in row,col order
    

    #using dict arg to modify non local variable inside closure
    #http://stackoverflow.com/questions/3190706/nonlocal-keyword-in-python-2-x
    arg = {'z':z}
    def onscroll(event):
      z = arg['z'] #hack

      if event.button == "up":
        z += 1
      else:
        z -= 1

      if z < 0 or z > 255:
        return

      im.set_data(self.data[:,:,z])
      plt.draw()
      arg['z'] = z #hack

    meshes = []
    def onclick(event):
      seg_id = self.data[ int(event.ydata), int(event.xdata) ,arg['z']]
      print 'id' , seg_id
      
    cid = fig.canvas.mpl_connect('scroll_event', onscroll)
    cid = fig.canvas.mpl_connect('button_press_event', onclick)

    plt.show()

  def get_adjacency_segments(self):
    
    if self.data == None:
      self.getTile()
    vol = self.data
      
    adjacency = dict()

    def union_seg(id_1, id_2):
      if id_1 == 0 or id_2 == 0 or id_1 == id_2:
        return 

      if id_1 not in adjacency:
        adjacency[id_1] = set()

      if id_2 not in adjacency:
        adjacency[id_2] = set()

      adjacency[id_1].add(id_2)
      adjacency[id_2].add(id_1)


    for x in range(vol.shape[0]-1):
      for y in range(vol.shape[1]-1):
        for z in range(vol.shape[2]-1): 

          if vol[x,y,z] != vol[x+1,y,z]:
            union_seg(vol[x,y,z], vol[x+1,y,z])

          if vol[x,y,z] != vol[x,y+1,z]:
            union_seg(vol[x,y,z], vol[x,y+1,z])

          if vol[x,y,z] != vol[x,y+1,z]:
            union_seg(vol[x,y,z], vol[x,y,z+1])

    return adjacency

  def get_segment_sizes(self):

    if self.data == None:
      self.getTile()
    vol = self.data

    segment_size = dict()
    for seg in vol.flatten():

      if seg not in segment_size:
        segment_size[seg] = 0

      segment_size[seg] += 1

    return segment_size

  def get_tasks(self):

    query = """
      select tasks.id, 
             tasks.seeds,
             validations.segments 
      from tasks 
      join validations on validations.task_id = tasks.id 
      where segmentation_id = {segmentation_id} and
            validations.status = 9;
    """.format(segmentation_id=self.id)

    task_list = db.query ( query )
    
    parsed_tasks = {}

    for task in task_list:

      parsed_tasks[ task['id'] ] = self._process_task ( task ) 

    return parsed_tasks

  def _parse_array( self , string ):

    segments = json.loads( string )
    if segments == []:
      return set()

    segments_keys = set()
    for seg_id, seg_prob in segments.iteritems():
      if seg_id != 'undefined' and seg_prob >= 0.5:

        segments_keys.add( int(seg_id) )

    return segments_keys

  def _process_task ( self, task):

    segments = self._parse_array(task['segments'])
    seeds = self._parse_array(task['seeds'])
    
    return  segments.union( seeds )


 
if __name__ == '__main__':
  vol = volume(116624 , True)

  assert sum(vol.get_segment_sizes().values()) == 256**3