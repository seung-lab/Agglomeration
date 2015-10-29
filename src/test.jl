using SNEMI3D
using Agglomerators
using Features
using Volumes
using SegmentationMetrics

#Define a decision tree agglomerator and a linear classifier
decision_ag=DecisionTreeAgglomerator(
Function[x->max_affinity(x[3]),
x->measure(x[1])+measure(x[2]),
x->measure(x[1]),
x->measure(x[2]),
x->contact_area(x[3]),
x->mean_affinity(x[3])
]
)

linear_ag=LinearAgglomerator(
Function[x->max_affinity(x[3])
],
[1.0]
)

#Define an oracle agglomerator which will also accumulate
#a list of all examples it has seen
oracle=AccumulatingAgglomerator(OracleAgglomerator())

function print_error(rg)
	rand_index(volume(collect(keys(rg))[1]).human_labels, rg|> Agglomerators.flatten) |> println
end

#initialize an oversegmentation of the SNEMI3D volume
rg=atomic_region_graph(SNEMI3DTrainVolume)
print_error(rg)
#apply the oracle agglomerator with threshold of 0.7
apply_agglomeration!(rg,oracle,0.75)
print_error(rg)

#oracle.examples now contains all examples that the oracle
#saw during agglomeration.
println("$(length(oracle.examples)) training examples")

#train the decision tree agglomerator on the set of examples
train!(decision_ag,oracle.examples)

#Run the decision tree agglomerator on a new volume.
ag=decision_ag
rg=atomic_region_graph(SNEMI3DTestVolume)
print_error(rg)
for threshold in reverse(0.3:0.05:0.8)
	apply_agglomeration!(rg,ag,threshold)
	print_error(rg)
end
