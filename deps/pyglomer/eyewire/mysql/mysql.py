from mysql_conf import db
import pymysql
import numpy as np

class Mysql:

  def __init__(self):
    self.connection = pymysql.connect(host= db['host'], port= db['port'] , user=db['user'], passwd=db['password'], db=db['database'])
    print 'connected to database'

  def __del__(self):
    self.connection.close()
    print 'connection closed'


  def query(self, stringQuery):

    cursor = self.connection.cursor(pymysql.cursors.DictCursor)
    cursor.execute(stringQuery)

    # transform the disctionary into a recarray
    result = cursor.fetchall()
    if  result:
      data = np.rec.fromrecords([e.values() for e in result], names = result[0].keys())
      return data

    else:
      return None

  def first(self, stringQuery):
    cursor = self.connection.cursor(pymysql.cursors.DictCursor)
    cursor.execute(stringQuery)

    # transform the disctionary into a recarray
    result = cursor.fetchall()
    if  result:
      return result[0]

    else:
      return None

if __name__ == '__main__':
  mysql = Mysql()
  print mysql.query('select * from validations limit 10;')