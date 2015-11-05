#=
This module takes path to required files to run agglomeration
and it constructs a volume 
=#

module HDF5Volume

import Volumes
using HDF5
using Logging

Logging.configure(level=DEBUG)

function forward_pass(hdf5_args)

  vol = Volumes.Volume(hdf5_args)

end


function Volumes.Volume(hdf5_args::Dict{ASCIIString,ASCIIString})

  affinities = h5read(hdf5_args["aff"],"/main")
  machine_labels = h5read(hdf5_args["ws"], "/main")

  if size(affinities)[1:3] != size(machine_labels)
    Logging.critical("Affinities and Watershed sizes doesn't match $(size(affinities)[1:3]) != $(size(machine_labels))")
    return
  end

  if size(affinities)[4] != 3 
    Logging.critical("Affinites last dimension length should equal 3")
    return
  end

  s=size(machine_labels)
  n=maximum(machine_labels)

  image = zeros(0,0,0)
  human_labels = zeros(0,0,0)
  m=0 #maximum(human_labels)
  return Volumes.Volume{:HDF5}(image,affinities,machine_labels,human_labels,s,n,m)

end
end