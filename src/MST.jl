module MST
using Agglomerator #import paths to other modules

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

  edge = find_adjacent_edge(edge)
  if edge == nothing 
    println("couldn't find adjacent edge")
  end

  if mst.last > region.weight
    weight = mst.last
  else
    weight = region.weight
    mst.last = weight
  end

  push!(mst.dend, [UInt32(edge.head.id), UInt32(edge.tail.id)])
  push!(mst.dendValues, Float32(region.weight))

end
 
function find_adjacent_edge{vol}(edge::TreeEdge{vol}) 
  
  if !isa( edge.left, EmptyEdge)
    left = find_adjacent_edge(edge.left)
    if left != nothing
      return left
    end 
  end

  if !isa( edge.right, EmptyEdge) 
    right =  find_adjacent_edge(edge.right)
    if right != nothing
      return right
    end
  end

  return nothing
end

function find_adjacent_edge{vol}(edge::AtomicEdge{vol}) 
  return edge
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


  run(`rm -f ./machine_labels.h5`)

  machine_labels=convert(Array{UInt32},  SNEMI3DTrainVolume.machine_labels)

  h5write("./machine_labels.h5","/main",machine_labels)
  h5write("./machine_labels.h5","/dend", hcat(mst.dend...)')
  h5write("./machine_labels.h5","/dendValues", vcat(mst.dendValues)')
end



end #Module