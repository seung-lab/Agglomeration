__precompile__()
module MST
using Agglomerator #import paths to other modules

using HDF5
using LabelData


type mst_type
	dend::Array{Array{UInt32,1},1}
	dendValues::Array{Float32,1}
end

#This only works after an aglomerator has been applied
function build_mst(rg)
	
	mst = mst_type(Array{UInt32,1}[], Array{Float32,1}())
	for region in keys(rg)
		recursive_build_mst!(mst,region)
	end
 mst
end

#returns minimum weight in subtree
function recursive_build_mst!(mst::mst_type, region::LabelData.TreeRegion)
	edge = find_adjacent_edge(region.edge)
	if edge == nothing 
		println("couldn't find adjacent edge")
	end

	left=recursive_build_mst!(mst,region.left)
	right=recursive_build_mst!(mst,region.right)
	weight=min(left,right,region.weight)
	#we can't use _mst.last since we might process several top
	#level TreeRegions serially.

	push!(mst.dend, UInt32[UInt32(edge.head.id), UInt32(edge.tail.id)])
	push!(mst.dendValues, Float32(weight))
	return weight
end
function recursive_build_mst!(mst::mst_type, region::LabelData.AtomicRegion)
	return 1.0
end


function find_adjacent_edge(edge::LabelData.TreeEdge) 
	left = find_adjacent_edge(edge.left)
	if left != nothing
		return left
	else
		right =  find_adjacent_edge(edge.right)
		return right
	end
end

function find_adjacent_edge(edge::LabelData.EmptyEdge)
	return nothing
end

function find_adjacent_edge(edge::LabelData.AtomicEdge) 
	return edge
end

function saveBinary(mst::mst_type, filename="mst.data")
  # (in little endian):
  # struct Edge {
  #4 uint32_t number;    // index starting from 0
  #8 uint32_t node1ID;    // ID of the two segments
  #12 uint32_t node2ID;    // ID of the two segments
  #20 double threshold;
  # uint8_t userJoin;    // 0
  # uint8_t userSplit;    // 0
  # uint8_t wasJoined;  // 0
  # };

  # check Headless::loadDend() and Headles::ClearMST()
  
  f = open(filename,"w")
  for i in 1:length(mst.dend)
    write(f,UInt32(rand(UInt32)))
    write(f,UInt32(mst.dend[i][1]))
    write(f,UInt32(mst.dend[i][2]))
    write(f,UInt32(0)) #64 padding
    write(f,Float64(mst.dendValues[i]))
    write(f,UInt8(0))
    write(f,UInt8(0))
    write(f,UInt8(0))
    write(f,UInt8(0))  #64 padding
    write(f,UInt32(0)) #64 padding
  end

  println("MST saved")

end

#Updates or set the MST on an hdf5 file
function saveHDF5(mst::mst_type, filename="./machine_labels.h5")
	 


  force_write(filename, "/dend", convert(Array{UInt32,2}, hcat(mst.dend...)') )
  force_write(filename, "/dendValues", vcat(mst.dendValues)' )

	println("MST saved")
end

function force_write( filename, dataset, array)
  fid = h5open(filename, "r+")

  if exists(fid, dataset)
    o_delete(fid, dataset)
  end 
  write(fid, dataset, array)

  close(fid)

end



end #Module
