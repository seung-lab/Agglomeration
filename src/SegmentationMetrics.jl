module SegmentationMetrics
export rand_index

function rand_index(A::Array,B::Array)
	B=B+1
	#A is ground truth
	@assert size(A)==size(B)
	na=maximum(A)
	nb=maximum(B)
	incidence_matrix=spzeros(na,nb)
	for i in eachindex(A,B)
		if A[i]!=0
			incidence_matrix[A[i],B[i]]+=1
		end
	end

	both=sum(incidence_matrix.^2)
	total_A=sum(sum(incidence_matrix,2).^2)
	total_B=sum(sum(incidence_matrix,1).^2)
	(:recall=> both/total_A,:precision=>both/total_B)
end
end

