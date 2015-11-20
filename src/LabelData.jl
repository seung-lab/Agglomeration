__precompile__()
module LabelData

using FixedSizeArrays, DataStructures, Memoize

typealias Label UInt32
typealias Labels Array{Label, 3}
typealias Index UInt32

#################  Regions #################
abstract Region{name}
abstract Edge{name}

type AtomicRegion{name} <: Region{name}
  voxels::Array{Vec{3,Index},1}
  neighbours::ObjectIdDict
  id::Int
end
function AtomicRegion(id::Label, name)
  return AtomicRegion{name}(Vec{3,Index}[],ObjectIdDict(),id)
end
type AggregateRegion{name} <: Region{name}
  regions::Set{AtomicRegion{name}}
end
type TreeRegion{name} <: Region{name}
  left::Region{name}
  right::Region{name}
  edge::Edge{name}
  weight::Real
end

function atomic_regions{name}(x::TreeRegion{name})
  cat(1,atomic_regions(x.left),atomic_regions(x.right))
end

function atomic_regions{name}(x::AtomicRegion{name})
  AtomicRegion{name}[x]
end

function atomic_regions{name}(x::AggregateRegion{name})
  collect(x.regions)
end


function compute_regions(labels::Labels, n_labels, name)

  ret=[AtomicRegion(Label(id), name) for id in 1:n_labels]
  for i in CartesianRange(size(labels))
    if labels[i]!=0
      push!(ret[labels[i]].voxels,Vec{3,Index}(i.I...))
    end
  end
  
  return ret
end


############## Edges ############## 
immutable UnorderedPair{T}
  data::Tuple{T,T}
end
function UnorderedPair{T}(x::T,y::T)
  return UnorderedPair{T}((min(x,y),max(x,y)))
end
function Base.getindex(p::UnorderedPair,i::Int)
  return p.data[i]
end

type AtomicEdge{name} <: Edge{name}
  head::AtomicRegion{name}
  tail::AtomicRegion{name}
  edges::Array{Vec{4,Index},1}
end
type TreeEdge{name} <: Edge{name}
  left::Edge{name}
  right::Edge{name}
end
immutable EmptyEdge{name} <: Edge{name}
end


function compute_edges(labels::Labels, regions, name)

  #it compares the voxel its iterating with the one closer to the origin
  #in the x,y and z dimensions.
  #if this two voxels have different ids and both are different to 0(background voxels)
  #it adds them to a DefaultDict.
  #This dict contains as a key both voxels ids
  #and as a value the position of the voxel being iterated and the direction on where to
  #find the second voxels. Or in other words the position of both voxels. 
  L=DefaultDict(UnorderedPair{Label},Array{Vec{4,Index},1},()->Vec{4,Index}[])

  for k in 2:size(labels,3)
    for j in 2:size(labels,2)
      for i in 2:size(labels,1)
        t=(i,j,k)
        t1=(i-1,j,k)
        t2=(i,j-1,k)
        t3=(i,j,k-1)

        x=labels[t...]
        x1=labels[t1...]
        x2=labels[t2...]
        x3=labels[t3...]
        if x!=0
          if x1!=0 && x!=x1
            push!(L[UnorderedPair(x,x1)],Vec{4,Index}(t...,1))
          end
          if x2!=0 && x!=x2
            push!(L[UnorderedPair(x,x2)],Vec{4,Index}(t...,2))
          end
          if x3!=0 && x!=x3
            push!(L[UnorderedPair(x,x3)],Vec{4,Index}(t...,3))
          end
        end
      end
    end
  end
  
  #it iterates throu the dictionary and creates atomicEdges in both directions
  ret1=AtomicEdge{name}[
                        AtomicEdge(
                                  regions[key[1]],regions[key[2]],
                                  value
                                  )
                                  for (key,value) in L
                        ]

  ret2=AtomicEdge{name}[
  AtomicEdge(
  regions[key[2]],regions[key[1]],
  value
  )
  for (key,value) in L
  ]

  #it concatenates both arrays into one
  cat(1,ret1,ret2)
end


######################## Region Graph ########################
typealias RegionGraph{name} DefaultDict{Region{name},Dict{Region{name},Edge{name}}}


#atomic_region_graph iterates throu an array of Atomic Edges to build a dictionary
#where the key is a region, and the value is another dictionary where the key is neighbour region to the first
#and the value of the second dictionary is an AtomicEdge between this two labels.
# An atomic edge contains all the voxels connecting two atomic regions

function atomic_region_graph(edges , name::Symbol)
  rg = DefaultDict(Region{name},
                 Dict{Region{name},Edge{name}},
                 ()->Dict{Region{name},Edge{name}}())

  #edges contains an array of AtomicEdges retuned by compute_edges()
  for edge in edges
    rg[edge.head][edge.tail] = edge
  end
  return rg

end



end #module
