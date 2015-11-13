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

function experimental_train2!(ag,examples,goal; k=4,its=2,pos_threshold=0.8,neg_threshold=0.2)
	positive_examples=filter(x->goal(x)>=pos_threshold,examples)
	negative_examples=filter(x->goal(x)<neg_threshold,examples)
	println("$(length(positive_examples)) positive examples")
	println("$(length(negative_examples)) negative examples")
	train!(ag,examples,goal)
	
	pos=DefaultDict(Any,Any,()->[])
	neg=DefaultDict(Any,Any,()->[])
	for example in positive_examples
		push!(pos[example[1]],example)
		push!(pos[example[2]],example)
	end
	for example in negative_examples 
		push!(neg[example[1]],example)
		push!(neg[example[2]],example)
	end

	for it in 1:its
		restricted_positive_examples=[]
		restricted_negative_examples=[]
		for (key,value) in pos
			candidates=sort(value,by=(x->ag(x)),rev=true)
			for x in take(candidates,k)
				push!(restricted_positive_examples,x)
			end
		end
		for (key,value) in neg
			candidates=sort(value,by=(x->ag(x)),rev=true)
			for x in take(candidates,k)
				push!(restricted_negative_examples,x)
			end
		end
		println("$(length(restricted_positive_examples)) restricted positive examples")
		println("$(length(restricted_negative_examples)) restricted negative examples")
		train!(ag,cat(1,restricted_negative_examples,restricted_positive_examples),goal)
	end
end
