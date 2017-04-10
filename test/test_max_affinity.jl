using Agglomeration
using Agglomerators
include("TestUtils.jl")
using TestUtils

load_dataset("~/Piriform/test/")
run_test("max_affinity", Agglomerators.MaxAffinityAgglomerator())
