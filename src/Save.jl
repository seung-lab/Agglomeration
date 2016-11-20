#__precompile__()
module Save
using HDF5

export save, load, save_binary, load_binary

function save(file::AbstractString,x)
	f=open(file,"w")
	serialize(f,x)
	close(f)
end
function save_binary{T}(prefix::AbstractString,x::Array{T})
	f=open("$(prefix).raw","w")
	write(f,x)
	close(f)
	f2=open("$(prefix).meta","w")
	write(f2,"$(T)$(size(x))")
	close(f2)
end
function save_h5(prefix::AbstractString,x)
	h5open("$(prefix).h5", "w") do file
		write(file, "/main", x)
	end
end
function load_h5(prefix::AbstractString)
	h5read("$(prefix).h5", "/main")
end

function load(file::AbstractString)
	return deserialize(open(file,"r"))
end
function load_binary(prefix::AbstractString)
	f2=open("$(prefix).meta","r")
	spec=parse(readline(f2))
	close(f2)
	T=eval(spec.args[1])
	dims=tuple(spec.args[2:end]...)

	f=open("$(prefix).raw","r")
	A=Array(T,dims)
	read!(f,A)
	close(f)
	A
end
end
