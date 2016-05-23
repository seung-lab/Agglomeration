module Process
using Agglomeration
using RegionGraphs
using Agglomerators
using MSTs

function forward{T,S}(affinities::Array{T,4}, watershed::Array{S,3}; agglomerator=Agglomerators.MeanAffinityAgglomerator(), threshold=0.1)
	rg, vertices, edges = compute_regiongraph(watershed, affinities)
	apply_agglomeration!(rg, agglomerator, threshold)
	mst = MSTs.MST(rg,agglomerator)
	N=length(mst.dendValues)
	dend = zeros(UInt32, N,2)
	for i in 1:N
		dend[i,:]=mst.dend[i]
	end
	dend[:,1], dend[:,2] = dend[:,2], dend[:,1]
	dendValues = mst.dendValues

	return (dend, dendValues)
end

end #module
