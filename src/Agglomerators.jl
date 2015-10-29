module Agglomerators
using DataStructures
using Base.Collections
using Volumes
using Iterators
using DecisionTree

export Agglomerator, LinearAgglomerator, AccumulatingAgglomerator, DecisionTreeAgglomerator, OracleAgglomerator
export atomic_region_graph, RegionGraph,apply_agglomeration!
export train!

abstract Agglomerator

type LinearAgglomerator <: Agglomerator
	features::Array{Function,1}
	coefficients::Array{Real,1}
end
type DecisionTreeAgglomerator <: Agglomerator
	features::Array{Function,1}
	model
	function DecisionTreeAgglomerator(features)
		new(features,Void)
	end
end

type AccumulatingAgglomerator <: Agglomerator
	ag::Agglomerator
	examples
	function AccumulatingAgglomerator(ag)
		new(ag,[])
	end
end
type OracleAgglomerator <: Agglomerator
end

function call{vol}(ag::OracleAgglomerator,x::Tuple{Region{vol},Region{vol},Edge{vol}})
	vecdot(normalized_soft_label(x[1]),normalized_soft_label(x[2]))
end

function call{vol}(ag::LinearAgglomerator,x::Tuple{Region{vol},Region{vol},Edge{vol}})
	sum([ag.features[i](x)*ag.coefficients[i] for i in 1:length(ag.features)])
end
function call{vol}(ag::AccumulatingAgglomerator,x::Tuple{Region{vol},Region{vol},Edge{vol}})
	push!(ag.examples,x)
	ag.ag(x)
end
function call{vol}(ag::DecisionTreeAgglomerator,x::Tuple{Region{vol},Region{vol},Edge{vol}})
	apply_forest(ag.model, [f(x) for f in ag.features])
end

function train!(ag::DecisionTreeAgglomerator,examples,goal)
	features=Float64[f(e) for e in examples, f in ag.features]
	labels=map(goal,examples)::Array{Float64,1}
	ag.model=build_forest(labels,features,2,10,0.5)
end
function train!(ag::AccumulatingAgglomerator,examples,goal)
	train!(ag.ag,examples,goal)
end
function train!(ag::Agglomerator,examples)
	train!(ag,examples,OracleAgglomerator())
end

#=
n_svoxels(r::AtomicRegion)=1
n_svoxels(r::TreeRegion)=n_svoxels(r.right)+n_svoxels(r.left)
=#

typealias RegionGraph{vol} DefaultDict{Region{vol},Dict{Region{vol},Edge{vol}}}
function atomic_region_graph{vol}(v::Volume{vol})
	rg=DefaultDict(Region{vol},Dict{Region{vol},Edge{vol}},()->Dict{Region{vol},Edge{vol}}())
	for e in edges(v)
		rg[e.head][e.tail]=e
	end
	rg
end

function flatten{vol}(rg::RegionGraph{vol})
	v=volume(first(keys(rg)))
	A=zeros(Int,size(v))
	function f(x::AtomicRegion,i)
		for v in x.voxels
			A[v[1],v[2],v[3]]=i
		end
	end
	function f(x::TreeRegion,i)
		f(x.left,i)
		f(x.right,i)
	end
	#todo: change to a linear pass over A
	for (r,i) in zip(keys(rg),countfrom(1))
		f(r,i)
	end
	A
end

function apply_agglomeration!{vol}(A::RegionGraph{vol},ag::Agglomerator, threshold)
	#println(sum([n_svoxels(x) for x in keys(A)]))
	edges=chain([[(r1,r2,edge) for (r2,edge) in tails] for (r1,tails) in A]...)
	pq=PriorityQueue(Tuple{Region{vol},Region{vol},Edge{vol}},Real,Base.Order.Reverse)
	for e in edges
		Collections.enqueue!(pq,e,ag(e))
	end
	while(!isempty(pq)>0)
		e=Collections.dequeue!(pq)
		if haskey(A, e[1]) && haskey(A,e[2])

			orignbs1=A[e[1]]
			orignbs2=A[e[2]]

			nbs1=DefaultDict(Region{vol},Edge{vol},()->EmptyEdge{vol}())
			nbs2=DefaultDict(Region{vol},Edge{vol},()->EmptyEdge{vol}())

			for r in keys(orignbs1)
				nbs1[r]=orignbs1[r]
			end
			for r in keys(orignbs2)
				nbs2[r]=orignbs2[r]
			end

			delete!(nbs1,e[2])
			delete!(nbs2,e[1])
			
			all_nbs=Set(chain(keys(nbs1),keys(nbs2)))
			#println(length(all_nbs))

			new_region=TreeRegion(e[1],e[2])
			A[new_region]
			for r in all_nbs
				new_edge=TreeEdge(nbs1[r],nbs2[r])
				A[new_region][r]=new_edge
				A[r][new_region]=new_edge
				
				delete!(A[r],e[1])
				delete!(A[r],e[2])

				tmp=ag((new_region,r,new_edge))
				if tmp > threshold
					Collections.enqueue!(pq,(new_region,r,new_edge),tmp)
				end
			end
			delete!(A,e[1])
			delete!(A,e[2])
		end
	end
	println("Merged to $(length(keys(A))) regions")
	A
	#println(sum([n_svoxels(x) for x in keys(A)]))
end


end
