#__precompile__()
module MergeTrees
using Agglomeration
using Agglomerators
using RegionGraphs

abstract Node
type MergeNode <: Node
	weight::Float32
	left::Node
	right::Node
	function MergeNode(weight, left, right)
		if left == Empty()
			return right
		elseif right == Empty()
			return left
		else
			return new(weight, left, right)
		end
	end
end

type Leaf <: Node
	label
end

immutable Empty <: Node
end

function Node(x::AtomicRegion,agg)
	return Leaf(x.label)
end
get_weight(l::Leaf)=1
get_weight(l::MergeNode)=l.weight
get_weight(l::Empty)=1

function Node(x::TreeRegion,agg)
	left=Node(x.left,agg)
	right=Node(x.right,agg)
	weight = min(agg(x.left,x.right,x.edge), get_weight(left)-eps(Float32), get_weight(right)-eps(Float32))
	return MergeNode(weight, left, right)
end


#restrict takes a merge tree and restricts it to a specified set of vertices
function restrict(x::Leaf, set)
	if x.label in set
		return x
	else
		return Empty()
	end
end
function restrict(x::MergeNode, set)
	left = restrict(x.left, set)
	right = restrict(x.right, set)
	return MergeNode(x.weight, left, right)
end
function restrict(x::Empty, set)
	return Empty()
end

function to_merge_tree(rg,agg)
	nodes = [Node(x,agg) for x in keys(rg)]
	return reduce((x,y)->MergeNode(-1,x,y),Empty(),nodes)
end


function generate_leaves(n::MergeNode)
	generate_leaves(n.left)
	generate_leaves(n.right)
end
function generate_leaves(n::Empty)
end
function generate_leaves(n::Leaf)
	produce(n)
end
function leaves(x::Node)
	Task(()->generate_leaves(x))
end


#=
function threshold(x::Node,thresh)
	if get_weight(x) > thresh
		return [x]
	else
		@assert typeof(x)==MergeNode
		return cat(1,threshold(x.left,thresh),threshold(x.right,thresh))
	end
end
=#

function threshold(x::Node, thresh)
	to_explore = Node[x]
	nodes=Node[]
	while length(to_explore) > 0
		n=pop!(to_explore)
		if get_weight(n) > thresh
			push!(nodes, n)
		else
			@assert typeof(n)==MergeNode
			push!(to_explore, n.left)
			push!(to_explore, n.right)
		end
	end
	return nodes
end


function flatten(labels, merge_tree, thresh)
	branches = threshold(merge_tree, thresh)
	d=Dict{Any,UInt32}()
	d[0]=0
	for (i,b) in enumerate(branches)
		for l in leaves(b)
			d[l.label]=i
		end
	end
	return map(x->d[x], labels)
end


end
