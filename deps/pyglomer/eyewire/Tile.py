from StringIO import StringIO
import base64
import numpy as np
import png
from PIL import Image
import itertools

@profile
def base64_to_array( string ):
  
  mine_type , encoded =  string.split(',') 
  decoded = base64.decodestring(encoded)

  if mine_type == 'data:image/png;base64':
    pngReader = png.Reader(bytes=decoded)
    row_count, column_count, pngdata, meta = pngReader.asDirect()
 
    vstack = list(itertools.imap(np.uint8, pngdata))
    img = np.asarray(vstack).reshape(row_count,column_count ,meta['planes'])
    img[:,:,3] = 0 #set alpha channel to zero
    img = img.view(np.uint32).reshape(row_count, column_count).transpose()
    return img
  elif mine_type == 'data:image/jpeg;base64':
    return np.array(Image.open(StringIO(decoded))).transpose()
  else:
    raise Exception('Unkown format {}'.format(mine_type))
    


def array_to_base64( array ):
  #Why are transposing necessary, is this a bug in omni.server? column major vs row major?
  if array.dtype != np.uint8:

    #Segmentation
    array = np.copy(array)
    array = array.view(np.uint8).reshape(128,128,4)
    array[:,:,3] = 255
    array = array.transpose((1,0,2))
  

    s = StringIO()
    png.from_array(array , 'RGBA;8').save(s)
    encoded = base64.b64encode(s.getvalue())
    return 'data:image/png;base64,{}'.format(encoded)

  else:
    #Channel
    im = Image.fromarray(array.transpose())
    s = StringIO()
    im.save(s, format='jpeg')
    encoded = base64.b64encode(s.getvalue())
    return 'data:image/jpeg;base64,{}'.format(encoded)