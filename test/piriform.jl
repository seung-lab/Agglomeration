#=
Module piriform

=# 
__precompile__()
module piriform
using Agglomerator #import paths to other modules
using Datasets


function __init__()
  FOLDER_TEST= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/piriform/test"))

  global Test = Datasets.add_dataset(:PiriformTrain,
                                      "$FOLDER_TEST/affinities.h5", 
                                      "$FOLDER_TEST/machine_labels.h5",
                                      "$FOLDER_TEST/human_labels.h5")

  FOLDER_TRAIN= abspath(string( dirname(@__FILE__) ,"/../deps/datasets/piriform/test"))

  global Train = Datasets.add_dataset(:PiriformTrain,
                                      "$FOLDER_TRAIN/affinities.h5", 
                                      "$FOLDER_TRAIN/machine_labels.h5",
                                      "$FOLDER_TRAIN/human_labels.h5")
end 


end #module
