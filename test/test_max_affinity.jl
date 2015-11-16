using TestUtils
using Agglomerators,Features

ag=LinearAgglomerator(
Function[
x->max_affinity(x[3]),
],
[1.0])
run_test(ag,"max_affinity")
