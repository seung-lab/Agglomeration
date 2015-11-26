@everywhere using Agglomerator
@everywhere using SNEMI3D
@everywhere using SegmentationMetrics
@everywhere using InputOutput
@everywhere using Watershed
@everywhere using Images


filename = "grid_results_smothing.jls"
results = nothing
try
  results = InputOutput.load(filename)
catch
  results = Dict()
end

to_compute = []
for smothing in 1:2:9
  for low in 0.1:0.1:0.4
    for high in 0.78:0.02:0.85
      if (low,high,smothing) in keys(results)
        continue
      end

      push!(to_compute, (low,high, smothing) )
    end
  end
end    



@everywhere function run( args )
  low = args[1]
  high = args[2]
  smothing = args[3]


  aff = SNEMI3D.Test.affinities
  aff[:,:,:,1] = imfilter(aff[:,:,:,1], imaverage([smothing, smothing]))
  aff[:,:,:,2] = imfilter(aff[:,:,:,2], imaverage([smothing, smothing]))
  aff[:,:,:,3] = imfilter(aff[:,:,:,3], imaverage([smothing, smothing]))
  

  sz = 250
  seg , tree, max_segid = watershed(aff , low , high , sz)
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
