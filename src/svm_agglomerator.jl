using LIBSVM

type SVMAgglomerator <: Agglomerator
	features::Array{Function,1}
	model
end
function SVMAgglomerator(features)
	SVMAgglomerator(features,nothing)
end

function train!(agg::SVMAgglomerator,examples::Array{Tuple{Region,Region,Edge},1},goal)
	features=Float64[f(head,tail,edge) for f in agg.features, (head,tail,edge) in examples]
	labels=Float64[goal(head,tail,edge) for (head,tail,edge) in examples]
	agg.model=svmtrain(labels,features)
end
function call(agg::SVMAgglomerator, head::Region, tail::Region, edge::Edge)
	feature_vec = Float64[f(head,tail,edge) for f in agg.features]
	(predicted_labels, decision_values) = svmpredict(model, reshape(feature_vec,(length(feature_vec),1)))
	return decision_values[1]
end
