module Agglomerators
using DataStructures
using Base.Collections
using Volumes3
using Lazy
using Iterators

abstract Agglomerator

immutable RandomAgglomerator<: Agglomerator end
function call(ag::RandomAgglomerator, x)
	rand()
end
type LinearAgglomerator <: Agglomerator
	features::Array{Function,1}
	coefficients::Array{Real,1}
end
function call(ag::LinearAgglomerator,x)
	sum([ag.features[i](x)*ag.coefficients[i] for i in 1:length(ag.features)])
end

n_svoxels(r::AtomicRegion)=1
n_svoxels(r::AggregateRegion)=length(r.regions)
n_svoxels(r::TreeRegion)=n_svoxels(r.right)+n_svoxels(r.left)

type Segmentation{vol}
	adjacency_list::DefaultDict{Region{vol},Set{Region{vol}}}
end
function Segmentation{vol}(v::Volume{vol})
	adjacency_list=DefaultDict(Region{vol},Set{Region{vol}},()->Set{Region{vol}}())
	for e in edges(v)
		push!(adjacency_list[e.head], e.tail)
	end
	Segmentation{vol}(adjacency_list)
end

function apply_agglomeration{vol}(s::Segmentation{vol},ag::Agglomerator, threshold)
	edges=chain([[(r1,r2) for r2 in tails] for (r1,tails) in s.adjacency_list]...)
	pq=PriorityQueue(Tuple{Region{vol},Region{vol}},Real,Base.Order.Reverse)
	for e in edges
		Collections.enqueue!(pq,e,ag(e))
	end
	while(!isempty(pq)>0)
		e=Collections.dequeue!(pq)
		if haskey(s.adjacency_list, e[1]) && haskey(s.adjacency_list,e[2])
			println(length(s.adjacency_list))
			nbs=union(s.adjacency_list[e[1]],s.adjacency_list[e[2]])
			delete!(nbs,e[1])
			delete!(nbs,e[2])

			new_region=TreeRegion(e[1],e[2])
			s.adjacency_list[new_region]=nbs
			for r in nbs
				delete!(s.adjacency_list[r],e[1])
				delete!(s.adjacency_list[r],e[2])

				push!(s.adjacency_list[r],new_region)
				tmp=ag((new_region,r))
				if tmp > threshold
					Collections.enqueue!(pq,(new_region,r),tmp)
				end
			end
			delete!(s.adjacency_list,e[1])
			delete!(s.adjacency_list,e[2])
		end
	end
end


end
