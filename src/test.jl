using SNEMI3D
using Agglomerators
using Features
using Volumes
using SegmentationMetrics

#Define a decision tree agglomerator and a linear classifier
decision_ag=DecisionTreeAgglomerator(
Function[x->max_affinity(x[3]),
x->measure(x[1])+measure(x[2]),
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

#initialize an oversegmentation of the SNEMI3D volume
rg=atomic_region_graph(SNEMI3DVolume)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
#apply the oracle agglomerator with threshold of 0.7
apply_agglomeration!(rg,oracle,0.7)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println

#oracle.examples now contains all examples that the oracle
#saw during agglomeration.
println(length(oracle.examples))

#train the decision tree agglomerator on the set of examples
train!(decision_ag,oracle.examples)

#Run the decision tree agglomerator on a new volume.
ag=decision_ag
rg=atomic_region_graph(SNEMI3DVolume)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
apply_agglomeration!(rg,ag,0.8)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
apply_agglomeration!(rg,ag,0.5)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
apply_agglomeration!(rg,ag,0.0)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
