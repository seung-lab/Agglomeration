__precompile__()
module SNEMI3DS
using Volumes3
export SNEMI3DVolume

const SNEMI3DVolume=Volume(expanduser("ds"),:SNEMI3D)
const SNEMI3DRegions=compute_regions(SNEMI3DVolume)
const SNEMI3DEdges=compute_edges(SNEMI3DVolume,SNEMI3DRegions)

@generated function Volumes3.volume(x::Region{:SNEMI3D})
	:(SNEMI3DVolume)
end
@generated function Volumes3.regions(x::Volume{:SNEMI3D})
	:(SNEMI3DRegions)
end
@generated function Volumes3.edges(x::Volume{:SNEMI3D})
	:(SNEMI3DEdges)
end

end
