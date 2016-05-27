if VERSION < v"0.5.0-dev"
	__precompile__()
end

module RegionGraphs
using Agglomeration
using DataStructures
using Iterators

import Base: reverse, merge!, length, push! 

export Region,Edge,TreeEdge
export AtomicRegion,AtomicEdge
export TreeRegion
export HeadMergeEdge, TailMergeEdge, EmptyEdge, ReverseEdge, SplitEdge, MergeEdge
export RegionGraph
export add_vertex!, remove_vertex!, add_edge!, remove_edge!, merge!, split!, purge_merge_edges!
export reverse, root
export atomic_regions
export compute_regiongraph

include("compute_regiongraph.jl")

#################  Regions #################
abstract Region
abstract Edge
abstract TreeEdge <: Edge

function isroot(x)
	return x.parent == x
end
function root(x)
	if isroot(x)
		x
	else
		root(x.parent)
	end
end

#unfortunately, we need to store region parents
#This prevents us from having multiple regiongraphs on the same set of atomic regions
#The only alternative is to have a separate datastructure which stores parents
#That's messy since we need to remember to deallocate in the auxiliary
type AtomicRegion <: Region
	label
	parent::Region
	volume::Float32
	function AtomicRegion(label)
		x=new()
		x.label=label
		x.parent=x
		x.volume=0
		return x
	end
end

type TreeRegion <: Region
	left::Region
	right::Region
	edge::Edge
	parent::Region
	function TreeRegion(left,right,edge)	
		x=new()
		x.left=left
		x.right=right
		x.edge=edge
		x.parent=x
		left.parent=x
		right.parent=x
	end
end

function generate_atomic_regions(x::TreeRegion)
	generate_atomic_regions(x.left)
	generate_atomic_regions(x.right)
end

function generate_atomic_regions(x::AtomicRegion)
	produce(x)
end

function atomic_regions(x::Region)
	Task(()->generate_atomic_regions(x))
end

############## Edges ############## 
type AtomicEdge <: Edge
	area::Float32
	sum_affinity::Float32
	max_affinity::Float32
	min_affinity::Float32
	hist_affinity::Array{Float32}
	head::AtomicRegion
	tail::AtomicRegion
end
function AtomicEdge(ht)
	AtomicEdge(0f0,0f0,0f0,1f0,zeros(Float32,5),ht[1],ht[2])
end
immutable ReverseEdge <: Edge
	rev::Edge
end
immutable EmptyEdge <: Edge
end
immutable SplitEdge <: Edge
end
immutable MergeEdge <: Edge
end

type HeadMergeEdge <: TreeEdge
	left::Edge
	right::Edge
end
function HeadMergeEdge(::EmptyEdge, ::EmptyEdge)
	return EmptyEdge()
end
type TailMergeEdge <: TreeEdge
	left::Edge
	right::Edge
end
function TailMergeEdge(::EmptyEdge, ::EmptyEdge)
	return EmptyEdge()
end

reverse(e::Edge)=ReverseEdge(e)
reverse(e::ReverseEdge)=e.rev
reverse(e::EmptyEdge)=EmptyEdge()

head_split(edge::EmptyEdge) = (EmptyEdge(), EmptyEdge())
tail_split(edge::EmptyEdge) = (EmptyEdge(), EmptyEdge())
head_split(edge::HeadMergeEdge)=(edge.left, edge.right)
head_split(edge::MergeEdge) = (MergeEdge(), MergeEdge())
tail_split(edge::MergeEdge) = (MergeEdge(), MergeEdge())
function head_split(edge::TailMergeEdge)
	e1,e2 = head_split(edge.left)
	e3,e4 = head_split(edge.right)
	(TailMergeEdge(e1,e3), TailMergeEdge(e2,e4))
end
function head_split(edge::ReverseEdge)
	e1,e2 = tail_split(reverse(edge))
	(reverse(e1), reverse(e2))
end
tail_split(edge::TailMergeEdge)=(edge.left, edge.right)
function tail_split(edge::ReverseEdge)
	e1,e2 = head_split(reverse(edge))
	(reverse(e1), reverse(e2))
end
function tail_split(edge::HeadMergeEdge)
	e1,e2 = tail_split(edge.left)
	e3,e4 = tail_split(edge.right)
	(HeadMergeEdge(e1,e3), HeadMergeEdge(e2,e4))
end

function purge_merge_edges!(rg, u, v)
	if haskey(rg[u],v)
		add_edge!(rg,u,v,purge_merge_edges(remove_edge!(rg,u,v,rg[u][v])))
	end
end

function purge_merge_edges(edge::HeadMergeEdge)
	HeadMergeEdge(purge_merge_edges(edge.left),purge_merge_edges(edge.right))
end
function purge_merge_edges(edge::TailMergeEdge)
	TailMergeEdge(purge_merge_edges(edge.left),purge_merge_edges(edge.right))
end
function purge_merge_edges(edge::MergeEdge)
	EmptyEdge()
end
function purge_merge_edges(edge::EmptyEdge)
	EmptyEdge()
end
function purge_merge_edges(edge::AtomicEdge)
	edge
end
function purge_merge_edges(edge::ReverseEdge)
	reverse(purge_merge_edges(reverse(edge)))
end

###Testing functions###

macro assert(x)
	quote end
end
function ht(e::Edge)
	h1,t1 = ht(e.left)
	h2,t2 = ht(e.right)
	return (cat(1,h1,h2),cat(1,t1,t2))
end
function ht(e::ReverseEdge)
	h,t = ht(reverse(e))
	return (t,h)
end
function ht(e::AtomicEdge)
	return ([e.head],[e.tail])
end
function ht(e::EmptyEdge)
	return ([],[])
end
function ht(e::MergeEdge)
	return ([],[])
end

function certify(rg)
	for u in keys(rg)
		certify(u)
		for v in keys(rg[u])
			certify(u,v,rg[u][v])
			@assert rg[u][v] == reverse(rg[v][u])
			@assert rg[u][v] != EmptyEdge()
		end
	end
	println("$(sum([length(x) for x in keys(rg)])) vertices")
	println("$(2*sum(map(edgecount, keys(rg)))+sum(Int[sum(Int[edgecount(e) for e in values(rg[u])]) for u in keys(rg)])) edges")
	println("certified")
end
function certify(u::Region, v::Region, e::AtomicEdge)
	@assert e.head == u
	@assert e.tail == v
end
function certify(u::Region, v::Region, e::HeadMergeEdge)
	certify(u.left, v, e.left)
	certify(u.right, v, e.right)
end
function certify(u::Region, v::Region, e::TailMergeEdge)
	certify(u, v.left, e.left)
	certify(u, v.right, e.right)
end
function certify(u::Region, v::Region, e::ReverseEdge)
	certify(v,u,reverse(e))
end
function certify(u::Region, v::Region, e::EmptyEdge)
	#println("empty edge")
end
function certify(u::Region, v::Region, e::MergeEdge)
	println("merge edge")
end
function certify(u::TreeRegion)
	certify(u.left, u.right, u.edge)
	certify(u.left)
	certify(u.right)
end
function certify(u::Region)
end

length(u::TreeRegion)=length(u.left)+length(u.right)
length(u::AtomicRegion)=1

edgecount(u::TreeRegion) = edgecount(u.edge) + edgecount(u.left) + edgecount(u.right)
edgecount(u::HeadMergeEdge) = edgecount(u.left) + edgecount(u.right)
edgecount(u::TailMergeEdge) = edgecount(u.left) + edgecount(u.right)
edgecount(e::AtomicEdge)=1
edgecount(u::AtomicRegion)=0
edgecount(e::ReverseEdge)=edgecount(e.rev)
edgecount(e::EmptyEdge)=0
edgecount(e::MergeEdge)=1

###Maintaining Features###
@inline function push!(u::AtomicRegion, i,j,k)
	u.volume += 1
end

@inline function push!(e::AtomicEdge, i,j,k, affinity)
	e.area+=1
	e.sum_affinity+=affinity
	e.max_affinity=max(e.max_affinity, affinity)
	e.min_affinity=min(e.min_affinity, affinity)
	e.hist_affinity[round(Int,floor(4.999*affinity)+1)]+=1
end

######################## Region Graph ########################
typealias RegionGraph Dict{Region,Dict{Region,Edge}}

function split!(rg, region::TreeRegion)
	@assert haskey(rg, region)
	nbs = to_default_dict(rg[region])
	add_vertex!(rg, region.left)
	add_vertex!(rg, region.right)
	region.left.parent=region.left
	region.right.parent=region.right
	add_edge!(rg, region.left, region.right, region.edge)
	for (nb, edge) in nbs
		(e1,e2) = head_split(edge)
		add_edge!(rg, region.left, nb, e1)
		add_edge!(rg, region.right, nb, e2)
	end
	remove_vertex!(rg, region)
end

function add_edge!(rg, head, tail, e::AtomicEdge)
	@assert e.head == head
	@assert e.tail == tail
	rg[head][tail]=e
	rg[tail][head]=reverse(e)
end

function add_edge!(rg, head, tail, e)
	@assert !haskey(rg[head],tail)
	@assert !haskey(rg[tail],head)
	rg[head][tail]=e
	rg[tail][head]=reverse(e)
	@assert begin
		h,t = ht(e)
		issubset(h,Set(atomic_regions(head))) && issubset(t,Set(atomic_regions(tail)))
	end
end
function add_edge!(rg, head, tail, e::SplitEdge)
	rg[head][tail]=e
	rg[tail][head]=reverse(e)
end
function add_edge!(rg, head, tail, e::EmptyEdge)
end
function remove_edge!(rg, head, tail, e)
	@assert rg[head][tail]==e
	@assert rg[tail][head]==reverse(e)
	delete!(rg[head], tail)
	delete!(rg[tail], head)
	return e
end
function add_vertex!(rg::RegionGraph, v)
	@assert !haskey(rg, v)
	rg[v] = Dict{Region,Edge}()
end
function remove_vertex!(rg, head)
	@assert haskey(rg, head)
	for (tail,edge) in collect(rg[head])
		remove_edge!(rg,head,tail,edge)
	end
	delete!(rg,head)
end

function merge!(rg, head, tail)
	@assert haskey(rg, head)
	@assert haskey(rg, tail)
	if !haskey(rg[head], tail)
		@assert !haskey(rg[tail], head)
		println("Merging along empty edge")
		edge=MergeEdge()
	else
		edge=rg[head][tail]
		remove_edge!(rg, head, tail, edge)
	end
	head_nbs = to_default_dict(rg[head])
	tail_nbs = to_default_dict(rg[tail])
	new_vertex=TreeRegion(head, tail, edge)
	add_vertex!(rg, new_vertex)

	for nb in unique(chain(keys(head_nbs),keys(tail_nbs)))
		e1=head_nbs[nb]
		e2=tail_nbs[nb]
		add_edge!(rg, new_vertex, nb, HeadMergeEdge(e1,e2))
	end
	remove_vertex!(rg, head)
	remove_vertex!(rg, tail)
	return new_vertex
end

function to_default_dict(neighbours::Dict{Region, Edge})
	default_dict=DefaultDict(Region, Edge,()->EmptyEdge())

	for (r,val) in neighbours
		default_dict[r]=val
	end

	return default_dict
end

end #module
