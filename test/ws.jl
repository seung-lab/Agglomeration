using Agglomerator
using Datasets
using ImageView
using Images
using SNEMI3D
using SegmentationMetrics
using FileIO

#If we are not in a REPL
function close_on_destroy(imgc)
  if (!isinteractive())

      # Create a condition object
      c = Condition()

      # Get the main window (A Tk toplevel object)
      win = toplevel(imgc)

      # Notify the condition object when the window closes
      bind(win, "<Destroy>", e->notify(c))

      # Wait for the notification before proceeding ... 
      wait(c)
  end
end

function show_plane( plane )
  colormap = rand(Float32, max_segid+1, 3)

  img = Array(Float32, size(seg)[1], size(seg)[2], 3)
  for x= 1:size(seg)[1]
    for y = 1:size(seg)[2]  

          if seg[x,y,plane] == 0
            img[x,y,:] = [0.0 0.0 0.0]
            continue
          end
          img[x,y,:] = colormap[seg[x,y,plane],:]
    end
  end

  imgc, imgslice = view(img)
  close_on_destroy(imgc)
end

aff = SNEMI3D.Test.affinities
aff[:,:,:,1] = imfilter(aff[:,:,:,1], imaverage([1,1]))
aff[:,:,:,1] = imfilter(aff[:,:,:,2], imaverage([1,1]))
aff[:,:,:,1] = imfilter(aff[:,:,:,3], imaverage([1,1]))
imgc, imgslice = view(aff[:,:,10,1])
close_on_destroy(imgc)

include("../deps/watershed/src-julia/watershed.jl")

seg , tree, max_segid = watershed(aff,0.3,.81)
println(SegmentationMetrics.rand_index(SNEMI3D.Test.human_labels, seg))

show_plane(10)


# (333,333,88)
# found: 1482123 components

# julia ws.jl  18.87s user 0.66s system 102% cpu 19.104 total


# # # rand index
# with gausians of size 1
# found: 357387 components

# Region graph size: 2137622
# Sorted
# Done with merging
# Done with remapping, total: 2491 regions
# Done with updating the region graph, size: 18367
# (:recall=>0.7580685287195625,:precision=>0.9647762208373173)


# found: 646504 components

# Region graph size: 3479450
# Sorted
# Done with merging
# Done with remapping, total: 3891 regions
# Done with updating the region graph, size: 26454


# Jonathan best
# .97  .79 