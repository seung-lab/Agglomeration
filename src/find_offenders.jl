using SNEMI3D
using Volumes

function entropy(v)
	t=filter(x->x>0,v)
	t/=sum(t)
	-sum(AbstractFloat[x*log(x) for x in t])
end

l=[(r.id,length(r.voxels)*entropy(soft_label(r))) for r in regions(SNEMI3DTestVolume)]
offenders=sort(l,by=(x->x[2]))|>reverse
for i in take(offenders,100)
	println(i)
end
