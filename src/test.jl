using SNEMI3D
using Agglomerators
using Features
using Volumes
using SegmentationMetrics

ag=Agglomerators.LinearAgglomerator([x->Features.max_affinity(x[3])],[1.0])

rg=Agglomerators.finest_region_graph(SNEMI3DVolume)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
Agglomerators.apply_agglomeration!(rg,ag,0.8)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
Agglomerators.apply_agglomeration!(rg,ag,0.75)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
Agglomerators.apply_agglomeration!(rg,ag,0.70)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
Agglomerators.apply_agglomeration!(rg,ag,0.0)
rand_index(SNEMI3DVolume.human_labels,rg|>Agglomerators.flatten)|>println
