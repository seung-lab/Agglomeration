module Features
using Volumes
using Memoize
using Moments

export measure, max_affinity, contact_area, mean_affinity

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
@memoize function contact_area(x::AtomicEdge)
	length(x.edges)
end
@memoize function contact_area(x::TreeEdge)
	contact_area(x.left)+contact_area(x.right)
end
@memoize function contact_area(x::EmptyEdge)
	0
end

@memoize function sum_affinity(x::AtomicEdge)
	sum(map(_->volume(x).affinities[_],x.edges))
end
@memoize function sum_affinity(x::EmptyEdge)
	0.0
end
@memoize function sum_affinity(x::TreeEdge)
	sum_affinity(x.left)+sum_affinity(x.right)
end

function mean_affinity(x::Edge)
	sum_affinity(x)/(contact_area(x)+0.01)
end

end
