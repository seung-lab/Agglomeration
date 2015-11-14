#=
Module SNEMI3D

This module loads the SNEMI3D dataset
http://brainiac2.mit.edu/SNEMI3D/

is this training and test data?

The images are 1000x1000x100 and there are about 400 labelled segments
=# 
__precompile__()
module SNEMI3D
using Agglomerator #import paths to other modules
using Datasets


function __init__()
  FOLDER_TRAIN= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/ds_train"))

  global Train = Datasets.add_dataset(:SNEMI3DTrain,
                                      "$FOLDER_TRAIN/affinities.jls", 
                                      "$FOLDER_TRAIN/machine_labels.jls",
                                      "$FOLDER_TRAIN/human_labels.jls")

  FOLDER_TEST= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/ds_test"))

  global Test = Datasets.add_dataset(:SNEMI3DTest,
                                      "$FOLDER_TEST/affinities.jls", 
                                      "$FOLDER_TEST/machine_labels.jls",
                                      "$FOLDER_TEST/human_labels.jls")
end 


end #module
