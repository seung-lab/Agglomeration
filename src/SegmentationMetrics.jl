module SegmentationMetrics
export rand_index

function rand_index(A::Array,B::Array)
	@assert size(A)==size(B)
	na=maximum(A)
	nb=maximum(B)
	incidence_matrix=spzeros(na,nb)
	count=0
	for i in eachindex(A,B)
		if A[i]!=0 && B[i]!=0
			count+=1
			incidence_matrix[A[i],B[i]]+=1
		end
	end
	merge=[begin
		x=incidence_matrix[:,j]
		sum(x)^2-sum(x.^2) 
	end
	for j in 1:nb]|>sum

	split=[begin
		x=incidence_matrix[j,:]
		sum(x)^2-sum(x.^2) 
	end
	for j in 1:na]|>sum

	(merge/count^2,split/count^2)
end
end

