using Agglomerator
using Base.Test
using MST

# write your own tests here
using SNEMI3D, Agglomerators, Features, Volumes, SegmentationMetrics, Vis

#Define a decision tree agglomerator and a linear classifier
decision_ag=DecisionTreeAgglomerator(
Function[x->max_affinity(x[3]),
x->measure(x[1])+measure(x[2]),
x->min(measure(x[1]),measure(x[2])),
x->max(measure(x[1]),measure(x[2])),
x->contact_area(x[3]),
x->mean_affinity(x[3])
]
)

#=
linear_ag=LinearAgglomerator(
Function[x->max_affinity(x[3])
],
[1.0]
)
=#

#Define an oracle agglomerator which will also accumulate
#a list of all examples it has seen
oracle=AccumulatingAgglomerator(OracleAgglomerator())

function print_error(rg)
	ground_truth=convert(Array{UInt},volume(collect(keys(rg))[1]).human_labels)
	prediction=convert(Array{UInt},rg|> Volumes.flatten)
	SegmentationMetrics.segerror.seg_fr_variation_information(ground_truth,prediction;merge_error=true,split_error=true)|>println
end

#initialize an oversegmentation of the SNEMI3D volume
rg=atomic_region_graph(SNEMI3DTrainVolume)
print_error(rg)
#apply the oracle agglomerator with a given threshold
apply_agglomeration!(rg,oracle,0.5)
print_error(rg)

#oracle.examples now contains all examples that the oracle
#saw during agglomeration.

println("$(length(oracle.examples)) training examples")

#include("../src/curriculum.jl")
#train the decision tree agglomerator on the set of examples
train!(decision_ag, oracle.examples ,OracleAgglomerator())


#Run the decision tree agglomerator on a new volume.
ag=decision_ag
rg=atomic_region_graph(SNEMI3DTestVolume)
println(length(keys(rg)))
print_error(rg)
for threshold in reverse(0.0:0.05:0.7)
  apply_agglomeration!(rg,ag,threshold)
  print_error(rg)
end
mst=MST.build_mst(rg,SNEMI3DTestVolume)
MST.save(mst)

