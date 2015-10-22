module Features
using Volumes3
using Memoize

@memoize function measure(x::TreeRegion)
	measure(x.left) + measure(x.right)
end
@memoize function measure(x::AtomicRegion)
	length(x.voxels)
end

end
