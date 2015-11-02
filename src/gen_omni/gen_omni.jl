using SNEMI3D
using Volumes
using HDF5
name{vol}(v::Volume{vol})=string(vol)

#change to seungmount/research/Jingpeng/09_pypipeline/omnify/bin
OMNI_DIR="/usr/people/it2/seungmount/research/Jingpeng/09_pypipeline/omnify/bin"

for v in [SNEMI3DTestVolume,SNEMI3DTrainVolume]
	machine_labels=convert(Array{Uint32},v.machine_labels)
	image=v.image
	
	dend=zeros(UInt32,(1,2))
	dend[1]=1
	dend[2]=2

	#dendValues=zeros(Float32,(1,))
	#dendValues=Float32[1.0]

	#println(size(machine_labels))
	#println(size(dend))
	#println(size(dendValues))
	dirname="$(name(v))Omni"
	run(`mkdir -p $(dirname)`)
	run(`rm -f $(dirname)/machine_labels.h5`)
	run(`rm -f $(dirname)/image.h5`)

	h5write("$(dirname)/machine_labels.h5","/main",machine_labels)
	h5write("$(dirname)/machine_labels.h5","/dend",dend)
	#h5write("machine_labels.h5","/dendValues",dendValues)
	h5write("$(dirname)/image.h5","/main",image)
	run(`cat omnify.cmd`)
	run(`echo "create:$(name(v)).omni"` |> `cat - omnify.cmd` |> "$(dirname)/omnify$(name(v)).cmd")
	base_dir=pwd()
	cd(dirname)
	run(`$(OMNI_DIR)/omni.omnify --headless --cmdfile=omnify$(name(v)).cmd`)
	cd(base_dir)
end
