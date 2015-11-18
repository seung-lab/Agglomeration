using Agglomerator

using SNEMI3D
using HDF5
using InputOutput


image=InputOutput.load("image.jls")
h5write("image.h5","/main",image)

#change to seungmount/research/Jingpeng/09_pypipeline/omnify/bin
#OMNI_DIR="/usr/people/it2/seungmount/research/Jingpeng/09_pypipeline/omnify/bin"
OMNI_DIR="/home/jonathan/omni"

#for v in [SNEMI3DTestVolume,SNEMI3DTrainVolume]

# for v in [SNEMI3DTestVolume]
# 	# machine_labels=convert(Array{UInt32},v.machine_labels)
# 	image=Save.load("image.jls")
	
# 	# dend[1]=1
# 	# dend[2]=2


# 	#dendValues=zeros(Float32,(1,))
# 	#dendValues=Float32[1.0]


# 	#println(size(machine_labels))
# 	#println(size(dend))
# 	#println(size(dendValues))
# 	outputdir="./"
# 	# run(`mkdir -p $(outputdir)`)

# 	run(`rm -f $(outputdir)/machine_labels.h5`)
# 	run(`rm -f $(outputdir)/image.h5`)

# 	run(`cp machine_labels.h5 $(outputdir)/machine_labels.h5`)
# 	#h5write("$(outputdir)/machine_labels.h5","/main",machine_labels)
# 	#h5write("$(outputdir)/machine_labels.h5","/dend",dend)
# 	#h5write("machine_labels.h5","/dendValues",dendValues)
# 	h5write("$(outputdir)/image.h5","/main",image)
# 	run(`cat $(dirname(@__FILE__))/omnify.cmd`)
# 	run(`echo "create:$(name(v)).omni"` |> `cat - $(dirname(@__FILE__))/omnify.cmd` |> "$(outputdir)/omnify$(name(v)).cmd")
# 	base_dir=pwd()
# 	cd(outputdir)
# 	run(`$(OMNI_DIR)/omni.omnify --headless --cmdfile=omnify$(name(v)).cmd`)
# 	cd(base_dir)
# end
