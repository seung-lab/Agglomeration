from pyqtgraph.Qt import QtCore, QtGui
import pyqtgraph as pg
import pyqtgraph.opengl as gl

from pyqtgraph.pgcollections import OrderedDict
import types, traceback
import numpy as np

from pyqtgraph.parametertree import Parameter, ParameterTree, ParameterItem, registerParameterType


app = QtGui.QApplication([])
w=QtGui.QWidget()
w.show()
w.setWindowTitle('Monitor')

layout=QtGui.QGridLayout()
w.setLayout(layout)


view = gl.GLViewWidget()
view.opts['distance'] = 200

#b = gl.GLBoxItem()
#w.addItem(b)
#g = gl.GLGridItem()
#g.scale(10, 10, 1)
#view.addItem(g)

import numpy as np
d2=np.random.random_integers(0,0,(1,1,1,4))

v = gl.GLVolumeItem(d2)
view.addItem(v)

ax = gl.GLAxisItem()
view.addItem(ax)
view.setSizePolicy(QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Expanding)

d = {}

class MyDataTreeWidget(QtGui.QTreeWidget):
	"""
	Widget for displaying hierarchical python data structures
	(eg, nested dicts, lists, and arrays)
	"""
	
	def __init__(self, parent=None, data=None):
		QtGui.QTreeWidget.__init__(self, parent)
		self.setVerticalScrollMode(self.ScrollPerPixel)
		self.setData(data)
		self.setColumnCount(3)
		self.setHeaderLabels(['key / index', 'type', 'value'])
	
	def updateData(self,data):
		self.updateDataIter(data,self.invisibleRootItem().child(0))

	def updateDataIter(self,data,node):
		node.mydata=data
		if isinstance(data,dict):
			for i,k in zip(range(node.childCount()),data):
				self.updateDataIter(data[k],node.child(i))
		elif isinstance(data,list) or isinstance(data,tuple):
			for i in range(node.childCount()):
				self.updateDataIter(data[i],node.child(i))
		elif isinstance(data,np.ndarray):
			node.setText(2,str(data.dtype)+str(data.shape))
		else:
			node.setText(2,str(data))

		
	def setData(self, data, hideRoot=False):
		"""data should be a dictionary."""
		self.clear()
		self.buildTree(data, self.invisibleRootItem(), hideRoot=hideRoot)
		self.expandToDepth(3)
		self.resizeColumnToContents(0)
		
	def buildTree(self, data, parent, name='', hideRoot=False):
		if hideRoot:
			node = parent
		else:
			typeStr = type(data).__name__
			if typeStr == 'instance':
				typeStr += ": " + data.__class__.__name__
			node = QtGui.QTreeWidgetItem([name, typeStr, ""])
			node.mydata=data
			parent.addChild(node)
			
		if isinstance(data, dict):
			for k in data:
				self.buildTree(data[k], node, str(k))
		elif isinstance(data, list) or isinstance(data, tuple):
			for i in range(len(data)):
				self.buildTree(data[i], node, str(i))
		elif isinstance(data,np.ndarray):
			node.setText(2,str(data.dtype)+str(data.shape))
			self.setCurrentItem(node)
		else:
			node.setText(2, str(data))
		
def foo():
	if tree.currentItem() is not None:
		d=tree.currentItem().mydata
		if isinstance(d,np.ndarray) and len(d.shape)==3:
			update_volume(d)
		elif isinstance(d,np.ndarray) and len(d.shape)==2:
			update_volume2(d)
		elif isinstance(d,np.ndarray) and len(d.shape)==4:
			update_volume4(d)

tree = MyDataTreeWidget(data=d)
tree.itemSelectionChanged.connect(foo)

import pyqtgraph as pg

def onClick(event):
    items = w.scene().items(event.scenePos())
    print "Plots:", [x for x in items if isinstance(x, pg.PlotItem)]


params=[{'name': 'slicemin', 'type': 'int', 'value':0,'step':1},
		{'name': 'slicemax', 'type': 'int', 'value':100,'step':1},
		]
p=Parameter.create(name='params', type='group', children=params)

slicemin=p.children()[0]
slicemax=p.children()[1]

def change(param,changes):
	foo()

p.sigTreeStateChanged.connect(change)
t=ParameterTree()
t.setParameters(p,showTop=False)

layout.addWidget(view,0,0,2,1)
layout.addWidget(tree,0,1)
layout.addWidget(t,1,1)
layout.setColumnStretch (0, 2)
layout.setColumnStretch (1, 1)

def onClick(ev):
	print ev
def disp(x):
	tree.setData(x)
	foo()

def update(x):
	tree.updateData(x)
	foo()

def update_volume4(vol):
	newvol=np.copy(vol)
	newvol=newvol[:,:,max(slicemin.value(),0):min(slicemax.value(),newvol.shape[2]),:]
	newvol*=0.99
	newvol=np.floor(255*newvol).astype(int)

	global v
	view.removeItem(v)
	v=gl.GLVolumeItem(newvol)
	v.translate(-vol.shape[0]/2,-vol.shape[1]/2,-vol.shape[2]/2)
	view.addItem(v)
	view.repaint()

def update_volume(vol):
	newvol=np.copy(vol)
	newvol=newvol[:,:,max(slicemin.value(),0):min(slicemax.value(),newvol.shape[2])]
	newvol-=newvol.min()
	newvol/=newvol.max()
	newvol=np.reshape(newvol,newvol.shape+(1,))
	#alpha=newvol**alphapower.value()
	#newvol=newvol**brightnesspower.value()
	#x=0.99*np.ones(vol.shape)
	newvol=np.floor(255*np.concatenate((newvol,newvol,newvol,newvol),3)).astype(int)

	global v
	view.removeItem(v)
	v=gl.GLVolumeItem(newvol,smooth=True)
	v.translate(-vol.shape[0]/2,-vol.shape[1]/2,-vol.shape[2]/2)
	view.addItem(v)
	view.repaint()

def update_volume2(vol):
	newvol=np.copy(vol)
	newvol=np.reshape(newvol,newvol.shape+(1,))
	newvol-=newvol.min()
	newvol/=newvol.max()
	newvol=np.reshape(newvol,newvol.shape+(1,))
	newvol=np.floor(255*np.concatenate((newvol,newvol,newvol,newvol),3)).astype(int)

	global v
	view.removeItem(v)
	v=gl.GLVolumeItem(newvol)
	v.translate(-newvol.shape[0]/2,-newvol.shape[1]/2,-newvol.shape[2]/2)
	view.addItem(v)
	view.repaint()
if __name__ == '__main__':
	import sys
	if (sys.flags.interactive != 1) or not hasattr(QtCore, 'PYQT_VERSION'):
		QtGui.QApplication.instance().exec_()

