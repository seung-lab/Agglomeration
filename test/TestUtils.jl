module TestUtils

using Agglomeration
using Agglomerators, RegionGraphs, SegmentationMetrics
using DataFrames
using Gadfly
using HDF5
using Save

export run_test, save_error, plot_error, load_dataset
export machine_labels, human_labels, affinities, semantic_guess

function run_test(name, ag; thresh=0.5)
	println("testing $(name)")
	rg,vertices,edges=RegionGraphs.compute_regiongraph(machine_labels, affinities)

	incidence = SegmentationMetrics.incidence_matrix(machine_labels, human_labels)
	normalized_soft_label, soft_label = SegmentationMetrics.soft_label_factory(incidence)
	errors=[]
	Agglomerators.priority_apply_agglomeration2!(rg, ag, thresh; error_fun = (()-> push!(errors,SegmentationMetrics.rand_index(rg, soft_label))), report_freq=100)

	save_error(errors, name)
end

function load_dataset(s::AbstractString)
	LOAD_DIR=expanduser(s)
	ranges=(1:500,1:500,1:100)
	global machine_labels = convert(Array{UInt32,3},h5read("$(LOAD_DIR)machine_labels.h5","/main"))#[ranges...]
	global human_labels = convert(Array{UInt32,3},h5read("$(LOAD_DIR)human_labels.h5","/main"))#[ranges...]
	global affinities = convert(Array{Float32,4}, h5read("$(LOAD_DIR)affinities.h5","/main"))#[ranges...,:]
end

const results_file="$(dirname(@__FILE__))/results.jls"

function save_error(sm,name)
	d=DataFrame(precision=map(x->x[:precision], sm), recall=map(x->x[:recall],sm), vi_precision=map(x->x[:vi_precision],sm), vi_recall=map(x->x[:vi_recall],sm),label=name)
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
	println(data)
	draw(SVG("results.svg", 6inch, 4inch), plot(data,x="vi_precision",y="vi_recall",Guide.xlabel("vi_precision"), Guide.ylabel("vi_recall"),color="label",Geom.line,Coord.Cartesian(ymin=0.0,ymax=0.5,xmin=0.0,xmax=0.5)))
end
end
