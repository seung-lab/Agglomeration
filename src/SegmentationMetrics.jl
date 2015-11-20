__precompile__()
module SegmentationMetrics
using Agglomerator #import paths to other modules

export rand_index,nick_index
using PyCall

function __init__()
	unshift!(PyVector(pyimport("sys")["path"]),"$(dirname(@__FILE__))/../deps/seg-error")
	global segerror=pyimport("error")
end

function nick_index{T<:Unsigned}(A::Array{T},B::Array{T};kwargs...)
	#a=convert(Array{UInt},A)
	#b=convert(Array{UInt},B)
	segerror["seg_fr_variation_information"](A,B;kwargs...)
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
	reduced_incidence_matrix=incidence_matrix[:,2:end]
	nsingletons=sum(incidence_matrix[:,1])

	both=sum(reduced_incidence_matrix.^2)+nsingletons
	total_A=sum(sum(incidence_matrix,2).^2)
	total_B=sum(sum(reduced_incidence_matrix,1).^2)+nsingletons
	(:recall=> both/total_A,:precision=>both/total_B)
end

# x=rand(1:100,(30,30))
# y=rand(1:100,(30,30))
# println(nick_index(x,y,merge_err=true,split_err=true))

end
