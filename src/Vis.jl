module Vis
#Usage:
#call vis_init()
#then call disp(...) where ... is a three-dimensional array of floats in [0.0,1.0] or a tuple thereof

using DataStructures
export disp, vis_init, colorize, new_colormap

vis_remote_path="$(Base.source_dir())/vis_remote.jl"
viewers=[]

function disp(viewer,x)
	wait(viewer[2])
	@spawnat (viewer[1]) Main.disp_remote(x)
	#end
end
disp(x)=disp(last(viewers),x)
function new_colormap(;frac=1.0,zero_color=Float32[0.0,0.0,0.0,0.0])
	colormap=DefaultDict(()->Float32[rand(),rand(),rand(),if rand()<=frac; 1.0; else 0.0; end])
	colormap[0]=zero_color
	colormap
end
function colorize{T}(A::Array{T,3};colormap=new_colormap())
	B=Array(Float32,tuple(size(A)...,4))
	for k in 1:size(A,3),j in 1:size(A,2), i in 1:size(A,1)
		B[i,j,k,:]=colormap[A[i,j,k]]
	end
	B
end
function vis_init()
	vis_process_id=addprocs(1)[1]
	push!(viewers,(vis_process_id,remotecall(vis_process_id,include,vis_remote_path)))
	last(viewers)
end
end
