using Agglomerator

using TestUtils
using Agglomerators,Features

ag=LinearAgglomerator(
Function[
x->mean_affinity(x[3]),
],
[1.0])
run_test(ag,"mean_affinity","piriform")
