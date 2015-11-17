using HDF5

machine_labels=h5read("machine_labels2.h5","/main")
dend=h5read("machine_labels2.h5","/dend")
dendValues=h5read("machine_labels2.h5","/dendValues")
machine_labels=convert(Array{UInt32},cat(3,[kron(machine_labels[:,:,i],ones((3,3))) for i in 1:size(machine_labels,3)]...))
padded=zeros((1000,1000,88))
padded[1:999,1:999,1:88]=machine_labels
padded=convert(Array{Uint32},padded)

run(`rm machine_labels.h5`)
h5write("machine_labels.h5","/main",padded)
h5write("machine_labels.h5","/dend",dend)
h5write("machine_labels.h5","/dendValues",dendValues)
