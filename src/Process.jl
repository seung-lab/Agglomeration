module Process
using Datasets, Agglomerators, LabelData, Features, MST


function forward(cmd_args::Dict)

  dataset = Datasets.add_dataset(:cmd,
   cmd_args["aff"], 
   cmd_args["ws"])

  rg= LabelData.atomic_region_graph(dataset.edges, :cmd)

  agg = build_agglomerator(cmd_args["agg"])
  apply_agglomeration!(rg,agg, 0.7)

  mst= MST.build_mst(rg)

  MST.saveHDF5(mst, cmd_args["out"])
  omni_mst = abspath(string( dirname(@__FILE__) ,"/../omni/empty2.omni.files/users/_default/segmentations/segmentation1/segments/mst.data"))
  MST.saveBinary(mst, omni_mst)
end

function build_agglomerator(agg_name)

  if agg_name == "LinearAgglomerator"
    return LinearAgglomerator( Function[x->max_affinity(x[3])] , [1.0] )
  end
end

default_agg=LinearAgglomerator(
Function[
x->mean_affinity(x[3]),
],
[1.0])

function forward{T,S}(affinities::Array{T,4}, watershed::Array{S,3}; agglomerator=default_agg, threshold=0.1)
	dataset = Datasets.dataset(gensym(), affinities, watershed)
	rg= LabelData.atomic_region_graph(dataset.edges)
	apply_agglomeration!(rg, agglomerator, threshold)
	mst = MST.build_mst(rg)
	N=length(mst.dendValues)
	dend = zeros(UInt32, N,2)
	for i in 1:N
		dend[i,:]=mst.dend[i]
	end
	dendValues = mst.dendValues

	return (dend, dendValues)
end

end #module









