using DataStructures

@inline unordered(x,y) = (min(x,y), max(x,y))
function compute_regiongraph{T,S}(labels::Array{T,3}, affinities::Array{S,4})
	rg = RegionGraph()
	vertices=Dict{T,AtomicRegion}()
	edges = Dict{Tuple{T,T}, AtomicEdge}()
	s0,s1,s2 = size(labels)
	for l in labels
		if l != 0
			if !haskey(vertices,l)
				vertices[l]=AtomicRegion(l)
			end
			push!(vertices[l], 1, 1, 1)
		end
	end
	for k in 2:s2,j in 2:s1,i in 2:s0
		l=labels[i,j,k]
		l1=labels[i-1,j,k]
		l2=labels[i,j-1,k]
		l3=labels[i,j,k-1]
		if l!=0
			if l != l1 && l1!=0
				if !haskey(edges, unordered(l,l1))
					edges[unordered(l,l1)]=AtomicEdge(map(x->vertices[x],unordered(l,l1)))
				end
				e=edges[unordered(l,l1)]
				push!(e, i,j,k, affinities[i,j,k,1])
			end
			if l != l2 && l2!=0
				if !haskey(edges, unordered(l,l2))
					edges[unordered(l,l2)]=AtomicEdge(map(x->vertices[x],unordered(l,l2)))
				end
				e=edges[unordered(l,l2)]
				push!(e, i,j,k, affinities[i,j,k,2])
			end
			if l != l3 && l3!=0
				if !haskey(edges, unordered(l,l3))
					edges[unordered(l,l3)]=AtomicEdge(map(x->vertices[x],unordered(l,l3)))
				end
				e=edges[unordered(l,l3)]
				push!(e, i,j,k, affinities[i,j,k,3])
			end
		end
	end
	for v in values(vertices)
		add_vertex!(rg, v)
	end
	for ((x,y),e) in edges
		add_edge!(rg, vertices[x], vertices[y], e)
	end

	return (rg, vertices, edges)
end
function compute_regiongraph{T,S}(labels::Array{T,3}, affinities::Array{S,4}, semantic::Array{S,4})
	rg = RegionGraph()
	vertices=Dict{T,AtomicRegion}()
	edges = Dict{Tuple{T,T}, AtomicEdge}()
	s0,s1,s2 = size(labels)
	for k in 1:s2, j in 1:s1, i in 1:s0
		l=labels[i,j,k]
		if l != 0
			if !haskey(vertices,l)
				vertices[l]=AtomicRegion(l)
			end
			push!(vertices[l], i, j, k,semantic[i,j,k,3],semantic[i,j,k,4],semantic[i,j,k,5])
		end
	end
	for k in 2:s2,j in 2:s1,i in 2:s0
		l=labels[i,j,k]
		l1=labels[i-1,j,k]
		l2=labels[i,j-1,k]
		l3=labels[i,j,k-1]
		if l!=0
			if l != l1 && l1!=0
				if !haskey(edges, unordered(l,l1))
					edges[unordered(l,l1)]=AtomicEdge(map(x->vertices[x],unordered(l,l1)))
				end
				e=edges[unordered(l,l1)]
				push!(e, i,j,k, affinities[i,j,k,1])
			end
			if l != l2 && l2!=0
				if !haskey(edges, unordered(l,l2))
					edges[unordered(l,l2)]=AtomicEdge(map(x->vertices[x],unordered(l,l2)))
				end
				e=edges[unordered(l,l2)]
				push!(e, i,j,k, affinities[i,j,k,2])
			end
			if l != l3 && l3!=0
				if !haskey(edges, unordered(l,l3))
					edges[unordered(l,l3)]=AtomicEdge(map(x->vertices[x],unordered(l,l3)))
				end
				e=edges[unordered(l,l3)]
				push!(e, i,j,k, affinities[i,j,k,3])
			end
		end
	end
	for v in values(vertices)
		add_vertex!(rg, v)
	end
	for ((x,y),e) in edges
		add_edge!(rg, vertices[x], vertices[y], e)
	end

	return (rg, vertices, edges)
end
