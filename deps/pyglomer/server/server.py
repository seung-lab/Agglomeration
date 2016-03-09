import tornado.ioloop
import tornado.web
from pyglomer.eyewire.volume import *
from pyglomer.eyewire import Tile
from  pyglomer.util import mesh
import pyglomer.eyewire.api

from tornado.escape import json_encode

import requests


reponse_cache = dict()
segmentation = None
channel = None
meshes = dict()

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
    
    if volume_id == 74627:
      chunk = get_subtile(channel, x, y, z)
    else:
      chunk = get_subtile(segmentation, x, y, z)

    stack = []
    for z in range(lower, int(upper)):
      tile = {'data': Tile.array_to_base64( chunk[:,:,z]) }
      stack.append(tile)

    return_json(self, stack)

class MeshHandler(tornado.web.RequestHandler):

  def get(self, volume_id, mip, x, y, z, segment_id):
    volume_id, mip, x, y, z, segment_id = int(volume_id), int(mip), int(x), int(y), int(z), int(segment_id)

    url = "http://data.eyewire.org/volume/{0}/chunk/0/{1}/{2}/{3}/mesh/{4}".format(volume_id, x, y, z, segment_id)
    response = requests.get(url)
    self.set_header('Access-Control-Expose-Headers','Content-Length')
    self.set_header('Content-type', 'text/plain;')
    self.set_header('Content-Length', len(ctmfile))
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') 
    self.write(ctmfile)
    self.finish()

    if (x,y,z,segment_id) not in meshes:
      chunk = get_subtile(segmentation, x, y, z, overlap=1)
      vertices, triangles = mesh.marche_cubes([segment_id], chunk)
      
      if len(vertices):
        vertices = vertices + np.array([x*256, y*256, z*256])
        vertices = vertices.astype(float) / (255.0 * 2.0) 
      
      ctmfile = mesh.vertices_triangles_to_openctm( vertices, triangles )
      meshes[(x,y,z,segment_id)] = ctmfile

    ctmfile = meshes[(x,y,z,segment_id)]
    if len(ctmfile) == 0:
      self.clear()
      self.set_header('Access-Control-Expose-Headers','Content-Length')
      self.set_header('Content-Length', 0)
      self.set_header('Access-Control-Allow-Origin', '*')
      self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') 
      self.set_status(204)
      self.finish()
      return

    self.set_header('Access-Control-Expose-Headers','Content-Length')
    self.set_header('Content-type', 'text/plain;')
    self.set_header('Content-Length', len(ctmfile))
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') 
    self.write(ctmfile)
    self.finish()
    return


class EdgesHandler(tornado.web.RequestHandler):
  def get(self, volume_id):
    
    return_json(self, [ [4738, 2705] ])
    return

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
      (r'/volume/(\d+)/chunk/(\d)/(\d)/(\d)/(\d)/tile/xy/(\d+):(\d+$)', TileHandler),
      (r'/volume/(\d+)/chunk/(\d)/(\d)/(\d)/(\d)/mesh/(\d+$)', MeshHandler)
    ])

if __name__ == '__main__':
  app = make_app()
  app.listen(8888)
  tornado.ioloop.IOLoop.current().start()
