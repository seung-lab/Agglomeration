using Agglomeration
using Process
using Save
using Base.Test

LOAD_DIR=("$(dirname(@__FILE__))/../deps/datasets/SNEMI3D/ds_test/")
const machine_labels = convert(Array{UInt32,3},Save.load("$(LOAD_DIR)machine_labels.jls"))
const affinities = convert(Array{Float32,4}, Save.load("$(LOAD_DIR)affinities.jls"))
Process.forward(affinities, machine_labels)
