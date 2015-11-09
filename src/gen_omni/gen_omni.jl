using SNEMI3D
using Volumes
using HDF5
name{vol}(v::Volume{vol})=string(vol)

#change to seungmount/research/Jingpeng/09_pypipeline/omnify/bin
#OMNI_DIR="/usr/people/it2/seungmount/research/Jingpeng/09_pypipeline/omnify/bin"
OMNI_DIR="/home/jonathan/omni"

#for v in [SNEMI3DTestVolume,SNEMI3DTrainVolume]

for v in [SNEMI3DTestVolume]
	# machine_labels=convert(Array{UInt32},v.machine_labels)
	image=v.image
	
	# dend[1]=1
	# dend[2]=2

	#dendValues=zeros(Float32,(1,))
	#dendValues=Float32[1.0]

	# dend=zeros(UInt32,(length(edges),2))

	# dendValues = zeros(Float32,(length(edges),1))
	
	# for (i, edge) in enumerate(edges)
	# 	println(edge)
	# 	dend[i,1:2] = [ UInt32(edge[1]) , UInt32(edge[2])]
	# 	dendValues[i] = Float32(edge[3])
	# end
	#println(size(machine_labels))
	#println(size(dend))
	#println(size(dendValues))
	dirname="$(name(v))Omni"
	run(`mkdir -p $(dirname)`)
	run(`rm -f $(dirname)/image.h5`)
	run(`cp machine_labels.h5 $(dirname)/machine_labels.h5`)

	# run(`rm -f $(dirname)/machine_labels.h5`)

	# h5write("$(dirname)/machine_labels.h5","/main",machine_labels)
	# h5write("$(dirname)/machine_labels.h5","/dend", dend)
	# h5write("$(dirname)/machine_labels.h5","/dendValues",dendValues')
	h5write("$(dirname)/image.h5","/main",image)
	run(`cat omnify.cmd`)
	run(`echo "create:$(name(v)).omni"` |> `cat - omnify.cmd` |> "$(dirname)/omnify$(name(v)).cmd")
	base_dir=pwd()
	cd(dirname)
	run(`$(OMNI_DIR)/omni.omnify --headless --cmdfile=omnify$(name(v)).cmd`)
	cd(base_dir)
end
