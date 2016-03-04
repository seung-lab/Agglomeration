import tornado.ioloop
import tornado.web
from pyglomer.eyewire.volume import *
from pyglomer.eyewire import Tile

from tornado.escape import json_encode


reponse_cache = dict()
segmentation = None
channel = None

def get_subtile(volume ,x, y, z):

  def dim2slice(dim):
    return  slice(dim*128, (dim+1)*128)

  return volume[dim2slice(x), dim2slice(y), dim2slice(z)]



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
    
    if volume_id == 74627:
      chunk = get_subtile(channel, x, y, z)
    else:
      chunk = get_subtile(segmentation, x, y, z)

    stack = []
    for z in range(lower, int(upper)):
      tile = {'data': Tile.array_to_base64( chunk[:,:,z]) }
      stack.append(tile)

    return_json(self, stack)

class EdgesHandler(tornado.web.RequestHandler):
  def get(self, volume_id):
    
    if volume_id not in reponse_cache:
      vol = volume(volume_id , True)
      vol.getTile()
      edges = []
      o_adjacents =  vol.get_adjacency_segments()
      for id_1 in o_adjacents:
        for id_2 in o_adjacents[id_1]:
          edges.append( [int(id_1), int(id_2) , int(o_adjacents[id_1][id_2])] )

      edges = filter(lambda tup: tup[2] > 20, edges)
      edges.sort(key=lambda tup: -tup[2])

      reponse_cache[volume_id] = edges

        
    edges = reponse_cache[volume_id]
    return_json(self, edges)

class TaskHandler(tornado.web.RequestHandler):
  def get(self):
    task = {
      'cell_id': 1860,
      'channel_id': 74627,
      'id': 1281071,
      'segmentation_id': 74628,
      'startingTile': 6
    }

    global segmentation
    global channel
    segmentation = volume(task['segmentation_id'])
    segmentation.getTile()
    segmentation = segmentation.data

    channel = volume(task['channel_id'])
    channel.getTile()
    channel = channel.data

    return_json(self, task)

def make_app():
    return tornado.web.Application([
      (r'', MainHandler),
      (r'/tasks', TaskHandler),
      (r'/volume/(\d+)/edges$', EdgesHandler),
      (r'/volume/(\d+)/chunk/(\d)/(\d)/(\d)/(\d)/tile/xy/(\d+):(\d+$)', TileHandler)
    ])

if __name__ == '__main__':
  app = make_app()
  app.listen(8888)
  tornado.ioloop.IOLoop.current().start()
