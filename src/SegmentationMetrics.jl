module SegmentationMetrics
export rand_index,nick_index
using PyCall

unshift!(PyVector(pyimport("sys")["path"]),"$(Base.source_dir())/../deps/seg-error")
@pyimport error as segerror

function nick_index(A::Array,B::Array;kwargs...)
	a=convert(Array{UInt},A)
	b=convert(Array{UInt},B)
	segerror.seg_rand_error(a,b;kwargs...)
end

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
x=rand(1:100,(30,30))
y=rand(1:100,(30,30))
println(nick_index(x,y,merge_err=true,split_err=true))
end
