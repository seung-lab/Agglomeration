if VERSION < v"0.5.0-dev"
	__precompile__()
end

module Features
using Agglomeration
using Memoize
using RegionGraphs

export min_affinity, max_affinity, mean_affinity, hist_affinity, contact_area, volume, soft_label_factory


function sum_affinity(x::AtomicEdge)
	x.sum_affinity
end
@memoize function sum_affinity(x::TreeEdge)
	sum_affinity(x.left) + sum_affinity(x.right)
end
function sum_affinity(x::ReverseEdge)
	sum_affinity(reverse(x))
end
function contact_area(x::AtomicEdge)
	x.area
end
@memoize function contact_area(x::TreeEdge)
	contact_area(x.left)+contact_area(x.right)
end

@memoize function volume(x::TreeRegion)
	volume(x.left) + volume(x.right)
end
function volume(x::AtomicRegion)
	x.volume
end

function contact_area(x::ReverseEdge)
	contact_area(reverse(x))
end
function contact_area(x::MergeEdge)
	1f-3
end
function sum_affinity(x::MergeEdge)
	1f-3
end

function sum_affinity(::EmptyEdge)
	0f0
end
function contact_area(::EmptyEdge)
	0f0
end
function mean_affinity(::EmptyEdge)
	0f0
end

@memoize function hist_affinity(x::TreeEdge)
	hist_affinity(x.left) + hist_affinity(x.right)
end
function hist_affinity(x::ReverseEdge)
	hist_affinity(reverse(x))
end
function hist_affinity(x::AtomicEdge)
	x.hist_affinity
end
function hist_affinity(x::EmptyEdge)
	zeros(Float32, (5,))
end
function hist_affinity(x::MergeEdge)
	fill(1f-3, (5,))
end

@memoize function max_affinity(x::TreeEdge)
	max(max_affinity(x.left),max_affinity(x.right))
end
function max_affinity(x::EmptyEdge)
	0f0
end
function max_affinity(x::MergeEdge)
	0f0
end
function max_affinity(x::AtomicEdge)
	x.max_affinity
end
function max_affinity(x::ReverseEdge)
	max_affinity(reverse(x))
end


@memoize function min_affinity(x::TreeEdge)
	min(min_affinity(x.left),min_affinity(x.right))
end
function min_affinity(x::EmptyEdge)
	1f0
end
function min_affinity(x::MergeEdge)
	1f0
end
function min_affinity(x::AtomicEdge)
	x.min_affinity
end
function min_affinity(x::ReverseEdge)
	min_affinity(reverse(x))
end

function mean_affinity(x::Edge)
	sum_affinity(x)/(contact_area(x)+0.0001)
end


end
