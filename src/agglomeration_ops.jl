###Agglomeration Application###

function apply_deagglomeration!(rg, deag; threshold = 0.01, subset = keys(rg))
	split_queue=Region[]
	for i in filter(x->deag(x)<threshold, subset)
		push!(split_queue, i)
	end

	while !isempty(split_queue)
		x=pop!(split_queue)
		split!(rg, x)
		if deag(x.left) < threshold
			push!(split_queue, x.left)
		end
		if deag(x.right) < threshold
			push!(split_queue, x.right)
		end
	end
end

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

#=
function apply_batched_agglomeration!{T}(rg::RegionGraph, ag; thresholds::FloatRange{T}=0.99:0.01:0.5, error_fun=()->nothing, report_freq=100)
	pq=PriorityQueue(Tuple{Region,Region,Edge}, T, Base.Order.Reverse)

	for u in keys(rg)
		for (v,edge) in rg[u]
			begin
				score = ag(u,v,edge)
				if score > thresholds[end]
					Collections.enqueue!(pq,(u,v,edge),score)
				end
			end
		end
	end

	n=0
	for threshold in thresholds
		staging=Tuple{Region,Region}[]
		while(!isempty(pq) && peek(pq)[2] > threshold)
			(u,v), priority = dequeue2!(pq)
			ru = root(u)
			rv = root(v)
			if ru != rv
				n+=1
				if n%report_freq == 0
					print("\rmerge $(n), $(priority)")
					#error_fun()
				end
				uv = merge!(rg, ru, rv)

				#add all neighbours of new region to the queue
				for (nb, edge) in rg[uv]
					push!(staging,(uv,nb))
				end
			end
		end
		for s in staging
			u,v = root(s[1]),root(s[2])
			if u != v
				edge = rg[u][v]
				#if !haskey(pq,(u,v,edge))
					score = ag(u,v,rg[u][v])
					if score > thresholds[end]
						pq[(u,v,edge)]=score
					end
				#end
			end
		end
	end
end
=#

function apply_agglomeration!{T}(rg::RegionGraph, ag, threshold::T, subset::Set)
	pq=PriorityQueue(Tuple{Region,Region,Edge}, T, Base.Order.Reverse)
	for u in subset
		@assert haskey(rg, u)
	end

	#place all edges of the regiongraph in the queue
	for u in subset
		for v in filter(x->x in subset, keys(rg[u]))
			score = ag(u,v,rg[u][v])
			if score > threshold
				Collections.enqueue!(pq,(u,v,rg[u][v]),score)
			end
		end
	end

	while(!isempty(pq))
		(u,v), priority = dequeue2!(pq)
		if u in subset && v in subset
			@assert haskey(rg,u)
			@assert haskey(rg,v)
			@assert haskey(rg[u],v)
			@assert haskey(rg[v],u)
			uv = merge!(rg, u, v)
			delete!(subset, u)
			delete!(subset, v)
			push!(subset, uv)

			#add all neighbours of new region to the queue
			for (nb, edge) in rg[uv]
				if nb in subset
					score = ag(uv, nb, edge)
					if score > threshold
						Collections.enqueue!(pq,(uv,nb,edge),score)
					end
				end
			end
		end
	end
	return rg
end
function apply_agglomeration!{T}(rg::RegionGraph, ag, threshold::T; report_freq=100, error_fun=()->nothing)
	pq=PriorityQueue(Tuple{Region,Region,Edge}, T, Base.Order.Reverse)

	#place all edges of the regiongraph in the queue
	for u in keys(rg)
		for (v,edge) in rg[u]
			score = ag(u,v,edge)
			if score > threshold
				Collections.enqueue!(pq,(u,v,edge),score)
			end
		end
	end

	n=0
	while(!isempty(pq))
		(u,v), priority = dequeue2!(pq)
		if haskey(rg, u) && haskey(rg, v)
			n+=1
			if n%report_freq == 0
				print("\rmerge $(n), $(priority)")
				error_fun()
			end
			uv = merge!(rg, u, v)

			#add all neighbours of new region to the queue
			for (nb, edge) in rg[uv]
				score = ag(uv, nb, edge)
				if score > threshold
					Collections.enqueue!(pq,(uv,nb, edge),score)
				end
			end
		end
	end
	println()
	println("Merged to $(length(keys(rg))) regions")
	return rg
end

function top_neighbours(rg::RegionGraph, u; ag=MEAN_AFF_AGGLOMERATOR)
	pq=PriorityQueue(Tuple{Region,Region,Edge}, Real, Base.Order.Reverse)
	println("Evaluating $(length(collect(keys(rg[u])))) neighbours...")
	for (v,edge) in rg[u]
		score = ag(u,v,edge)
		Collections.enqueue!(pq,(u,v,edge),score)
	end
	return pq
end
