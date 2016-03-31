import tornado.ioloop
import tornado.web
from pyglomer.eyewire.volume import *
from  pyglomer.util import mesh
from pyglomer.spark.spark import SparkServer
import pyglomer.eyewire.api

from tornado.escape import json_encode
import pickle

spark = None

def return_json(self, obj ):

  self.set_header('Content-type', 'application/json')
  self.set_header('Access-Control-Allow-Origin', '*')
  self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  self.write(json_encode(obj))

class MainHandler(tornado.web.RequestHandler):
  def get(self):
    self.write("Hello, world")

class ChunkHandler(tornado.web.RequestHandler):

  def get(self, mip, x, y, z):
    mip, x, y, z = int(mip), int(x), int(y), int(z)

    path = '/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/chunks/{}-{}-{}.json'.format(z,y,x)
    with open(path,'r') as f:
      unserialized_data = pickle.load(f)   
      return_json(self, unserialized_data )


class EdgesHandler(tornado.web.RequestHandler):
  def get(self, volume_id):
  
    edge = spark.get_edge()
    return_json(self, edge)
    return

  def post(self, volume_id):
    decision = json.loads(self.request.body)
    spark.get_human_decision(decision)

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

class StaticFileHandler(tornado.web.StaticFileHandler):

  def set_extra_headers(self, path):
    self.set_header('Content-type', 'application/json')
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    self.set_header('Content-Encoding', 'gzip')


def make_app():
  global spark
  spark = SparkServer()

  return tornado.web.Application(handlers=[
    (r'', MainHandler),
    (r'/tasks', TaskHandler),
    (r'/volume/(\d+)/edges$', EdgesHandler),
    (r'/chunk/(.*)', StaticFileHandler,{"path": "/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/chunks/"}),
  ],
  settings= {
    "compress_response": True,
  })
  #none of this settings seems to work, and responses are sent uncompressed


def run():
  app = make_app()
  app.listen(8888)
  # tornado.ioloop.IOLoop.current().set_blocking_log_threshold(5)
  tornado.ioloop.IOLoop.current().start()
if __name__ == '__main__':
  run()
