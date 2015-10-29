#=
Module volumes

It initializes a volume from a folder path

=#

__precompile__()
module Volumes
export Volume
export AtomicRegion, TreeRegion,Region
export AtomicEdge, TreeEdge, EmptyEdge,Edge
export compute_regions, compute_edges
export volume,edges,regions
export soft_label, normalized_soft_label

using Save
using DataStructures
using FixedSizeArrays
using Iterators
using Memoize

immutable UnorderedPair{T}
	data::Tuple{T,T}
end
UnorderedPair{T}(x::T,y::T)=UnorderedPair{T}((min(x,y),max(x,y)))
Base.getindex(p::UnorderedPair,i::Int)=p.data[i]

immutable Volume{name}
	affinities::Array{Float32,4}
	machine_labels::Array{Int,3}
	human_labels::Array{Int,3}
	size::Tuple{Int,Int,Int}
	n_machine_labels::Int
	n_human_labels::Int
end

#Volume creates and inmutable Volume given a path to a folder
#machine and human labels are a sequence. 
function Volume(path::AbstractString,name::Symbol)
	affinities=load("$(path)/affinities.jls")
	machine_labels=convert(Array{Int},load("$(path)/machine_labels.jls"))
	human_labels=convert(Array{Int},load("$(path)/human_labels.jls"))
	@assert size(machine_labels)==size(human_labels)==size(affinities)[1:3]

	s=size(machine_labels)
	n=maximum(machine_labels)
	m=maximum(human_labels)
	Volume{name}(affinities,machine_labels,human_labels,s,n,m)
end
Base.size(v::Volume)=v.size
Base.size(v::Volume,i)=v.size[i]
@inline Base.getindex{T,n}(A::Array{T,n},i::Vec{n,Int})=A[i...]

abstract Region{vol}
type AtomicRegion{vol} <: Region{vol}
	voxels::Array{Vec{3,Int},1}
	neighbours::ObjectIdDict
	id::Int
end
AtomicRegion{vol}(volume::Volume{vol},id::Int)=AtomicRegion{vol}(Vec{3,Int}[],ObjectIdDict(),id)

#=
type AggregateRegion{vol} <: Region{vol}
	regions::Set{AtomicRegion{vol}}
end
=#
type TreeRegion{vol} <: Region{vol}
	left::Region{vol}
	right::Region{vol}
end

#Base.convert{vol}(::Type{AggregateRegion{vol}},x::AtomicRegion{vol})=AggregateRegion{vol}(Set([x]))

function volume end
function regions end
function edges end

#=
function Base.union{vol}(r1::Region{vol},r2::Region{vol})
	r1=convert(AggregateRegion{vol},r1)
	r2=convert(AggregateRegion{vol},r2)
	AggregateRegion{vol}(union(r1.regions,r2.regions))
end
=#

abstract Edge{vol}
type AtomicEdge{vol} <: Edge{vol}
	head::AtomicRegion{vol}
	tail::AtomicRegion{vol}
	edges::Array{Vec{4,Int},1}
end
type TreeEdge{vol} <: Edge{vol}
	left::Edge{vol}
	right::Edge{vol}
end
immutable EmptyEdge{vol} <: Edge{vol}
end

#=
type AggregateEdge{vol}
	head::Region{vol}
	tail::Region{vol}
	atomic_edges::Set{AggregateEdge{vol}}
end
=#
function AtomicEdge{vol}(head::AtomicRegion{vol},tail::AtomicRegion{vol},edges::Array{Vec{4,Int},1})
	x=AtomicEdge{vol}(head,tail,edges)
	head.neighbours[tail]=x
end
function compute_regions(volume::Volume)
	n=volume.n_machine_labels
	ret=[AtomicRegion(volume,i) for i in 1:n]
	for i in CartesianRange(size(volume.machine_labels))
		if volume.machine_labels[i]!=0
			push!(ret[volume.machine_labels[i]].voxels,Vec{3,Int}(i.I...))
		end
	end
	ret
end

function compute_edges{vol}(volume::Volume{vol},regions)
	n=volume.n_machine_labels
	affinities=volume.affinities
	machine_labels=volume.machine_labels
	L=DefaultDict(UnorderedPair{Int},Array{Vec{4,Int},1},()->Vec{4,Int}[])
	for k in 2:size(affinities,3)
		for j in 2:size(affinities,2)
			for i in 2:size(affinities,1)
				t=(i,j,k)
				t1=(i-1,j,k)
				t2=(i,j-1,k)
				t3=(i,j,k-1)

				x=machine_labels[t...]
				x1=machine_labels[t1...]
				x2=machine_labels[t2...]
				x3=machine_labels[t3...]
				if x!=0
					if x1!=0 && x!=x1
						push!(L[UnorderedPair(x,x1)],Vec{4,Int}(t...,1))
					end
					if x2!=0 && x!=x2
						push!(L[UnorderedPair(x,x2)],Vec{4,Int}(t...,2))
					end
					if x3!=0 && x!=x3
						push!(L[UnorderedPair(x,x3)],Vec{4,Int}(t...,3))
					end
				end
			end
		end
	end
	ret1=AtomicEdge{vol}[
	AtomicEdge(
	regions[key[1]],regions[key[2]],
	value
	)
	for (key,value) in L
	]
	ret2=AtomicEdge{vol}[
	AtomicEdge(
	regions[key[2]],regions[key[1]],
	value
	)
	for (key,value) in L
	]
	cat(1,ret1,ret2)
end

@memoize function soft_label(x::AtomicRegion)
	A=spzeros(Int,volume(x).n_human_labels,1)
	for v in x.voxels
		t=volume(x).human_labels[v]
		if t!=0
			A[t]+=1
		end
	end
	A
end

@memoize function soft_label(x::TreeRegion)
	soft_label(x.left) + soft_label(x.right)
end

function normalized_soft_label(x::Region)
	t=soft_label(x)
	t/(norm(t)+0.01)
end
end
