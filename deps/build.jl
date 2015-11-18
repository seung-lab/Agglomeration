using HDF5

run(`git submodule update --init`)
seg= abspath(string( dirname(@__FILE__) ,"/../deps/seg-error/"))
run(`make -C $seg`)

train= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/ds_train"))
run(`gzip -d $(train)/affinities.jls.gz`)
run(`gzip -d $(train)/human_labels.jls.gz`)
run(`gzip -d $(train)/image.jls.gz`)
run(`gzip -d $(train)/machine_labels.jls.gz`)

test= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/ds_test"))
run(`gzip -d $(test)/affinities.jls.gz`)
run(`gzip -d $(test)/human_labels.jls.gz`)
run(`gzip -d $(test)/image.jls.gz`)
run(`gzip -d $(test)/machine_labels.jls.gz`)


# Upsample
for  folder in ["test"]
  machine_labels=h5read("$(dirname(@__FILE__))/datasets/ds_$(folder)/machine_labels.h5","/main")
  dend=h5read("$(dirname(@__FILE__))/datasets/ds_$(folder)/machine_labels.h5","/dend")
  dendValues=h5read("$(dirname(@__FILE__))/datasets/ds_$(folder)/machine_labels.h5","/dendValues")
  machine_labels=convert(Array{UInt32},cat(3,[kron(machine_labels[:,:,i],ones((3,3))) for i in 1:size(machine_labels,3)]...))
  padded=zeros((1000,1000,88))
  padded[1:999,1:999,1:88]=machine_labels
  padded=convert(Array{UInt32},padded)

  # rm("$(dirname(@__FILE__))/datasets/us_$(folder)/machine_labels.h5")
  h5write("$(dirname(@__FILE__))/datasets/us_$(folder)/machine_labels.h5","/main",padded)
  h5write("$(dirname(@__FILE__))/datasets/us_$(folder)/machine_labels.h5","/dend",dend)
  h5write("$(dirname(@__FILE__))/datasets/us_$(folder)/machine_labels.h5","/dendValues",dendValues)
end