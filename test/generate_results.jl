include("TestUtils.jl")
using TestUtils
#include("test_forest.jl")
#include("test_oracle.jl")
#include("test_mean_affinity.jl")
#include("test_max_affinity.jl")
#include("test_forest2.jl")
#plot_error(["forest","forest2","oracle","mean_affinity","max_affinity"])
plot_error(["forest_forced_0.01","forest_forced_0.1", "forest_forced_0.2", "forest_forced_0.3","forest", "mean_affinity","oracle"])
#plot_error(["mean_affinity"])
