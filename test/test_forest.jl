using Agglomerator
using TestUtils, LabelData, SNEMI3D, Agglomerators, Features
rg=LabelData.atomic_region_graph(SNEMI3D.Train.edges, :SNEMI3DTrain)
oracle=AccumulatingAgglomerator(OracleAgglomerator())
apply_agglomeration!(rg,oracle,0.5)


ag=RandomForestAgglomerator(
Function[
#x->max_affinity(x[3]),
x->mean_affinity(x[3]),
x->measure(x[1])+measure(x[2]),
x->min(measure(x[1]),measure(x[2])),
x->max(measure(x[1]),measure(x[2])),
x->contact_area(x[3]),
];
info_threshold=35.0,
nfeatures=3,
fsample=0.8,
ntrees=50
)

train!(ag, oracle.examples, OracleAgglomerator())
run_test(ag,"forest")


