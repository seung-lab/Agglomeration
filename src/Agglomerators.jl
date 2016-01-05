#=
Module Agglomerators

All agglomerator has a array of functions
and a model that relates this array with and score
The score is used to decide what to agglomerate
=#
__precompile__()
module Agglomerators
using Agglomerator #import paths to other modules


using DataStructures, Base.Collections, Iterators, MyDecisionTree
using Datasets, LabelData

export LinearAgglomerator,
AccumulatingAgglomerator, 
DecisionTreeAgglomerator, 
RandomForestAgglomerator,
OracleAgglomerator
export atomic_region_graph, apply_agglomeration!
export train!

#Same as deque but returns the priority value and not only the dequed element 
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
	params
end
function DecisionTreeAgglomerator(features;info_threshold=0.2)
	DecisionTreeAgglomerator(features,nothing,Dict(:info_threshold=>info_threshold))
end

type RandomForestAgglomerator <: Agglomerator
	features::Array{Function,1}
	model
	params
end
function RandomForestAgglomerator(features;nfeatures=3,ntrees=10,fsample=0.6,info_threshold=50)
	RandomForestAgglomerator(features,nothing,Dict(:nfeatures=>nfeatures,:ntrees=>ntrees,
	:fsample=>fsample,:info_threshold=>info_threshold))
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

typealias region_region_edge{name} Tuple{ LabelData.Region{name}, LabelData.Region{name}, LabelData.Edge{name}}

function call{name}(ag::OracleAgglomerator, x::region_region_edge{name})
	vecdot(Datasets.normalized_soft_label(x[1]), Datasets.normalized_soft_label(x[2]))
end

function call{name}(ag::LinearAgglomerator,x::Tuple{ LabelData.Region{name}, LabelData.Region{name}, LabelData.Edge{name}})
	sum([ag.features[i](x)*ag.coefficients[i] for i in 1:length(ag.features)])
end
function call{name}(ag::AccumulatingAgglomerator,x::region_region_edge{name})
	push!(ag.examples,x)
	ag.ag(x)
end
function call{name}(ag::RandomForestAgglomerator,x::region_region_edge{name})
	apply_forest(ag.model, [f(x) for f in ag.features])
end

function train!(ag::RandomForestAgglomerator,examples,goal)
	features=Float64[f(e) for e in examples, f in ag.features]
	labels=map(goal,examples)::Array{Float64,1}
	ag.model=build_forest(labels,features;
	nsubfeatures=ag.params[:nfeatures],
	ntrees=ag.params[:ntrees],
	partialsampling=ag.params[:fsample])
end
function call{name}(ag::DecisionTreeAgglomerator,x::region_region_edge{name})
	apply_tree(ag.model, [f(x) for f in ag.features])
end

function train!(ag::DecisionTreeAgglomerator,examples,goal)
	features=Float64[f(e) for e in examples, f in ag.features]
	labels=map(goal,examples)::Array{Float64,1}
	ag.model=build_tree(labels,features; info_threshold=ag.params[:info_threshold])
	print_tree(ag.model)
end
function train!(ag::AccumulatingAgglomerator,examples,goal)
	train!(ag.ag,examples,goal)
end
function train!(ag::Agglomerator,examples)
	train!(ag,examples,OracleAgglomerator())
end

function populate_priority_queue{name}(rg::LabelData.RegionGraph{name}, ag::Agglomerator, threshold::Real)
	
	rre_list =chain([[(r1,r2,edge) for (r2,edge) in tails] for (r1,tails) in rg]...)

	pq=PriorityQueue(region_region_edge, Real, Base.Order.Reverse)
	for rre in rre_list
		
		score=ag(rre)
		if score > threshold
			Collections.enqueue!(pq,rre,score)
		end

	end

	return pq
end

function merge_regions{name}(r1::LabelData.Region{name}, r2::LabelData.Region{name} , edge:: LabelData.Edge{name}, rg::LabelData.RegionGraph{name}, priority::Real)

	nbs1=to_default_dict( rg[r1] )
	nbs2=to_default_dict( rg[r2] )

	#Delete the edges connecting these two regions
	delete!(nbs1,r2)
	delete!(nbs2,r1)

	#Create a set with all neighboors regions of this two regions
	all_nbs=Set(chain(keys(nbs1),keys(nbs2)))

	merged_region = LabelData.TreeRegion(r1, r2 , edge, priority)

	#create merged_region key with default value
	rg[merged_region] = Dict{LabelData.Region, LabelData.Edge}()

	#Remove old regions
	delete!(rg,r1)
	delete!(rg,r2)

	return all_nbs , nbs1 , nbs2 , merged_region
end

function update_neighboor_edge( neighboor , r1, nbs1, r2 , nbs2 , merged_region, rg )

	neighboor_edge = LabelData.TreeEdge(nbs1[neighboor], nbs2[neighboor])
	rg[merged_region][neighboor]= neighboor_edge
	rg[neighboor][merged_region]= neighboor_edge

	#Remove the old edges from the RegionGraph
	#The one from the neighboors regions to the two regions being merged
	delete!(rg[neighboor], r1)
	delete!(rg[neighboor], r2)

	return neighboor_edge
end


function apply_agglomeration!{name}(rg::LabelData.RegionGraph{name}, ag::Agglomerator, threshold::Real)

	pq = populate_priority_queue(rg, ag, threshold)

	while(!isempty(pq))
		rre, priority = dequeue2!(pq)
		r1 , r2, edge = rre

		if haskey(rg, r1) && haskey(rg, r2)

      all_nbs , nbs1 , nbs2 , merged_region = merge_regions(r1, r2, edge ,  rg , priority)


      #we iterate throu all the neighboors of both regions and create a TreeEdge.
      #If one region is not a neighboor of the two regions being merged, and EmptyEdge is created
			for neighboor in all_nbs

				neighboor_edge = update_neighboor_edge( neighboor ,r1 , nbs1, r2, nbs2 , merged_region, rg )

				score = ag((merged_region, neighboor, neighboor_edge))
				if score > threshold
					Collections.enqueue!(pq,(merged_region, neighboor, neighboor_edge),score)
				end
			end

		end

	end
	println("Merged to $(length(keys(rg))) regions")
	#println(sum([n_svoxels(x) for x in keys(rg)]))
	return rg
end


#converts a Dict{Region{name},Edge{name}} into a default dict,
#if the key is not in the dictionary it returns a default value "()->EmptyEdge{name}()"
function to_default_dict{name}(neighboors::Dict{ LabelData.Region{name}, LabelData.Edge{name}})
	default_dict=DefaultDict(LabelData.Region{name}, LabelData.Edge{name},()->LabelData.EmptyEdge{name}())

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
