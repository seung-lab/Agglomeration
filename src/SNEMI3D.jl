
#=
Module SNEMI3D

This module loads the SNEMI3D dataset
http://brainiac2.mit.edu/SNEMI3D/

is this training and test data?

The images are 1000x1000x100 and there are about 400 labelled segments
=# 


__precompile__()
module SNEMI3D
using Volumes
export SNEMI3DTrainVolume, SNEMI3DTestVolume

"~/seungmount/research/Jonathan/SNEMI3D"
SNEMI3D_DATA_PATH="/media/usb0/SNEMI3D"

const SNEMI3DTrainVolume=Volume(expanduser("$(SNEMI3D_DATA_PATH)/ds_train"),:SNEMI3DTrain)
const SNEMI3DTrainRegions=compute_regions(SNEMI3DTrainVolume)
const SNEMI3DTrainEdges=compute_edges(SNEMI3DTrainVolume,SNEMI3DTrainRegions)

@generated function Volumes.volume(x::Region{:SNEMI3DTrain})
	:(SNEMI3DTrainVolume)
end
@generated function Volumes.volume(x::Edge{:SNEMI3DTrain})
	:(SNEMI3DTrainVolume)
end
@generated function Volumes.regions(x::Volume{:SNEMI3DTrain})
	:(SNEMI3DTrainRegions)
end
@generated function Volumes.edges(x::Volume{:SNEMI3DTrain})
	:(SNEMI3DTrainEdges)
end

const SNEMI3DTestVolume=Volume(expanduser("$(SNEMI3D_DATA_PATH)/ds_test"),:SNEMI3DTest)
const SNEMI3DTestRegions=compute_regions(SNEMI3DTestVolume)
const SNEMI3DTestEdges=compute_edges(SNEMI3DTestVolume,SNEMI3DTestRegions)

@generated function Volumes.volume(x::Region{:SNEMI3DTest})
	:(SNEMI3DTestVolume)
end
@generated function Volumes.volume(x::Edge{:SNEMI3DTest})
	:(SNEMI3DTestVolume)
end
@generated function Volumes.regions(x::Volume{:SNEMI3DTest})
	:(SNEMI3DTestRegions)
end
@generated function Volumes.edges(x::Volume{:SNEMI3DTest})
	:(SNEMI3DTestEdges)
end
end
