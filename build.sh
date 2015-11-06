julia -e 'Pkg.build("Agglomerator")'
if [ -f test/runtests.jl ]; then
  julia --check-bounds=yes -e 'Pkg.test("$Agglomerator", coverage=true)'
fi
