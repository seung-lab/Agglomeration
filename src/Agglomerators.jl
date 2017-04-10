module Agglomerators
using Agglomeration

using RegionGraphs
using Features
using Base.Collections
using DataStructures

PriorityQueue = Base.Collections.PriorityQueue

using Iterators
abstract Agglomerator
import Base: call
export apply_agglomeration!, apply_deagglomeration!, priority_apply_agglomeration!,  constrained_mean_aff_agglomerator
export Agglomerator, TeacherAgglomerator, LinearAgglomerator, AccumulatingAgglomerator, RandomForestAgglomerator, ConstrainedAgglomerator, SVMAgglomerator, GatedAgglomerator
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
immutable SmoothedMeanAffinityAgglomerator <: Agglomerator
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

		#This function is called to generate the priority of the merge
		#The merge priority might be different from the decision value
		function priority_call(agg::$T, u::Region, v::Region, edge::Edge)
			agg(u,v,edge)
		end
	end)
end

type TeacherAgglomerator{S<:Agglomerator,T<:Agglomerator} <: Agglomerator
	teacher::T
	student::S
end

function call(agg::TeacherAgglomerator, head::Region, tail::Region, edge::Edge)
	agg.teacher(head,tail,edge)
end

function priority_call(agg::TeacherAgglomerator, head::Region, tail::Region, edge::Edge)
	agg.student(head,tail,edge)
end

type GatedAgglomerator{T<:Agglomerator} <: Agglomerator
	gate
	agg::T
end

reject=0
accept=0
function call(agg::GatedAgglomerator, head::Region, tail::Region, edge::Edge)
	if agg.gate(head,tail,edge)
		global accept
		accept+=1
		return agg.agg(head,tail,edge)
	else
		global reject
		reject+=1
		return 0f0
	end
end

type AccumulatingGatedAgglomerator{T<:Agglomerator} <: Agglomerator
	gate
	agg::T
	rejected_examples
	accepted_examples
end

AccumulatingGatedAgglomerator(gate,agg)=AccumulatingGatedAgglomerator(gate,agg,Tuple{Region,Region,Edge}[],Tuple{Region,Region,Edge}[])

function call(agg::AccumulatingGatedAgglomerator, head::Region, tail::Region, edge::Edge)
	if agg.gate(head,tail,edge)
		push!(agg.accepted_examples,(head,tail,edge))
		return agg.agg(head,tail,edge)
	else
		push!(agg.rejected_examples,(head,tail,edge))
		return 0f0
	end
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
		return 0f0
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
function call(agg::SmoothedMeanAffinityAgglomerator, head, tail, edge)
	return smoothed_mean_affinity(edge)
end


include("agglomeration_ops.jl")

end
