using DecisionTrees

type RandomForestAgglomerator <: Agglomerator
	features::Array{Function,1}
	model
end
function RandomForestAgglomerator(features)
	RandomForestAgglomerator(features,nothing)
end
function call(agg::RandomForestAgglomerator,head::Region, tail::Region, edge::Edge)
	apply_forest(agg.model, Float64[f(head,tail,edge) for f in agg.features])
end
function train!(agg::RandomForestAgglomerator,examples::Array{Tuple{Region,Region,Edge},1},goal; nsubfeatures=length(agg.features)/2, ntrees=10, partialsampling=0.5,info_threshold=50.0)
	features=Float64[f(head,tail,edge) for (head,tail,edge) in examples, f in agg.features]
	labels=Float64[goal(head,tail,edge) for (head,tail,edge) in examples]
	agg.model=build_forest(labels,features; nsubfeatures=nsubfeatures, ntrees=ntrees, partialsampling=partialsampling, info_threshold=info_threshold)
end
