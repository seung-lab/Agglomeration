using DataStructures
using Iterators

#In this training procedure, we restrict training so that for each region,
#we train only the top k correct merges involving this region.
function experimental_train!(ag,examples,goal; k=5,its=2,pos_threshold=0.8,neg_threshold=0.2)
	positive_examples=filter(x->goal(x)>=pos_threshold,examples)
	negative_examples=filter(x->goal(x)<neg_threshold,examples)
	println("$(length(positive_examples)) positive examples")
	train!(ag,examples,goal)
	for it in 1:its
		d=DefaultDict(Any,Any,()->[])
		for example in positive_examples
			push!(d[example[1]],example)
			push!(d[example[2]],example)
		end
		restricted_positive_examples=[]
		for (key,value) in d
			#print("$(length(value)) ")
			candidates=sort(value,by=(x->ag(x)),rev=true)
			for x in take(candidates,k)
				push!(restricted_positive_examples,x)
			end
		end
		println("$(length(restricted_positive_examples)) restricted positive examples")
		train!(ag,cat(1,negative_examples,restricted_positive_examples),goal)
	end
end
