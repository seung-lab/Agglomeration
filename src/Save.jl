#=
Module Save
=#

module Save
using Agglomerator #import paths to other modules

using  Logging
Logging.configure(level=DEBUG)


export save, load, save_binary, save_znn,load_binary,load_znn

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
function save_znn{T}(prefix::AbstractString, x::Array{T}, opt::Dict, y::AbstractString)
	f=open("$(prefix).$(opt["ext"])","w")
	write(f,x)
	close(f)
	f2=open("$(prefix).spec","a")
	println(f2,"[$(y)]")
	for (key,value) in opt
		println(f2,"$(key)=$(value)")
	end
	close(f2)
	f3=open("$(prefix).$(opt["ext"]).size","w")
	for i in size(x)
		write(f3,convert(Int32,i))
	end
	close(f3)
end
function save_znn(prefix::AbstractString, opt::Dict, y::AbstractString)
	f2=open("$(prefix).spec","a")
	println(f2,"[$(y)]")
	for (key,value) in opt
		println(f2,"$(key)=$(value)")
	end
	close(f2)
end
function load_znn(prefix::AbstractString)
	dims=Int32[]
	f=open("$(prefix).size","r")
	while(!eof(f))
		push!(dims,read(f,Int32))
	end
	close(f)
	A=zeros(Float64,dims...)
	f2=open("$(prefix)","r")
	read!(f2,A)
	close(f2)
	A
end

function load(file::AbstractString)
	if !isfile(file)
    Logging.critical("file path doesn't exist: $file ")
	end


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
