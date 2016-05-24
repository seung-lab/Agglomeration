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
