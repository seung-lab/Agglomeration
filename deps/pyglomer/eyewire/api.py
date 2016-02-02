import construct #To parse the meshes
import requests


def getSegmentMesh(segmentation_volume, chunk_x, chunk_y, chunk_z, segment_id):

	""" Segments mesh comes with coordinates from [0.0 1.0] for a given tasks.
			A tasks contains 8 chunks, which is selected by specifying chunk_x, chunk_y, chunk_z.
			coordinates for the chunk [0,0,0] will be restricted to coordinates from [0.0 0.25]
			for each axis """

	url = "http://data.eyewire.org/volume/{0}/chunk/0/{1}/{2}/{3}/mesh/{4}".format(segmentation_volume, chunk_x, chunk_y, chunk_z, segment_id)

	return processVertex(url)


def getOverviewMesh(cell_id, mip_level, chunk_x, chunk_y, chunk_z):
	
	url = "http://data.eyewire.org/cell/{0}/chunk/{1}/{2}/{3}/{4}/mesh".format(cell_id * 10 + 1, mip_level , chunk_x , chunk_y, chunk_z)

	return processVertex(url)

def processVertex( url ):

	try:
		response = requests.get(url)
	except Exception, e:
		print "couldn't get \n", url, " because," 
		print e
		return

	parseStruct = construct.Struct("vertex",
	 construct.LFloat32("vx"),
	 construct.LFloat32("vy"),
	 construct.LFloat32("vz"),
	 construct.LFloat32("nx"),
	 construct.LFloat32("ny"),
	 construct.LFloat32("nz")
	)

	if(len(response.content) == 0):
		return

	try:
		print ' api content size ', response.headers['content-length']  
	except:
		print 'unkown size'

	meshParser = construct.Array(len(response.content)/ 24 ,parseStruct)

	vertex = list()
	for element in meshParser.parse(response.content):
		vertex.append( (element.vx, element.vy, element.vz) )

	return vertex