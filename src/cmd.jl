#=
This module is meant to be run from a terminal
it takes path to files necessary to run agglomeration

=#
module cmd
using Agglomerator #import paths to other modules

using HDF5Volume

using ArgParse , Logging
Logging.configure(level=DEBUG)



function parse_commandline(possible_agglomerators)
    s = ArgParseSettings()

    s.prog = "agglomerator"
    s.description = "It takes the watershed and znn output hdf5,\n to use as features to merge supervoxels,\n the new MST is exported as an hdf5 which can be omnify"
    s.add_version = true
    s.version = "0.1.0"


    @add_arg_table s begin
        "-w","--watershed"
            help = "Watershed hdf5 file path"
            arg_type = ASCIIString
            required = true
        "-a", "--affinities"
            help = "Affinity hdf5 file path , i.e. znn output"
            arg_type = ASCIIString
            required = true
        "-g","--agglomerator"
            help = "Agglomeration type to use\n Options:\n $( join(possible_agglomerators, " , ", " or ") )"
            arg_type = ASCIIString
            default =  possible_agglomerators[1]
        "-o", "--output"
            help = "Agglomeration same format as watershed output"
            required = true
    end

    return parse_args(s)
end

function parse_watershed( ws_path )

  if !ispath(ws_path)
    Logging.critical("file path doesn't exist for watershed: $ws_path ")
    return nothing
  end 
  return realpath( ws_path )
end

function parse_affinities( aff_path )
  if !ispath(aff_path)
    Logging.critical("file path doesn't exist for affinities: $aff_path ")
    return nothing
  end 
  return realpath( aff_path )
end

function parse_output( out_path )

  if ispath(out_path)
    Logging.warn("file path does exist for output: $out_path, file will be overwritten ")
  end 
  return abspath( out_path )
end

function parse_agglomerators( agg_name, possible_agglomerators )

  if agg_name in possible_agglomerators
    return agg_name
  end

  Logging.critical("$agg_name is no a valid agglomerator type")
  return nothing
end

function main()
  possible_agglomerators = ["oracle","decisionTree"]
  
  parsed_args = parse_commandline(possible_agglomerators)

  ws = parse_watershed(parsed_args["watershed"])
  aff = parse_affinities(parsed_args["affinities"])
  out = parse_output(parsed_args["output"])
  agg = parse_agglomerators(parsed_args["agglomerator"],possible_agglomerators)
  
  args = Dict("ws"=>ws, "aff"=> aff, "out"=>out, "agg"=>agg)
  if nothing in values(args)
      return
  end

  Logging.debug("All arguments correct")
  HDF5Volume.forward_pass(args)

end

main()

end #module