@everywhere using Agglomerator
@everywhere using SNEMI3D
@everywhere using SegmentationMetrics
@everywhere using InputOutput
@everywhere using Watershed

filename = "grid_results.jls"

results = nothing
try
  results = InputOutput.load(filename)
catch
  results = Dict()
end

to_compute = []
for low in 0.3:0.1:0.5
  for high in 0.7:0.1:0.9
    for size in 0:50:500

      if (low,high,size) in keys(results)
        continue
      end

      push!(to_compute, (low,high,size) )
    end
  end
end    



@everywhere function run( args )
  low = args[1]
  high = args[2]
  size = args[3]

  seg , tree, max_segid = watershed(SNEMI3D.Test.affinities , low , high , size)
  ri = SegmentationMetrics.rand_index(SNEMI3D.Test.human_labels, seg)
  recall = ri[1][2]
  pres = ri[2][2]

  f1 = 2 *  recall * pres / ( recall + pres )

  println(args => (f1,recall, pres))
  return args => (f1,recall, pres)
end


pmap_results  = pmap(run, to_compute) 

#insert into the results dictionary
for r in pmap_results
  
  try
    println(r)
    results[r[1]] = r[2]
  catch
    println("there was an error")
  end
end

InputOutput.save(filename,results)
