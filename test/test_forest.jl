using Agglomeration
using Save
using Features
using Agglomerators
using RegionGraphs
include("TestUtils.jl")
using TestUtils

load_dataset("~/datasets/AC3/train/")

println("computing regiongraph...")
@time begin
	rg,vertices,edges=RegionGraphs.compute_regiongraph(machine_labels, affinities)
end

@time begin
	incidence = SegmentationMetrics.incidence_matrix(machine_labels, human_labels)
	normalized_soft_label, soft_label = SegmentationMetrics.soft_label_factory(incidence)
	raw_oracle = LinearAgglomerator(Function[(left,right,edge)->dot(normalized_soft_label(left), normalized_soft_label(right))],[1.0])
	maff = Agglomerators.MeanAffinityAgglomerator()
	oracle = AccumulatingAgglomerator(raw_oracle)
	tagg = TeacherAgglomerator(oracle,maff)
end

println("  $(length(rg)) vertices")
println("  $(sum(map(length,values(rg)))) edges")

println("agglomerating...")

@time Agglomerators.priority_apply_agglomeration2!(rg, tagg, 0.5)


agg=RandomForestAgglomerator(
Function[
(left,right,edge)->mean_affinity(edge),
(left,right,edge)->max_affinity(edge),
(left,right,edge)->contact_area(edge),
(left,right,edge)->min(volume(left), volume(right)),
(left,right,edge)->max(volume(left), volume(right)),
#(left,right,edge)->min(mean_axon(left), mean_axon(right)),
#(left,right,edge)->max(mean_axon(left), mean_axon(right)),
#(left,right,edge)->abs(mean_axon(left)-mean_axon(right))
#(left,right,edge)->mean_dendrite(left),
#(left,right,edge)->mean_dendrite(right),
]
)
println(length(oracle.examples))
addprocs(2)
@everywhere using DecisionTrees
train!(agg, oracle.examples, raw_oracle; info_threshold=10.0, nsubfeatures=3,partialsampling=0.8,ntrees=50)
map(DecisionTrees.print_tree,agg.model.trees)

raw_oracle=nothing
oracle=nothing
rg=nothing
normalized_soft_label=nothing
soft_label=nothing
tagg=nothing
gc()

load_dataset("~/datasets/AC3/test/")
for thresh in [0.01,0.1,0.2,0.3]
	run_test("forest_forced_$(thresh)", TeacherAgglomerator(agg,maff),thresh=thresh)
end
run_test("forest", agg, thresh=0.1)

save("$(dirname(@__FILE__))/forest.jls",agg.model)
