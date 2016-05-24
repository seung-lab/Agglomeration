module Process
using Agglomeration
using RegionGraphs
using Agglomerators
using SegmentationMetrics
using MSTs

function forward{T,S}(affinities::Array{T,4}, machine_labels::Array{S,3}; agglomerator=Agglomerators.MeanAffinityAgglomerator(), threshold=0.1, human_labels=nothing)
	rg, vertices, edges = compute_regiongraph(machine_labels, affinities)

	if human_labels != nothing
	 	incidence = SegmentationMetrics.incidence_matrix(machine_labels, human_labels)
		normalized_soft_label, soft_label = SegmentationMetrics.soft_label_factory(incidence)
		errors=[]
		apply_agglomeration!(rg, agglomerator, threshold; error_fun = (() -> push!(errors,SegmentationMetrics.rand_index(rg, soft_label))))
		for e in errors
			println(e)
		end
	else
		apply_agglomeration!(rg, agglomerator, threshold)
	end
	mst = MSTs.MST(rg,agglomerator)
	N=length(mst.dendValues)
	dend = zeros(UInt32, N,2)
	for i in 1:N
		dend[i,:]=mst.dend[i]
	end
	dend[:,1], dend[:,2] = dend[:,2], dend[:,1]
	dendValues = mst.dendValues

	if human_labels == nothing
		return (dend, dendValues)
	else
		return (dend, dendValues, errors)
	end
end

end #module
