module MST

using Volumes
using HDF5
using SNEMI3D


type _mst 
  dend
  dendValues::Array{Float32,1}
  last::Float32
end

function newMST()
  return _mst([], Array{Float32,1}(),0.0)
end



function add_edge{vol}(mst::_mst, region::TreeRegion{vol}, edge::Edge{vol})

  regions_left = get_atomic_regions(region.left)
  regions_right = get_atomic_regions(region.right)

  edge = find_adjacent_edge(edge, regions_left, regions_right )

  if mst.last > region.weight
    weight = mst.last
  else
    weight = region.weight
    mst.last = weight
  end

  if edge != Void 
    println(edge.head.id)
    push!(mst.dend, [UInt32(edge.head.id), UInt32(edge.tail.id)])
    push!(mst.dendValues, Float32(region.weight))
  end
end

function get_atomic_regions{vol}(region::Region{vol}) 

  regions = []
  recurse_region(region, regions)
  return regions
end



function recurse_region{vol}(region::TreeRegion{vol}, regions)

  recurse_region(region.left, regions)
  recurse_region(region.right, regions)

end

function recurse_region{vol}(region::AtomicRegion{vol}, regions)
  push!(regions,region.id)
  return
end

function find_adjacent_edge{vol}(edge::TreeEdge{vol}, regions_left, regions_right) 
  
  left = find_adjacent_edge(edge.left, regions_left, regions_right) 
  if edge != Void
    return left
  end

  right = find_adjacent_edge(edge.right, regions_left, regions_right)
  return right
  
end
function find_adjacent_edge{vol}(edge::AtomicEdge{vol}, regions_left, regions_right) 

  # println(edge.head.id)
  if edge.head.id in regions_left && edge.tail.id in regions_right
    return edge
  end

  return Void
end

function find_adjacent_edge{vol}(edge::EmptyEdge{vol}, regions_left, regions_right)
  return Void
end


function save(mst::_mst)
 #= 
 (in little endian):

 struct Edge {
    uint32_t number;    // index starting from 0
    uint32_t node1ID;    // ID of the two segments
    uint32_t node2ID;    // ID of the two segments
    double threshold;
    uint8_t userJoin;    // 0
    uint8_t userSplit;    // 0
    uint8_t wasJoined;  // 0
 };

 check Headless::loadDend() and Headles::ClearMST()
 =#
  # f = open("mst.data","w")
  # for (idx, edge) in enumerate(mst.edges)
  #   write(f,UInt32(idx))
  #   write(f,UInt32(edge[1]))
  #   write(f,UInt32(edge[2]))
  #   write(f,Float64(edge[3]))
  #   write(f,UInt8(0))
  #   write(f,UInt8(0))
  #   write(f,UInt8(0))

  # end
  # close(f)

  # writedlm("mst.dend", mst.dend)
  # writedlm("mst.dendValues", mst.dendValues)


  run(`rm -f ./machine_labels.h5`)

  machine_labels=convert(Array{UInt32},  SNEMI3DTrainVolume.machine_labels)

  h5write("./machine_labels.h5","/main",machine_labels)
  h5write("./machine_labels.h5","/dend", hcat(mst.dend...)')
  h5write("./machine_labels.h5","/dendValues", vcat(mst.dendValues)')
end



end #Module