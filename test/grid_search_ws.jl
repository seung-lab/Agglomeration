using Agglomerator
using SNEMI3D
using SegmentationMetrics
using InputOutput
include("../deps/watershed/src-julia/watershed.jl")

filename = "grid_results.jls"
aff = SNEMI3D.Test.affinities

results = nothing
try
  results = InputOutput.load(filename)
catch
  results = Dict()
end

for low in 0.0:0.01:0.5
  for high in 0.5:0.01:1.0
    for size in 0:25:500

      if (low,high,size) in keys(results)
        continue
      end
      seg , tree, max_segid = watershed(aff, low , high , size)
      ri = SegmentationMetrics.rand_index(SNEMI3D.Test.human_labels, seg)
      recall = ri[1][2]
      pres = ri[2][2]

      f1 = 2 *  recall * pres / ( recall + pres )

      results[(low,high,size)] = (f1,recall, pres)

     end

     InputOutput.save(filename,results)
  end
end

println(results)
