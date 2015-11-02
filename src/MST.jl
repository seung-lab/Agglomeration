module MST

using Volumes

type _mst 
  edges::Array{Tuple{UInt32,UInt32,Float64}}
  last::Float64
end

function newMST()
  return _mst([],0.0)
end



function add_edge{vol}(mst::_mst, region::TreeRegion{vol})

  id_left = recurse_region(region.left)
  id_right = recurse_region(region.right)

  if mst.last > region.weight
    weight = mst.last
  else
    weight = region.weight
    mst.last = weight
  end

  push!(mst.edges, (id_left,id_right,region.weight))
  # s = @sprintf "%d %d %f" id_left id_right region.weight;
end

function recurse_region{vol}(region::TreeRegion{vol})

  return recurse_region(region.left)

end

function recurse_region{vol}(region::AtomicRegion{vol})
  return region.id
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
  f = open("mst.data","w")
  for (idx, edge) in enumerate(mst.edges)
    write(f,UInt32(idx))
    write(f,UInt32(edge[1]))
    write(f,UInt32(edge[2]))
    write(f,Float64(edge[3]))
    write(f,UInt8(0))
    write(f,UInt8(0))
    write(f,UInt8(0))

  end
  close(f)

end



end #Module