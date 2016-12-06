using Agglomeration
using Agglomerators
include("TestUtils.jl")
using TestUtils

load_dataset("~/datasets/AC3/test/")
run_test("mean_affinity", Agglomerators.MeanAffinityAgglomerator(), thresh=0.0)
