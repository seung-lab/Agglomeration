using Agglomerator
using Process
using InputOutput
using MST

FOLDER = abspath(string( dirname(@__FILE__) ,"/../deps/datasets/SNEMI3D/ds_train"))
affinities = load("$FOLDER/affinities.jls")
machine_labels = load("$FOLDER/machine_labels.jls")

mst = Process.forward(affinities, machine_labels)
MST.saveBinary(mst, "mst.data")
