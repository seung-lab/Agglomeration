__precompile__()
module Datasets

using Agglomerator #import paths to other modules
using InputOutput, LabelData, SegmentationMetrics
using FixedSizeArrays ,Memoize ,HDF5

immutable dataset{name}

  #Holds the affinites that came out from znn
  affinities::Array{Float32,4}    #from
  size::Tuple{Int,Int,Int}

  #Holds the label data that came out from watershed
  machine_labels::LabelData.Labels
  n_machine_labels::Int
  regions::Array{LabelData.Region{name}}
  edges::Array{LabelData.Edge{name}}

  #Holds the labels from ground truth
  human_labels::LabelData.Labels
  n_human_labels::Int
  
end

#Util functions for dataset
function Base.size(d::dataset)
  return d.size
end
function Base.size(d::dataset,i)
  d.size[i]
end
@inline function Base.getindex{T,n}(A::Array{T,n},i::Vec{n,Int})
  return A[i...]
end


function create_dataset(name, aff_path="", ml_path="", hl_path="")

  affinities, size = load_affinities(aff_path) 
  machine_labels, n_machine_labels = load_labels(ml_path)
  human_labels, n_human_labels = load_labels(hl_path)

  regions, edges = build_labels(machine_labels, n_machine_labels, name)


  return dataset{name}(affinities, size,
                       machine_labels, n_machine_labels, regions, edges,
                       human_labels, n_human_labels)
end

function load_affinities(file_path)

  if file_path == ""
    return zeros(0,0,0,0), zeros(0,0,0)

  elseif file_path[end-2:end] == "jls"
    aff = InputOutput.load(file_path)
    return aff, size(aff)[1:3]

  elseif file_path[end-1:end] == "h5" || file_path[end-3:end] == "hdf5"
    aff = h5read(file_path,"/main")
    return aff, size(aff)[1:3]

  else 
    error("file path doesn't exist for affinities: $file_path ")
  end

end

function load_labels(file_path)

  if file_path == ""
    return zeros(0,0,0), 0

  elseif file_path[end-2:end] == "jls"
    labels = convert(Array{Int},InputOutput.load(file_path))
    return labels, maximum(labels)

  elseif file_path[end-1:end] == "h5" || file_path[end-3:end] == "hdf5"
    labels = convert( Array{Int}, h5read(file_path,"/main"))
    return labels, maximum(labels)

  else 
    error("file path doesn't exist for affinities: $file_path ")
  end

end


function build_labels(machine_labels::LabelData.Labels, n_machine_labels::Int, name::Symbol)
  if machine_labels == zeros(0,0,0)
    return false, false
  end

  regions = LabelData.compute_regions( machine_labels, n_machine_labels,  name )
  edges = LabelData.compute_edges(machine_labels, regions, name)

  return regions,edges
end

function has_affinities(d::dataset)

  return d.size != zeros(0,0,0)
end

function has_machine_labels(d::dataset)

  return d.n_machine_labels != 0
end

function has_human_labels(d::dataset)

  return d.n_human_labels != 0
end

function get_regions(d::dataset)

  if !has_machine_labels(d)
    return false
  end

  return d.regions
end

function get_edges(d::dataset)

  if !has_machine_labels(d)
    return false
  end

  return d.edges
end

############### Datasets ####################

global datasets = Dict{Symbol, dataset}()


function add_dataset(name::Symbol, aff_path="", ml_path="", hl_path="")

  d = create_dataset(name, aff_path, ml_path, hl_path)
  datasets[name] = d

  return d
end

function get_dataset{name}(x::LabelData.AtomicRegion{name})

  return datasets[name]
end
function get_dataset{name}(rg::LabelData.RegionGraph{name})

  return datasets[name]
end
function get_dataset{name}(x::LabelData.AtomicEdge{name})

  return datasets[name]
end

############## Soft Labels ##################
@memoize function soft_label(x::LabelData.AtomicRegion)

  d = get_dataset(x)
  if !has_human_labels(d)
    error("Dataset $name doesn't have human_labels")
    return 
  end

  A=spzeros(Int,d.n_human_labels,1)
  for voxel in x.voxels
  
    human_label = d.human_labels[voxel]
  
    if human_label !=0 #If is not background
      A[human_label] += 1
    end
  
  end
  A
end

@memoize function soft_label(x::LabelData.TreeRegion)
  soft_label(x.left) + soft_label(x.right)
end

function normalized_soft_label(x::LabelData.Region)
  t=soft_label(x)
  t/(norm(t)+0.01)
end


######################## flatten ########################
function flatten(x::LabelData.Region)
  flatten(x,x->1)
end

function flatten(x::LabelData.Region,f::Function)
  
  d = get_dataset(x)

  A=zeros(size(d))
  for r in atomic_regions(x)
    for v in r.voxels
      A[v...]=f(r)
    end
  end
  A
end

function flatten{name}(rg::LabelData.RegionGraph{name})
  
  d = get_dataset(rg)

  A= zeros(Int,size(d))

  function f(x::LabelData.AtomicRegion,i)
    for v in x.voxels
      A[v[1],v[2],v[3]]=i
    end
  end

  function f(x::LabelData.TreeRegion,i)
    f(x.left,i)
    f(x.right,i)
  end
  #todo: change to a linear pass over A
  for (r,i) in zip(keys(rg),countfrom(1))
    f(r,i)
  end
  return A
end

function print_error{name}(rg::LabelData.RegionGraph{name})
  
  d = get_dataset(rg)

  ground_truth=convert(Array{UInt}, d.human_labels)
  prediction=convert(Array{UInt}, rg|> flatten)
  
  nick_index(ground_truth,prediction,merge_error=true, split_error=true)|>println

end


end #module
