using SNEMI3DS
using Agglomerators
using Features

ag=Agglomerators.LinearAgglomerator([x->Features.measure(x[1])+Features.measure(x[2])],[-1.0])

s=Agglomerators.Segmentation(SNEMI3DVolume)
Agglomerators.apply_agglomeration(s,ag,-1000)
