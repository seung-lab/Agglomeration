import tornado.ioloop
import tornado.web
from pyglomer.eyewire.volume import *
from pyglomer.eyewire import Tile
from  pyglomer.util import mesh
from pyglomer.spark.spark import SparkServer
import pyglomer.eyewire.api

from tornado.escape import json_encode

import requests
import h5py


edge_number = 0
edges = None
spark = None
stacks = { 'channel':{} , 'segmentation':{} }

def get_subtile(volume ,x, y, z, overlap = 0 ):

  def dim2slice(dim, overlap = 0 ,shape=256):
    return  slice(dim*128, min((dim+1)*128+ overlap, shape))

  return volume[dim2slice(x,overlap), dim2slice(y,overlap), dim2slice(z, overlap)]

def return_json(self, obj ):

  self.set_header('Content-type', 'application/json')
  self.set_header('Access-Control-Allow-Origin', '*')
  self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  self.write(json_encode(obj))

class MainHandler(tornado.web.RequestHandler):
  def get(self):
    self.write("Hello, world")

class TileHandler(tornado.web.RequestHandler):

  def get(self, type, mip, x, y, z, lower, upper):
    mip, x, y, z, lower, upper = int(mip), int(x), int(y), int(z), int(lower), int(upper)

    global stacks
    if (x,y,z) not in stacks[type]:
      result = spark.dataset.chunks.lookup((z,y,x))
      spark_channel = np.zeros(shape=(128,128,128), dtype=np.uint8)
      spark_segmentation = np.zeros(shape=(128,128,128), dtype=np.uint32)

      if len(result):
        chann, seg = result[0]

        spark_channel[:chann.shape[2]-1,:chann.shape[1]-1,:chann.shape[0]-1] = chann[:chann.shape[0]-1,:chann.shape[1]-1,:chann.shape[2]-1].transpose((2,1,0))
        spark_segmentation[:seg.shape[2]-1,:seg.shape[1]-1,:seg.shape[0]-1] = seg[:seg.shape[0]-1,:seg.shape[1]-1,:seg.shape[2]-1].transpose((2,1,0))
        # spark_segmentation[:50,:50,:50] = 1

      if type == 'channel':
        chunk = spark_channel
      else:
        chunk = spark_segmentation

      stack = []
      for z in range(lower, int(upper)):
        tile = {'data': Tile.array_to_base64( chunk[:,:,z]) }
        stack.append(tile)
      stacks[type][(x,y,z)] =  stack

    return_json(self, stacks[type][(x,y,z)] )


class EdgesHandler(tornado.web.RequestHandler):
  def get(self, volume_id):
    
    global edges
    global edge_number
    
    if not edges:
      edges = spark.get_edges()

    print  edges[edge_number]
    return_json(self, edges[edge_number])
    edge_number += 1

    # return_json(self, [[316], [19116], 0.5035960674285889])
    return

  def post(self, volume_id):
    print json.loads(self.request.body)
    self.set_header("Content-Type", "text/plain")
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') 
    self.set_status(200)
    self.finish()


  def options(self, volume_id):
    self.set_header("Content-Type", "text/plain")
    self.set_header('Access-Control-Allow-Headers','Content-Length')
    self.set_header('Access-Control-Allow-Headers','Content-Type')
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') 
    self.set_status(200)
    self.finish()

class TaskHandler(tornado.web.RequestHandler):
  def get(self):
    task = {
      'cell_id': 1860,
      'channel_id': 74627,
      'id': 1281071,
      'segmentation_id': 74628,
      'startingTile': 6
    }

    return_json(self, task)

def make_app():
  global spark
  spark = SparkServer()

  return tornado.web.Application([
    (r'', MainHandler),
    (r'/tasks', TaskHandler),
    (r'/volume/(\d+)/edges$', EdgesHandler),
    (r'/volume/(channel|segmentation)/chunk/(\d)/(\d)/(\d)/(\d)/tile/xy/(\d+):(\d+$)', TileHandler),
  ])

def run():
  app = make_app()
  app.listen(8888)
  # tornado.ioloop.IOLoop.current().set_blocking_log_threshold(5)
  tornado.ioloop.IOLoop.current().start()
if __name__ == '__main__':
  run()
