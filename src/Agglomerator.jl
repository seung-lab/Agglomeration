#=
This package add the src directory to the LOAD_PATH
so other modules can be correctly import or use

=#
__precompile__()
module Agglomerator
 
function __init__()
  src_path = string(Pkg.dir(),"/Agglomerator/src/")
  if !(src_path in LOAD_PATH)  
    push!(LOAD_PATH, src_path)
  end
end

end #module