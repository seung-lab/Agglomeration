import h5py
import numpy as np
f = h5py.File('/usr/people/it2/code/Agglomerator/deps/pyglomer/spark/tmp/small_ml_dr5.h5','r')

unique, counts = np.unique(f['main'] , return_counts=True)
    
segment_sizes = dict(zip(unique, counts))

# seg_id = 11857
seg_id = 14461
print segment_sizes[seg_id]

x,y,z =  np.where(f['main'][:,:,:] == seg_id)

for i in range(len(x)):
  print x[i], y[i], z[i]
# f.create_dataset("fixed", (64,384,384), dtype='uint32', chunks=(64,64,64))
# f['fixed'][:,:,:] = f['main'][:64,:384,:384]
# s = np.asarray(f['fixed'].shape) - 1
# f['fixed'][0,:,:] = 0
# f['fixed'][:,0,:] = 0
# f['fixed'][:,:,0] = 0
# f['fixed'][s[0],:,:] = 0
# f['fixed'][:,s[1],:] = 0
# f['fixed'][:,:,s[2]] = 0

#find . -type f -exec gzip "{}" \; -exec mv "{}.gz" "{}" \;


f.close()