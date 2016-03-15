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

reponse_cache = dict()
segmentation = None
channel = None
meshes = dict()

edge_number = 0
edges = None
spark = None

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

  def get(self, volume_id, mip, x, y, z, lower, upper):
    volume_id, mip, x, y, z, lower, upper = int(volume_id), int(mip), int(x), int(y), int(z), int(lower), int(upper)

    result = spark.dataset.chunks.lookup((z,y,x))

    spark_channel = np.zeros(shape=(128,128,128), dtype=np.uint8)
    spark_segmentation = np.zeros(shape=(128,128,128), dtype=np.uint32)

    if len(result):
      chann, seg = result[0]
      spark_channel[:128,:128,:89] = chann[:89,:128,:128].transpose((2,1,0))
      spark_segmentation[:128,:128,:89] = seg[:89,:128,:128].transpose((2,1,0))


    if volume_id == 74627:
      chunk = spark_channel
    else:
      chunk = spark_segmentation

    stack = []
    for z in range(lower, int(upper)):
      tile = {'data': Tile.array_to_base64( chunk[:,:,z]) }
      stack.append(tile)

    return_json(self, stack)


class EdgesHandler(tornado.web.RequestHandler):
  def get(self, volume_id):
    
    if volume_id not in reponse_cache:
      reponse_cache[volume_id] = spark.get_edges()

    global edge_number
    edges = reponse_cache[volume_id]
    print  edges[edge_number]
    return_json(self, edges[edge_number])
    edge_number += 1

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
      (r'/volume/(\d+)/chunk/(\d)/(\d)/(\d)/(\d)/tile/xy/(\d+):(\d+$)', TileHandler),
    ])

if __name__ == '__main__':
  app = make_app()
  app.listen(8888)
  # tornado.ioloop.IOLoop.current().set_blocking_log_threshold(5)
  tornado.ioloop.IOLoop.current().start()
