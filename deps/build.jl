using HDF5

run(`git submodule update --init`)
seg= abspath(string( dirname(@__FILE__) ,"/../deps/seg-error/"))
run(`make -C $seg`)


file_tails = ["affinities.jls.gz","human_labels.jls.gz","image.jls.gz","machine_labels.jls.gz"]

train= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/SNEMI3D/ds_train"))
test= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/SNEMI3D/ds_test"))

for tail in file_tails

  full_path_train = string(train,"/",tail)
  isfile( full_path_train ) && run(`gzip -d $(full_path_train)`)

  full_path_test  = string(test, "/",tail)
  isfile( full_path_test  ) && run(`gzip -d $(full_path_test )`)

end

#=
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
=#
