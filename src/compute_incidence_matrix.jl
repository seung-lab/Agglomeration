function incidence_matrix{S<:Integer,T<:Integer}(l1::Array{S}, l2::Array{T})
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
