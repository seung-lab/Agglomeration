module Process
using Datasets, Agglomerators, LabelData, Features, MST


function forward(cmd_args)

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

end #module









