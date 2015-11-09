#=
Module Agglomerators

All agglomerator has a array of functions
and a model that relates this array with and score
The score is used to decide what to agglomerate
=#
module Agglomerators
using Agglomerator #import paths to other modules


using Volumes, MST
using DataStructures, Base.Collections, Iterators, DecisionTree, Volumes

export LinearAgglomerator,
AccumulatingAgglomerator, 
DecisionTreeAgglomerator, 
OracleAgglomerator
export atomic_region_graph, apply_agglomeration!
export train!

#Util
function dequeue2!(pq::PriorityQueue)
	x = pq.xs[1]
	y = pop!(pq.xs)
	if !isempty(pq)
		pq.xs[1] = y
		pq.index[y.first] = 1
		Collections.percolate_down!(pq, 1)
	end
	delete!(pq.index, x.first)
	return x
end

abstract Agglomerator

type LinearAgglomerator <: Agglomerator
	features::Array{Function,1}
	coefficients::Array{Real,1}
end
type DecisionTreeAgglomerator <: Agglomerator
	features::Array{Function,1}
	model
	function DecisionTreeAgglomerator(features)
		new(features,nothing)
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
	ag.model=build_forest(labels,features,2,5,0.5)
end
function train!(ag::AccumulatingAgglomerator,examples,goal)
	train!(ag.ag,examples,goal)
end
function train!(ag::Agglomerator,examples)
	train!(ag,examples,OracleAgglomerator())
end

#n_svoxels(r::AtomicRegion)=1
#n_svoxels(r::TreeRegion)=n_svoxels(r.right)+n_svoxels(r.left)

function apply_agglomeration!{vol}(A::RegionGraph{vol},ag::Agglomerator, threshold)
	#println(sum([n_svoxels(x) for x in keys(A)]))
	edges=chain([[(r1,r2,edge) for (r2,edge) in tails] for (r1,tails) in A]...)
	pq=PriorityQueue(Tuple{Region{vol},Region{vol},Edge{vol}},Real,Base.Order.Reverse)
	for e in edges
		tmp=ag(e)
		if tmp > threshold
			Collections.enqueue!(pq,e,tmp)
		end
	end

	#mst = MST.newMST()
	ignore = 0
	while(!isempty(pq))
		e, priority = dequeue2!(pq)

		if haskey(A, e[1]) && haskey(A,e[2])

			nbs1=to_default_dict( A[e[1]] )
			nbs2=to_default_dict( A[e[2]] )


			#Delete the edges connecting these two regions
			delete!(nbs1,e[2])
			delete!(nbs2,e[1])

			#Create a set with all neighboors regions of this two regions
			all_nbs=Set(chain(keys(nbs1),keys(nbs2)))
			#println(length(all_nbs))

			new_region=TreeRegion(e[1],e[2],e[3], priority)

			#MST.add_edge(mst, new_region, e[3])
			#Adds new_region key with default value
			A[new_region]

			for r in all_nbs
				new_edge=TreeEdge(nbs1[r],nbs2[r])
				A[new_region][r]=new_edge
				A[r][new_region]=new_edge

				#Remove the old regions from the RegionGraph
				delete!(A[r],e[1])
				delete!(A[r],e[2])

				tmp=ag((new_region,r,new_edge))
				if tmp > threshold
					Collections.enqueue!(pq,(new_region,r,new_edge),tmp)
				end
			end
			delete!(A,e[1])
			delete!(A,e[2])
		else
			ignore = ignore + 1
		end

	end
	println("Merged to $(length(keys(A))) regions")
	println("Ignored $ignore edges")
	#MST.save(mst)
	#println(sum([n_svoxels(x) for x in keys(A)]))
	return A
end


#converts a Dict{Region{vol},Edge{vol}} into a default dict,
#if the key is not in the dictionary it returns a default value "()->EmptyEdge{vol}()"
function to_default_dict{vol}(neighboors::Dict{Region{vol},Edge{vol}})


	default_dict=DefaultDict(Region{vol},Edge{vol},()->EmptyEdge{vol}())

	for r in keys(neighboors)
		default_dict[r]=neighboors[r]
	end


	# #Also remove them from the Priority Queue
	# if haskey(pq, (e[1],r,orignbs1[r])) 
	# 	Collections.dequeue!(pq, (e[1],r,orignbs1[r]) )
	# end
	# if haskey(pq, (r,e[1],orignbs1[r])) 
	# 	Collections.dequeue!(pq, (r,e[1],orignbs1[r]) )
	# end

	return default_dict
end



end
