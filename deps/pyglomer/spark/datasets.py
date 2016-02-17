from pyglomer.spark.graph import *

class Dataset:

  def __init__(self, sc):
    """
      SparkContext is required to return rdds
    """
    self.sc = sc
    self.g = Graph(sc)
    pass

  def graph(self):
    return self.g

  def files(self, file):
    files = {
      'machine_labels': '/usr/people/it2/code/Agglomerator/deps/datasets/SNEMI3D/ds_test/machine_labels.h5',
      'adjcency':'./pyglomer/spark/tmp/spark/adjcency',
      'sizes':'./pyglomer/spark/tmp/spark/sizes',
      'meshes': './pyglomer/spark/tmp/spark/meshes'
    }
    return files[file]