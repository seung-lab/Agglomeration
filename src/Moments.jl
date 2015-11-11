#=
Module Moments

Util for Moments based features

=#

module Moments
using Agglomerator #import paths to other modules

export Expansion,lift_point,⊗

immutable Expansion
	data::Tuple
end
function ⊗{T,n,m}(A::Array{T,n},B::Array{T,m})
	reshape(T[x*y for x in A, y in B],tuple(size(A)...,size(B)...))
end
	
function Base.(:*)(x::Expansion,y::Expansion)
	@assert length(x.data)==length(y.data)
	n=length(x.data)
	Expansion(tuple([
	sum([
	x.data[j]⊗y.data[i-j+1]
	for j in 1:i])
	for i in 1:n
	]...))
end

Base.getindex(x::Expansion,i)=x.data[i+1]

One=reshape(Float64[1.0],())
immutable Zero
end
⊗(::Zero,::Zero)=Zero()
⊗(x,::Zero)=Zero()
⊗(::Zero,x)=Zero()
Base.(:+)(::Zero,::Zero)=Zero()
Base.(:+)(::Zero,x)=x
Base.(:+)(x,Zero)=x

function lift_point(x,n)
	t=Float64[1.0,x...]
	Expansion(tuple(
	[1/factorial(i)*opow(t,i) for i in 0:n]...
	)
	)
end

function opow(x,n::Int)
	if n<=0
		One
	else
		x ⊗ opow(x,n-1)
	end
end

#=
x=Expansion(tuple(
One,
[1.0,0.5],
Zero(),
Zero(),
))
println(x)
println(x*x)
println(x*x*x)
=#

#=
x=randn((3,3))
y=randn((3,3))
z=randn((3,3))

println(maximum(abs((x⊗y)⊗z - x⊗(y⊗z))))
=#

#=
x=lift_point([3.0,4.0,5.0],4)
println(x*x*x)
=#

end
