module Features
using Volumes
using Memoize

@memoize function measure(x::TreeRegion)
	measure(x.left) + measure(x.right)
end
@memoize function measure(x::AtomicRegion)
	length(x.voxels)
end
@memoize function max_affinity(x::TreeEdge)
	max(max_affinity(x.left),max_affinity(x.right))
end
@memoize function max_affinity(x::AtomicEdge)
	maximum(map(_->volume(x).affinities[_],x.edges))
end
@memoize function max_affinity(x::EmptyEdge)
	0.0
end

end
