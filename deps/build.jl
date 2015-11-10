run(`git submodule update --init`)
run(`cython -V`)
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

