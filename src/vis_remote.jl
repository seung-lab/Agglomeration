using Agglomerator #import paths to other modules

using PyCall
using Vis

function disp_remote(x)
	vis.disp(x)
end

unshift!(PyVector(pyimport("sys")["path"]),Base.source_dir())

pygui_start(:qt)
#pygui_start(:tk)
@pyimport vis
