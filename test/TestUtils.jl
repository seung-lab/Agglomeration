module TestUtils

using Agglomerator
using Base.Test

using SNEMI3D, Agglomerators, LabelData, SegmentationMetrics,Datasets,MST,InputOutput, piriform
using DataFrames
using Gadfly

export run_test, save_error, plot_error

function run_test(ag,name, dataset="SNEMI3D")

	if dataset == "SNEMI3D"
		from = "$(dirname(@__FILE__))/../deps/datasets/SNEMI3D/us_test/omni/Empty.omni"
  	to = "$(dirname(@__FILE__))/../deps/datasets/SNEMI3D/us_test/omni/$(name).omni"
		copy_omni_project(from, to)
		mst_path = "$(dirname(@__FILE__))/../deps/datasets/SNEMI3D/us_test/omni/$(name).omni.files/users/_default/segmentations/segmentation1/segments/mst.data"
		rg=LabelData.atomic_region_graph(SNEMI3D.Test.edges,:SNEMI3DTest)

	else
		# from = "$(dirname(@__FILE__))/../deps/datasets/pirifrom/train/omni/Empty.omni"
  # 	to = "$(dirname(@__FILE__))/../deps/datasets/pirifrom/train/omni/$(name).omni"
		# copy_omni_project(from, to)

		mst_path = "$(dirname(@__FILE__))/../deps/datasets/piriform/train/omni/mst.data"
		rg=LabelData.atomic_region_graph(piriform.Test.edges,:PiriformTrain)
	end

	#apply the oracle agglomerator with a given threshold
	# sm=[]
	# for threshold in reverse(0.0:0.5:1.0)
	# 	apply_agglomeration!(rg,ag,threshold)
	# 	push!(sm,Datasets.compute_error(rg))
	# 	if length(keys(rg))<=2
	# 		break
	# 	end
	# end
	
	apply_agglomeration!(rg,ag,0.5)
	mst=MST.build_mst(rg)
	MST.saveBinary(mst,mst_path)

	# save_error(sm,name)
end

function copy_omni_project(from_project_path, to_project_path)

	cp(from_project_path,to_project_path; remove_destination=true)
	cp(string(from_project_path,".files"),string(to_project_path,".files"); remove_destination=true)

end

results_file="$(dirname(@__FILE__))/results.jls"
function save_error(sm,name)
	d=DataFrame(both=map(x->x[1],sm), split=map(x->x[2], sm), merge=map(x->x[3],sm), label=name)
	if !isfile(results_file)
		x=Dict()
		save(results_file,x)
	end

	results=load(results_file)
	results[name]=d
	save(results_file,results)
end

function plot_error(labels)
	results=load(results_file)

	data=vcat([results[k] for k in labels]...)
	draw(SVG("results.svg", 6inch, 4inch), plot(data,x="split",y="merge",color="label",Geom.line,Coord.Cartesian(ymin=0.0,ymax=3.0,xmin=0.0,xmax=1.0)))
end
end
