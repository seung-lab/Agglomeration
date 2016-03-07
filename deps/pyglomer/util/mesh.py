import operator
import numpy as np

from skimage import measure
from collections import defaultdict
import itertools

#For visualization
from tvtk.api import tvtk
from mayavi import mlab

#To export openctm meshes
from ctypes import *
from openctm import *
from StringIO import StringIO
import tempfile
    
def marche_cubes( ids , volume):
  """ Given a segmentation volume and set of ids, 
      it first computes a boolean volume, where every voxel 
      which correspond to an id present in the ids set is set to true.
      It then create a mesh in the boundaries between true and false.
  """

  shape = volume.shape
  volume = np.in1d(volume,ids).reshape(shape)

  try:
    vertices, triangles =  measure.marching_cubes(volume, 0.5)
  except:
    return np.array([]), np.array([])

  #We rather work for integers that with floats, there are only .5 values
  vertices = vertices * 2
  vertices = vertices.astype(np.uint16)

  return vertices , triangles

def get_adjacent( vertices, triangles ):
  """ Converts the clasical repretesentation of a mesh,
      to a hash table of adjacency of vertices.
      Clasical repretesentation meaning a list of triples
      repretesenting the position of each vertex, and a list
      of triangles where each value referes to the position in
      the list of a vertice.
      The adjacency repretesentation return here, is a hash table
      where the key is a vertex triplets, and its maps into a set
      of vertices triplets.
      It takes O(1) to check if a vertex exist, as well as getting
      the adjacet vertices to it. This two operations are really
      important for the project.
      If using the clasical repretesentation It would take O(n) to
      check for vertex existence, and also O(n) to retrieve all the
      adjacents vertices.
  """

  adj = defaultdict(set)
  for t in triangles:

    v_0 = tuple( vertices[t[0]] )
    v_1 = tuple( vertices[t[1]] )
    v_2 = tuple( vertices[t[2]] )

    adj[v_0].add( v_1 ); adj[v_0].add( v_2 )
    adj[v_1].add( v_0 ); adj[v_1].add( v_2 )
    adj[v_2].add( v_0 ); adj[v_2].add( v_1 )

  return adj

def get_vertices_triangles( adj ):
  """
    Converts from the adjacency representation to the
    vertices triangles one.
  """

  vertices = dict() 
  vertex_counter = 0
  for vertex in adj:
    vertices[vertex] = vertex_counter
    vertex_counter += 1

  triangles = set()
  for vertex_1 in adj:
    adj_vertices = list(adj[vertex_1])

    d = lambda vertex_2: np.linalg.norm(np.array(vertex_1) - np.array(vertex_2))
    filterd_vertices = []
    for adj_vertex in adj_vertices:
      if d(adj_vertex) <= 2.1:
        filterd_vertices.append(adj_vertex)

    if len(filterd_vertices) < 2:
      continue

    for pair in itertools.combinations(filterd_vertices, 2):
      triangle = vertices[vertex_1] , vertices[pair[0]], vertices[pair[1]]
      triangles.add(triangle)


  vertices = map(lambda x: x[0] , sorted(vertices.items(), key=operator.itemgetter(1)))
  return np.array(vertices), np.array(list(triangles))

def find_matching_vertices( adj_1, adj_2 ):
  """ Given two meshes represented as adjcents (see get_adjacent)
      It returns the vertices which belongs to both meshes.

      It takes O(n) time being n, the number of vertices of the 
      smaller mesh.
      This is unnecesary, we could get the matching points by 
      doing a single pass through the volume
  """

  #Itereate over the mesh with less vertices
  if len(adj_1) > len(adj_2):
    adj_1, adj_2 = adj_2, adj_1

  matches = []
  for vertex in adj_1:
    if vertex in adj_2:
      matches.append(vertex)

  return matches

def get_patch( id_1 , id_2, adj_1, adj_2, matches_adj_adj, volume ):
  """ Given two meshes represented as adjcents (see get_adjacent)
      It returns another mesh which wraps the contact region of 
      both meshes, also represented as adjacents.
  """

  patch_adj = defaultdict(set)
  for vertex in matches_adj_adj:
    s_origin, s_slice = get_surrounding_vertex( vertex )
    vertices, triangles = marche_cubes( (id_1, id_2) , volume[s_slice] )
    if len(vertices) == 0:
      continue
    vertices = vertices + s_origin
    vertex_adj = get_adjacent( vertices, triangles )
    patch_adj = merge_adjacents( patch_adj, vertex_adj )

  return patch_adj

def merge_meshes(v_1, t_1, v_2, t_2):
  """ Given two meshes represented as lists of vertices,
      and triangles, it merges them returning a new mesh
      using the same repretesentation

      It doesn't do anything smart about removing duplicate
      vertices or triangles."""

  offset = len(v_1)
  v_1 = list(v_1)
  t_1 = list(t_1)
  v_2 = list(v_2)

  for triangle in t_2:
    vertex_idx_0 = triangle[0] + offset
    vertex_idx_1 = triangle[1] + offset
    vertex_idx_2 = triangle[2] + offset
    t_1.append( np.array([vertex_idx_0, vertex_idx_1, vertex_idx_2]) )

  v_1 = v_1 + v_2 #Concatentate vertices
  return np.array(v_1), np.array(t_1)

def compute_and_display_patch( id_1 , id_2, adj_1, adj_2, matches_adj_adj, volume ):
  """ Equivalent to get_path, but it works with meshes represented as lists of 
      triangles and vertices. 

      This inconvinient, we should probably just convert the adjacent
      repretesentation to something that can be displayed.
      Look at get_vertices_triangles
  """

  patch_vertices = None; patch_triangles = None
  for vertex in matches_adj_adj:
    s_origin, s_slice = get_surrounding_vertex( vertex )
    vertices, triangles = marche_cubes( (id_1, id_2) , volume[s_slice] )
    if len(vertices) == 0:
      continue
    vertices = vertices + s_origin

    if patch_vertices == None:
      patch_vertices =  vertices
      patch_triangles = triangles
    else:
      patch_vertices, patch_triangles = merge_meshes(patch_vertices, patch_triangles,
                                                     vertices, triangles)

  display_marching_cubes(patch_vertices, patch_triangles , opacity = 0.4)

def get_surrounding_vertex( vertex ):
  
  slices = []
  origin = []
  for axis in vertex:
    if axis % 2 == 1:
      axis_slice = slice( axis/2 ,  axis/2 + 2 )
    else:
      axis_slice = slice( axis/2-1, axis/2 + 2)

    slices.append(axis_slice)
    origin.append(axis_slice.start * 2)

  return origin, tuple(slices)

def merge_adjacents(adj_1, adj_2):
  """ Given two meshes represented as adjacents (see get_adjacent),
      Return a new meshes containig both with the same repretesentation,
      without having duplicate vertices, because of the nature of the 
      datastructure.
  """

  if len(adj_1) > len(adj_2):
    adj_1, adj_2 = adj_2, adj_1
  for vertex in adj_1: #we don't have to check for existence because of using defaultdict(set)
    adj_2[vertex] = adj_2[vertex].union( adj_1[vertex])
  return adj_2

def find_displacements( adj, adj_patch, matches_adj_adj ):
  """
  """

  matches_adj_adj = set(matches_adj_adj)
  matches = find_matching_vertices(adj, adj_patch)
  if len(matches) == 0: #TODO it is strange that we don't find anything sometimes.
    # print 'there was no matching points between segment mesh and patch'
    return []

  magnitudes = []
  for vertex in matches:
    neighboors_to_consider = list(adj[vertex].difference( matches_adj_adj )
                             .union( adj_patch[vertex]))
    new_position = np.average( neighboors_to_consider , axis=0) 
    displacement =  new_position - vertex
    magnitude = np.linalg.norm(displacement)
    magnitudes.append(magnitude)
  return magnitudes

def compute_feature( id_1 , id_2, adj_1 , adj_2 , contact_regions, volume):

  # matches_adj_adj = find_matching_vertices( adj_1, adj_2 )
  # if set(map( lambda tup: tuple([int(x * 2) for x in tup]), contact_regions)) ==  set(matches_adj_adj):
  #   print 'matches'
  # else:
  #   new =  set(map( lambda tup: tuple([int(x * 2) for x in tup]), contact_regions)) 
  #   old = set(matches_adj_adj)
  #   print 'intersection', new.intersection(old)
  #   print 'only new', new.difference(old)
  #   print 'old olny', old.difference(new)
  #   print 'new', new
  #   print 'old', old
  adj_patch = get_patch( id_1 , id_2, adj_1, adj_2, contact_regions, volume )
  disp_1 = find_displacements(adj_1, adj_patch, contact_regions)
  disp_2 = find_displacements(adj_2, adj_patch, contact_regions)
  return disp_1, disp_2


def display_marching_cubes(vertices, triangles, color=(0, 0, 0), opacity=1.0):
  """ Pushes meshes to renderer.
      remember to call mlab.show(), after everything 
      has being pushed.
  """
  if triangles == []:
    for vertex in vertices:
      mlab.points3d(vertex[0], vertex[1], vertex[2], scale_factor=0.5, resolution=24, color=color)
  else:
    mesh = tvtk.PolyData(points=vertices, polys=triangles)
    surf = mlab.pipeline.surface(mesh, opacity=opacity)
    mlab.pipeline.surface(mlab.pipeline.extract_edges(surf), color=color)
  
  # mlab.show()
  return

def display_pair( volume_id , id_1, id_2, matches):
  """ Given a volume_id, and two segments ids, it display both
      individual meshes, the mesh of the patch connecting them,
      and the displacemts vectors. Used for debugging.
  """

  vol = volume(volume_id , True)
  vol.getTile()

  vertices, triangles = marche_cubes( id_1 , vol.data )
  display_marching_cubes(vertices, triangles , color = (1.0,0.0,0.0), opacity=0.5)
  adj_1 =  get_adjacent( vertices, triangles )

  vertices, triangles = marche_cubes( id_2 , vol.data )
  display_marching_cubes(vertices, triangles , color = (0.0,0.0,1.0), opacity=0.5)
  adj_2 =  get_adjacent( vertices, triangles )

  matches_adj_adj = find_matching_vertices(adj_1, adj_2)
  compute_and_display_patch( id_1 , id_2, adj_1, adj_2, matches_adj_adj,  vol.data )

  adj_patch = get_patch( id_1 , id_2, adj_1, adj_2, matches_adj_adj, vol.data )
  disp_1 = find_displacements(adj_1, adj_patch, matches_adj_adj)
  disp_2 = find_displacements(adj_2, adj_patch, matches_adj_adj)

  #TODO display displacements
  matches = set(map( lambda tup: tuple([int(x * 2) for x in tup]), matches))
  matches_adj_adj = set(matches_adj_adj)
  for match in matches.union(matches_adj_adj):

    if match in matches and match in matches_adj_adj:
      color = (1.0,1.0,1.0)
    elif  match not in matches and match in matches_adj_adj:
      color = (0.0,0.0,1.0)
    else:
      color = (1.0,0.0,0.0)

    mlab.points3d(match[0], match[1], match[2], scale_factor=0.5, resolution=5 , color=color)
    #debug
    # mlab.quiver3d(vertex[0], vertex[1], vertex[2],
    #               patch_displacement[0], patch_displacement[1], patch_displacement[2] 
    #               ,scalars=(0.0))

    # sum_magnitude += np.linalg.norm(patch_displacement)
  mlab.show()
  return

def vertices_triangles_to_openctm( vertices, triangles ):


  def make_blob(verts, T):
    """Convert a list of tuples of numbers into a ctypes pointer-to-array"""
    size = len(verts) * len(verts[0])
    Blob = T * size
    floats = [c for v in verts for c in v]
    blob = Blob(*floats)
    return cast(blob, POINTER(T))

  if len(vertices) == 0 or len(triangles) == 0:
    return ''

  pVertices = make_blob(vertices, c_float)
  pTriangles = make_blob(triangles, c_uint)
  pNormals = POINTER(c_float)()
  ctm = ctmNewContext(CTM_EXPORT)
  ctmDefineMesh(ctm, pVertices, len(vertices), pTriangles, len(triangles), pNormals)

  #Having to use a tmp file, because StringIO can't be easly pass
  #Because the biding is expecting an string
  #It is also possible to pass a c++ stream, but I don't know
  #how to interface that with python
  tf = tempfile.NamedTemporaryFile()
  ctmSave(ctm, tf.name)
  ctmFreeContext(ctm)
  s = tf.read()
  tf.close()
  return s


if __name__ == '__main__':

  from pyglomer.eyewire.volume import *
  
  for x in range(2):
    for y in range(2):
      for z in range(2):
        chunk = volume(74628, True).getSubTile(x,y,z)
        vertices, triangles = marche_cubes([4738], chunk.stack)

        if len(vertices):
          print x,y,z,  np.amax(vertices) ,  np.amin(vertices)
          vertices = vertices + np.array([x*256, y*256, z*256])

          vertices = vertices.astype(float) / 255.0
          display_marching_cubes(vertices, triangles)


  mlab.show()