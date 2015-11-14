#Based on DecisionTree.jl
#Information theoretic tree pruning rewritten
module MyDecisionTree

import Base: length, convert, promote_rule, show, start, next, done

export Leaf, Node, print_tree, depth,
build_tree, apply_tree,
build_forest, apply_forest

if VERSION >= v"0.4.0-dev"
	typealias Range1{Int} Range{Int}
	_int(x) = round(Int, x)
	float(x) = map(Float64, x)
else
	_int(x) = int(x)
end

#include("measures.jl")

immutable Leaf
	majority::Any
	values::Vector
end


immutable Node
	featid::Integer
	featval::Any
	left::Union{Leaf,Node}
	right::Union{Leaf,Node}
end
immutable Ensemble
    trees::Vector{Node}
end

typealias LeafOrNode Union{Leaf,Node}

convert(::Type{Node}, x::Leaf) = Node(0, nothing, x, Leaf(nothing,[nothing]))
promote_rule(::Type{Node}, ::Type{Leaf}) = Node
promote_rule(::Type{Leaf}, ::Type{Node}) = Node

length(leaf::Leaf) = 1
length(tree::Node) = length(tree.left) + length(tree.right)
length(ensemble::Ensemble) = length(ensemble.trees)

depth(leaf::Leaf) = 0
depth(tree::Node) = 1 + max(depth(tree.left), depth(tree.right))

function print_tree(leaf::Leaf, depth=-1, indent=0)
	println("$(leaf.majority)")
end

function print_tree(tree::Node, depth=-1, indent=0)
	if depth == indent
		println()
		return
	end
	println("Feature $(tree.featid), Threshold $(tree.featval)")
	print("    " ^ indent * "L-> ")
	print_tree(tree.left, depth, indent + 1)
	print("    " ^ indent * "R-> ")
	print_tree(tree.right, depth, indent + 1)
end

### Classification ###

function binary_entropy(p::Real)
	if p>0 && p<1
		return -p*log(p) -(1-p)*log(1-p)
	else
		return 0.0
	end
end
const NO_BEST=(0,0)
function _split_info_gain(labels::Vector, features::Matrix, nsubfeatures::Int)
	nf=size(features,2)
	N=length(labels)
	@assert size(features,1)==N
	if nsubfeatures > 0
		r=randperm(nf)
		inds=r[1:nsubfeatures]
	else
		inds=1:nf
	end

	tot=sum(labels)
	curr_entropy=binary_entropy(tot/N)
	best=(0,0)
	best_val=-Inf
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

function build_tree(labels::Vector, features::Matrix; nsubfeatures=0, info_threshold=10)
	S,best_val = _split_info_gain(labels, features, nsubfeatures)
	if S == NO_BEST
		return Leaf(mean(labels), labels)
	end
	id, thresh = S
	split = features[:,id] .< thresh
	labels_left = labels[split]
	labels_right = labels[!split]

	if length(labels_left)==0 || length(labels_right)==0 || best_val < info_threshold
		return Leaf(mean(labels),labels)
	else
		return Node(id, thresh,
		build_tree(labels_left,features[split,:]; nsubfeatures=nsubfeatures,info_threshold=info_threshold),
		build_tree(labels_right,features[!split,:]; nsubfeatures=nsubfeatures,info_threshold=info_threshold))
	end
end

apply_tree(leaf::Leaf, feature::Vector) = leaf.majority

function apply_tree(tree::Node, features::Vector)
	if tree.featval == nothing
		return apply_tree(tree.left, features)
	elseif features[tree.featid] < tree.featval
		return apply_tree(tree.left, features)
	else
		return apply_tree(tree.right, features)
	end
end

function apply_tree(tree::LeafOrNode, features::Matrix)
	N = size(features,1)
	predictions = Array(Any,N)
	for i in 1:N
		predictions[i] = apply_tree(tree, squeeze(features[i,:],1))
	end
	if typeof(predictions[1]) <: Float64
		return float(predictions)
	else
		return predictions
	end
end

function show(io::IO, leaf::Leaf)
	println(io, "Decision Leaf")
	println(io, "Majority: $(leaf.majority)")
	print(io,   "Samples:  $(length(leaf.values))")
end

function show(io::IO, tree::Node)
	println(io, "Decision Tree")
	println(io, "Leaves: $(length(tree))")
	print(io,   "Depth:  $(depth(tree))")
end

function show(io::IO, ensemble::Ensemble)
    println(io, "Ensemble of Decision Trees")
    println(io, "Trees:      $(length(ensemble))")
    println(io, "Avg Leaves: $(mean([length(tree) for tree in ensemble.trees]))")
    print(io,   "Avg Depth:  $(mean([depth(tree) for tree in ensemble.trees]))")
end
### Regression ###

function build_forest(labels::Vector, features::Matrix; nsubfeatures=3, info_threshold=10, ntrees::Integer=10, partialsampling=0.8)
    partialsampling = partialsampling > 1.0 ? 1.0 : partialsampling
    Nlabels = length(labels)
    Nsamples = _int(partialsampling * Nlabels)
    forest = @parallel (vcat) for i in 1:ntrees
        inds = rand(1:Nlabels, Nsamples)
        build_tree(labels[inds], features[inds,:];nsubfeatures=nsubfeatures, info_threshold=info_threshold)
    end
    return Ensemble([forest;])
end

function apply_forest(forest::Ensemble, features::Vector)
    ntrees = length(forest)
    votes = Array(Any,ntrees)
    for i in 1:ntrees
        votes[i] = apply_tree(forest.trees[i],features)
    end
    return mean(votes)
end


end # module
