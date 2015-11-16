using Agglomerator, TestUtils
include("test_forest.jl")
#include("test_oracle.jl")
#include("test_mean_affinity.jl")
#include("test_max_affinity.jl")
include("test_forest2.jl")
plot_error(["forest","forest2","oracle","mean_affinity","max_affinity"])
