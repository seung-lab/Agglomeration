#Based on DecisionTree.jl
#Information theoretic tree pruning rewritten
__precompile__()
module DecisionTrees

import Base: length, convert, promote_rule, show, start, next, done
using StatsBase

export Leaf, Node, print_tree, depth, build_tree, apply_tree, build_forest, apply_forest

immutable Leaf{T}
	majority::T
end

immutable Node{T}
	featid::Integer
	featval::T
	left::Union{Leaf{T},Node{T}}
	right::Union{Leaf{T},Node{T}}
end

immutable Ensemble{T}
    trees::T
end

length(leaf::Leaf) = 1
length(tree::Node) = length(tree.left) + length(tree.right)
length(ensemble::Ensemble) = length(ensemble.trees)

depth(leaf::Leaf) = 0
depth(tree::Node) = 1 + max(depth(tree.left), depth(tree.right))

function print_tree(leaf::Leaf, depth=-1, indent=0)
	println("    " ^ indent * "$(leaf.majority)")
end

function print_tree(tree::Node, depth=-1, indent=0)
	println("    " ^ indent * "Feature $(tree.featid), Threshold $(tree.featval)")
	print_tree(tree.left, depth, indent + 1)
	print_tree(tree.right, depth, indent + 1)
end

function binary_entropy(p::Real)
	if p>0 && p<1
		return -p*log(p) -(1-p)*log(1-p)
	else
		return 0.0
	end
end

#labels should be a length N vector
#features should be a Nxk matrix
function split_info_gain{T}(labels::Array{T,1}, features::Array{T,2}, nsubfeatures::Int)
	nf=size(features,2)
	N=length(labels)
	@assert size(features,1)==N
	inds=sample(1:nf, nsubfeatures)

	tot=sum(labels)
	curr_entropy=binary_entropy(tot/N)
	best=(inds[1],zero(T))
	best_val=-convert(T,Inf)
	for i in inds
		ord = sortperm(features[:,i])
		features_i = features[ord,i]
		labels_i=labels[ord]
		cum=0
		for k in 1:N-1
			cum+=labels_i[k]
			p1=cum/k
			p2=(tot-cum)/(N-k)
			gain=curr_entropy - k/N * binary_entropy(p1) - (N-k)/N * binary_entropy(p2)
			gain*=N
			if gain > best_val
				best_val=gain
				best=(i,features_i[k])
			end
		end
	end
	return (best,best_val)
end

function split_info_gain2{T}(labels::Array{T,1}, features::Array{T,2}, nsubfeatures::Int)
	nf=size(features,2)
	N=length(labels)
	@assert size(features,1)==N
	inds=sample(1:nf, nsubfeatures)

	tot=sum(labels)
	curr_entropy=binary_entropy(tot/N)
	best=(inds[1],zero(T))
	best_val=-convert(T,Inf)
	for i in inds
		ord = sortperm(features[:,i])
		features_i = features[ord,i]
		labels_i=labels[ord]
		cum=0
		for k in 1:N-1
			cum+=labels_i[k]
			p1=cum/k
			p2=(tot-cum)/(N-k)
			gain=curr_entropy - k/N * binary_entropy(p1) - (N-k)/N * binary_entropy(p2)
			gain*=N
			if gain > best_val
				best_val=gain
				best=(i,features_i[k])
			end
		end
	end
	return (best,best_val)
end

function build_tree{T}(labels::Array{T,1}, features::Array{T,2}; nsubfeatures=size(features,2), info_threshold=convert(T,10))
	S,best_val = split_info_gain(labels, features, nsubfeatures)
	id, thresh = S
	split = features[:,id] .< thresh
	labels_left = labels[split]
	labels_right = labels[!split]

	#println((length(labels_left), length(labels_right), best_val))
	if length(labels_left)==0 || length(labels_right)==0 || best_val < info_threshold
		return Leaf(mean(labels))
	else
		return Node(id, thresh,
		build_tree(labels_left,features[split,:]; nsubfeatures=nsubfeatures,info_threshold=info_threshold),
		build_tree(labels_right,features[!split,:]; nsubfeatures=nsubfeatures,info_threshold=info_threshold))
	end
end

apply_tree(leaf::Leaf, feature::Vector) = leaf.majority

function apply_tree{T}(tree::Node{T}, features::Vector{T})
	if features[tree.featid] < tree.featval
		return apply_tree(tree.left, features)
	else
		return apply_tree(tree.right, features)
	end
end

function build_forest{T}(labels::Vector{T}, features::Matrix{T}; nsubfeatures=3, info_threshold=convert(T,10), ntrees::Int=10, partialsampling=convert(T,0.8))
	println("info_threshold: $(info_threshold)")
	println("ntrees: $(ntrees)")
	println("nsubfeatures: $(nsubfeatures)")
	println("partialsampling: $(partialsampling)")
	println("(nexamples, nfeatures): $(size(features))")
    Nlabels = length(labels)
    Nsamples = round(Int, partialsampling * Nlabels)
    forest = @parallel (vcat) for i in 1:ntrees
        inds = rand(1:Nlabels, Nsamples)
        build_tree(labels[inds], features[inds,:];nsubfeatures=nsubfeatures, info_threshold=info_threshold)
    end
    return Ensemble(forest)
end

function apply_forest(forest::Ensemble, features::Vector)
    return mean([apply_tree(t,features) for t in forest.trees])
end

end
