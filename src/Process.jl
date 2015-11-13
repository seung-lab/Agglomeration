module Process
using Datasets, Agglomerators, LabelData, Features

function forward(cmd_args)

  dataset = Datasets.add_dataset(:cmd,
   cmd_args["aff"], 
   cmd_args["ws"])

  rg= LabelData.atomic_region_graph(dataset.edges, :cmd)

  agg = build_agglomerator(cmd_args["agg"])
  apply_agglomeration!(rg,agg, 0.7)
end

function build_agglomerator(agg_name)

  if agg_name == "LinearAgglomerator"
    return LinearAgglomerator( Function[x->max_affinity(x[3])] , [1.0] )
  end
end

end #module









