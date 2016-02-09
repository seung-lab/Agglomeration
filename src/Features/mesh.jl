
using ModernGL
using FileIO, MeshIO, GLAbstraction, GLVisualize, Reactive, GLWindow
using ColorTypes, Colors
using Meshes
using GeometryTypes

s = SignedDistanceField(HyperRectangle(Vec(0,0,0.),Vec(1,1,1.))) do v
           sqrt(sum(dot(v,v))) - 1 # sphere
       end
m = HomogenousMesh(s) # uses Marching Tetrahedra from Meshing.jl
save("eighth_sphere.ply",m)

function show()
    w, renderloop = glscreen()


    view(visualize(GLNormalMesh("eighth_sphere.ply")), w, method=:perspective)
    glClearColor(1,1,1,1)

    renderloop()
end

show()