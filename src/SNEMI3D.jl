__precompile__()
module SNEMI3D
using Volumes
export SNEMI3DVolume

const SNEMI3DVolume=Volume(expanduser("~/CNN/ds"),:SNEMI3D)
const SNEMI3DRegions=compute_regions(SNEMI3DVolume)
const SNEMI3DEdges=compute_edges(SNEMI3DVolume,SNEMI3DRegions)

@generated function Volumes.volume(x::Region{:SNEMI3D})
	:(SNEMI3DVolume)
end
@generated function Volumes.volume(x::Edge{:SNEMI3D})
	:(SNEMI3DVolume)
end
@generated function Volumes.regions(x::Volume{:SNEMI3D})
	:(SNEMI3DRegions)
end
@generated function Volumes.edges(x::Volume{:SNEMI3D})
	:(SNEMI3DEdges)
end

end
