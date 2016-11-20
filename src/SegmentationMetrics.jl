#__precompile__()
module SegmentationMetrics

export rand_index,nick_index
using Features
using RegionGraphs
using DataStructures

function soft_label_factory{T}(incidence::AbstractArray{T,2})
	const incidence2=transpose(incidence)
	const d=Dict{Region,typeof(incidence2[:,1])}()
	function soft_label(x::AtomicRegion)
		#incidence[x.label,:]
		t=incidence2[:,x.label]
		#t=getcol(incidence2, x.label)
		#if length(nonzeros(t))==0
		#	t[1]=1 # sparse vectors have a bug with zero vectors
			#fixed in julia-0.5
		#end
		t
	end
	function soft_label(x::TreeRegion)
		if !haskey(d,x)
			d[x]=soft_label(x.left) + soft_label(x.right)
		end
		return d[x]
	end
	function normalized_soft_label(x::Region)
		t=soft_label(x)
		return (1f0/(norm(t)+1f-6))*t
	end
	return (normalized_soft_label, soft_label)
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

function rand_index(incidence_matrix)
	both=sum(incidence_matrix.^2)
	total_A=sum(sum(incidence_matrix,2).^2)
	total_B=sum(sum(incidence_matrix,1).^2)
	Dict(:recall=> both/total_A,:precision=>both/total_B)
end

function incidence_matrix{S<:Integer,T<:Integer}(machine_labels::Array{S}, human_labels::Array{T})
	incidence_dict=DefaultDict(Tuple{S,T},Int,0)
	for i in eachindex(machine_labels, human_labels)
		incidence_dict[(machine_labels[i],human_labels[i])]+=1
	end
	I=Int[]
	J=Int[]
	V=Int[]
	for ((i,j),v) in incidence_dict
		if i > 0 && j > 0
			push!(I,i)
			push!(J,j)
			push!(V,v)
		end
	end
	return sparse(I,J,V)
end

function incidence_matrix(rg::RegionGraph, soft_label)
	I=Int[]
	J=Int[]
	V=Int[]
	for (i,r) in enumerate(keys(rg))
		s=soft_label(r)
		for (j,v) in zip(s.nzind, s.nzval)
			push!(I,i)
			push!(J,j)
			push!(V,v)
		end
	end
	return sparse(I,J,V)
end

function rand_index(rg::RegionGraph, soft_label)
	rand_index(incidence_matrix(rg,soft_label))
end

# x=rand(1:100,(30,30))
# y=rand(1:100,(30,30))
# println(nick_index(x,y,merge_err=true,split_err=true))

end
