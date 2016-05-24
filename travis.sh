#!/bin/bash

julia -e 'Pkg.clone(pwd())'
julia -e 'Pkg.build("Agglomeration")'
if [ -f test/runtests.jl ]; then
  julia --check-bounds=yes -e 'Pkg.test("Agglomeration", coverage=false)'
fi

#That warning occurs when inlining is turned off.
#Pkg.test turns off inlining when called with `coverage=true`.
#This is so the coverage metrics don't miss small functions that always get inlined.
#It also definitely causes things to run a lot slower.

