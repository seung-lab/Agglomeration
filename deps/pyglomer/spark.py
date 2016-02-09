# #Path hack.
# import sys; import os; sys.path.insert(0, os.path.abspath('../pyglomer/eyewire/'))
# from mysql import db

from pyspark import *
from dataset import *



if __name__ == '__main__':
  conf = SparkConf().setMaster("local[3]").setAppName("Agglomerator")
  conf.set("spark.executor.memory", "4g")
  conf.set("spark.executor.cores", 1)
  sc = SparkContext(conf=conf)

  log4j = sc._jvm.org.apache.log4j
  log4j.LogManager.getRootLogger().setLevel(log4j.Level.ERROR)

  # print sc.pickleFile('tmp/spark/').count()


  d = Dataset()
  volumes = sc.parallelize( Dataset.get_most_traced_volumes(), 1 )
  print volumes.take(1)
  # mapped = volumes.map(d.get_volumes)
  # mapped.saveAsPickleFile('tmp/spark')

  # import shutil
  # shutil.rmtree('tmp/spark')
  # sc.stop()