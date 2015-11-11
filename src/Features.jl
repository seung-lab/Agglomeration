#= 
Module Features

Contains all features that can be used by Agglomerators.
features make use of the macro @memoize 
which uses an ObjectIdDict as a cache
=#

module Features
using Agglomerator #import paths to other modules

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
@memoize function unnormalized_moments(x::Tuple{AtomicRegion,Int})
	r=x[1]
	n=x[2]
	sum([Moments.opow(Float64[1.0,v...],n) for v in r.voxels])
end
@memoize function unnormalized_moments(x::Tuple{TreeRegion,Int})
	r=x[1]
	n=x[2]
	unnormalized_moments((r.left,n))+unnormalized_moments((r.right,n))
end
function centred_moments(r::Region,n)
	moments=map(x->x./x[1],[unnormalized_moments((r,i)) for i in 1:n])
	centred_moments=[moments[1],[moments[i]-moments[1]⊗moments[i-1]]...]
	#For higher moments, should be symmetrized
	#We can also try different centering schemes, maybe max-entropy centering?
	return centred_moments
end


end
