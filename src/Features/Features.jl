#= 
Module Features

Contains all features that can be used by Agglomerators.
features make use of the macro @memoize 
which uses an ObjectIdDict as a cache
=#

module Features
using Agglomerator #import paths to other modules

using Memoize
using Moments
using LabelData
using Datasets

export measure, max_affinity, contact_area, mean_affinity

@memoize function measure(x::LabelData.TreeRegion)
	measure(x.left) + measure(x.right)
end
@memoize function measure(x::LabelData.AtomicRegion)
	length(x.voxels)
end

@memoize function max_affinity(x::LabelData.TreeEdge)
	max(max_affinity(x.left),max_affinity(x.right))
end
@memoize function max_affinity(x::LabelData.AtomicEdge)
	
	d = Datasets.get_dataset(x)
	maximum(map(_->d.affinities[_],x.edges))
end
@memoize function max_affinity(x::LabelData.EmptyEdge)
	0.0
end

@memoize function contact_area(x::LabelData.AtomicEdge)
	length(x.edges)
end
@memoize function contact_area(x::LabelData.TreeEdge)
	contact_area(x.left)+contact_area(x.right)
end
@memoize function contact_area(x::LabelData.EmptyEdge)
	0
end

@memoize function sum_affinity(x::LabelData.AtomicEdge)

	d = Datasets.get_dataset(x)
	sum(map(_->d.affinities[_],x.edges))
end
@memoize function sum_affinity(x::LabelData.EmptyEdge)
	0.0
end
@memoize function sum_affinity(x::LabelData.TreeEdge)
	sum_affinity(x.left)+sum_affinity(x.right)
end

function mean_affinity(x::LabelData.Edge)
	sum_affinity(x)/(contact_area(x)+0.01)
end
@memoize function unnormalized_moments(x::Tuple{LabelData.AtomicRegion,Int})
	r=x[1]
	n=x[2]
	sum([Moments.opow(Float64[1.0,v...],n) for v in r.voxels])
end
@memoize function unnormalized_moments(x::Tuple{LabelData.TreeRegion,Int})
	r=x[1]
	n=x[2]
	unnormalized_moments((r.left,n))+unnormalized_moments((r.right,n))
end
function centred_moments(r::LabelData.Region,n)
	moments=map(x->x./x[1],[unnormalized_moments((r,i)) for i in 1:n])
	centred_moments=Any[moments[1],[moments[i]-moments[1]⊗moments[i-1] for i in 2:n]...]
	#For higher moments, should be symmetrized
	#We can also try different centering schemes, maybe max-entropy centering?
	return centred_moments
end
function spectral_ratio(r::LabelData.Region)
	M=centred_moments(r,2)[2][2:4,2:4]
	e=eigvals(M)
	return e[1]/e[2]
end

end
