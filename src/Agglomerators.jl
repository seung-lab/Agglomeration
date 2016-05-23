if VERSION < v"0.5.0-dev"
	__precompile__()
end
module Agglomerators
using Agglomeration

using RegionGraphs
using Features
using Base.Collections
using DataStructures
using Iterators
abstract Agglomerator
import Base: call
export apply_agglomeration!, apply_deagglomeration!, apply_batched_agglomeration!,  constrained_mean_aff_agglomerator
export Agglomerator, LinearAgglomerator, AccumulatingAgglomerator, RandomForestAgglomerator, ConstrainedAgglomerator, SVMAgglomerator
export train!

###Agglomerator Types###
type LinearAgglomerator{T} <: Agglomerator
	features::Array{Function,1}
	coefficients::Array{T,1}
end
type AccumulatingAgglomerator{T<:Agglomerator} <: Agglomerator
	agg::T
	examples::Array{Tuple{Region, Region, Edge},1}
end
function AccumulatingAgglomerator(agg::Agglomerator)
	AccumulatingAgglomerator(agg,Tuple{Region,Region,Edge}[])
end
type ConstrainedAgglomerator <: Agglomerator
	constraintrg::RegionGraph
	agg
end
immutable MeanAffinityAgglomerator <: Agglomerator
end
immutable MaxAffinityAgglomerator <: Agglomerator
end

include("forest_agglomerator.jl")
#include("svm_agglomerator.jl")

###Agglomerator calls###
for T in subtypes(Agglomerator)
	eval(quote
		function call(agg::$T, r::TreeRegion)
			agg(r.left, r.right, r.edge)
		end

		function call(agg::$T, r::AtomicRegion)
			1.0
		end
	end)
end

function call(agg::LinearAgglomerator, head::Region, tail::Region, edge::Edge)
	sum([agg.features[i](head, tail, edge)*agg.coefficients[i] for i in 1:length(agg.features)])
end
function call(agg::AccumulatingAgglomerator, head::Region, tail::Region, edge::Edge)
	push!(agg.examples,(head,tail,edge))
	agg.agg(head,tail,edge)
end
function independent(rg, s)
	for u in s
		for (v, edge) in rg[u]
			if v in s
				return false
			end
		end
	end
	return true
end
function call(agg::ConstrainedAgglomerator,head, tail, edge)
	if !(independent(agg.constraintrg, Set(chain(atomic_regions(head), atomic_regions(tail)))))
		return 0.0
	else
		agg.agg(head,tail,edge)
	end
end
function call(agg::MeanAffinityAgglomerator, head, tail, edge)
	return mean_affinity(edge)
end
function call(agg::MaxAffinityAgglomerator, head, tail, edge)
	return max_affinity(edge)
end


include("agglomeration_ops.jl")

end
