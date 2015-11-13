#=
This package add the src directory to the LOAD_PATH
so other modules can be correctly import or use

=#

module Agglomerator

 
function __init__()
  add_path("/Agglomerator/src/")
  add_path("/Agglomerator/src/InputOutput")
  add_path("/Agglomerator/src/Features")
  add_path("/Agglomerator/src/Visualization")
  add_path("/Agglomerator/test")

end


function add_path(path)
  src_path = string(Pkg.dir(),path)
  if !(src_path in LOAD_PATH)  
    push!(LOAD_PATH, src_path)
  end
end

end #module