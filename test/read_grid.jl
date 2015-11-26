using Agglomerator
using InputOutput
using Gadfly

filename = "grid_results_smothing.jls"

results = InputOutput.load(filename)


# for i = 1:3 
#   xs = []
#   ys = []
#   arg = ["low-smoth","high-smoth","size-smoth"][i]
#   for (k , v) in results

#     push!(xs, k[i])
#     push!(ys, v[1])

#   end
#   draw(SVG("$arg.svg", 6inch, 4inch), plot(x=xs, y=ys, Geom.point))

# end 


max_f = 0.0
for (k , v) in results

  if max_f < v[1]
    max_f = v[1]
    println(k, v)
  end

end

