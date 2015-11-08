module MST
using Agglomerator #import paths to other modules

using Volumes
using HDF5
using SNEMI3D


type _mst{vol}
	dend::Array{Array{UInt32,1},1}
	dendValues::Array{Float32,1}
	last::Float32
	volume::Volume{vol}
end

function newMST{vol}(v::Volume{vol})
	return _mst(Array{UInt32,1}[], Array{Float32,1}(),0.0f0,v)
end

function build_mst{vol}(rg::RegionGraph{vol},v::Volume{vol})
	mst=newMST(v)
	for region in keys(rg)
		recursive_build_mst(mst,region)
	end
	mst
end

#returns minimum weight in subtree
function recursive_build_mst{vol}(mst::_mst, region::TreeRegion{vol})
	edge = find_adjacent_edge(region.edge)
	if edge == nothing 
		println("couldn't find adjacent edge")
	end
	left=recursive_build_mst(mst,region.left)
	right=recursive_build_mst(mst,region.right)
	weight=min(left,right,region.weight)
	#we can't use _mst.last since we might process several top
	#level TreeRegions serially

	edge=find_adjacent_edge(region.edge)

	push!(mst.dend, UInt32[UInt32(edge.head.id), UInt32(edge.tail.id)])
	push!(mst.dendValues, Float32(weight))
	return weight
end
function recursive_build_mst{vol}(mst::_mst, region::AtomicRegion{vol})
	return 1.0
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

	push!(mst.dend, UInt32[UInt32(edge.head.id), UInt32(edge.tail.id)])
	push!(mst.dendValues, Float32(region.weight))

end

function find_adjacent_edge{vol}(edge::TreeEdge{vol}) 
	left = find_adjacent_edge(edge.left)
	if left != nothing
		return left
	else
		right =  find_adjacent_edge(edge.right)
		return right
	end
end

function find_adjacent_edge{vol}(edge::EmptyEdge{vol})
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

	machine_labels=convert(Array{UInt32},  mst.volume.machine_labels)

	h5write("./machine_labels.h5","/main",machine_labels)
	h5write("./machine_labels.h5","/dend", hcat(mst.dend...)')
	h5write("./machine_labels.h5","/dendValues", vcat(mst.dendValues)')
end



end #Module
