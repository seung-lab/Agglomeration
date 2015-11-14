using Agglomerator
using Base.Test
using MST

# write your own tests here
using SNEMI3D
using Agglomerators, Features, Datasets

#Define a decision tree agglomerator and a linear classifier
decision_ag=DecisionTreeAgglomerator(
Function[ x->max_affinity(x[3]),
          x->measure(x[1])+measure(x[2]),
          x->min(measure(x[1]),measure(x[2])),
          x->max(measure(x[1]),measure(x[2])),
          x->contact_area(x[3]),
          x->mean_affinity(x[3])
        ])

#Define an oracle agglomerator which will also accumulate
#a list of all examples it has seen
oracle=AccumulatingAgglomerator(OracleAgglomerator())

#initialize an oversegmentation of the SNEMI3D volume
rg= LabelData.atomic_region_graph(SNEMI3D.Train.edges, :SNEMI3DTrain)
Datasets.compute_error(rg)|>println

# #apply the oracle agglomerator with a given threshold
apply_agglomeration!(rg,oracle,0.5)
Datasets.compute_error(rg)|>println

mst= MST.build_mst(rg)
MST.saveBinary(mst)

# #oracle.examples now contains all examples that the oracle
# #saw during agglomeration.

# println("$(length(oracle.examples)) training examples")

# include("../src/curriculum.jl")
# #train the decision tree agglomerator on the set of examples
# train!(decision_ag, oracle.examples ,OracleAgglomerator())


# #Run the decision tree agglomerator on a new volume.
# ag=decision_ag
# rg=LabelData.atomic_region_graph(SNEMI3D.Test.edges, :SNEMI3DTest)
# println(length(keys(rg)))
# Datasets.print_error(rg)
# for threshold in reverse(0.0:0.05:0.7)
#   apply_agglomeration!(rg,ag,threshold)
#   Datasets.print_error(rg)
# end
# mst=MST.build_mst(rg,SNEMI3D.Test)
# MST.save(mst)

