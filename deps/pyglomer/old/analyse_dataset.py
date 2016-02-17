import sys; import os
sys.path.insert(0, os.path.abspath('../eyewire'))

from shove import Shove
import numpy as np
from matplotlib import pyplot
import pickle
import mesh
import scipy.stats

dataset = Shove("lite://tmp/dataset_b","lite://:memory:")


def histagram_average_displacements():
  bins = np.linspace(0.0, 1.0, 200) 

  pos = [] ; neg = []   
  for key, example in  dataset.iteritems():

    if example['disp_1'] == [] or example['disp_2'] == []:
      continue

    avg_1, avg_2 = np.average(example['disp_1']) , np.average(example['disp_2'])
    avg = (avg_1 + avg_2) / 2.0
    if example['merged']:
      pos.append(avg)
    else:
      neg.append(avg)

  hist_pos, _ = np.histogram(pos, bins=bins, density=True)
  hist_neg, _ = np.histogram(neg, bins=bins, density=True)

  alpha , _ = scipy.stats.ks_2samp(hist_pos, hist_neg)
  print 'Both samples comes from the same distribution with alpha ',alpha ,' .'
  print 'condiered ', len(pos), 'correct merges and ' , len(neg), ' incorrect ones.'

  pyplot.hist(pos, bins, alpha=0.5, label='correct merges', normed=True)
  pyplot.hist(neg, bins, alpha=0.5, label='incorrect merges', normed=True)
  pyplot.legend(loc='upper right')
  pyplot.show()


def histagram_average_first_half_of_displacements():
  bins = np.linspace(0.0, 1.0, 200) 

  pos = [] ; neg = []   
  for key, example in  dataset.iteritems():

    if example['disp_1'] == [] or example['disp_2'] == []:
      continue

    all_displacements = example['disp_1'] + example['disp_2']
    avg = np.average(sorted(all_displacements)[:len(all_displacements)/4])
    if example['merged']:
      pos.append(avg)
    else:
      neg.append(avg)

  # hist_pos, _ = np.histogram(pos, bins=bins, density=True)
  # hist_neg, _ = np.histogram(neg, bins=bins, density=True)

  # alpha , _ = scipy.stats.ks_2samp(hist_pos, hist_neg)
  # print 'Both samples comes from the same distribution with alpha ',alpha ,' .'
  # print 'condiered ', len(pos), 'correct merges and ' , len(neg), ' incorrect ones.'

  pyplot.hist(pos, bins, alpha=0.5, label='correct merges', normed=True, color='g')
  pyplot.hist(neg, bins, alpha=0.5, label='incorrect merges', normed=True, color='r')
  pyplot.legend(loc='upper right')
  pyplot.show()

def plot_scatter_sizes_vs_avg_all():
  
  N = 50
  x = np.random.rand(N)
  y = np.random.rand(N)
  colors = np.random.rand(N)
  area = np.pi * (15 * np.random.rand(N))**2  # 0 to 15 point radiuses

  x = [] ; y = []  ; colors=[]
  for key, example in  dataset.iteritems():

    if example['disp_1'] == [] or example['disp_2'] == []:
      continue

    all_displacements = example['disp_1'] + example['disp_2']
    # avg = np.average(sorted(all_displacements)[:len(all_displacements)/4])
    avg = np.average(all_displacements)

    x.append( len(all_displacements) )
    y.append( avg )
    if example['merged']:
      colors.append('g')
    else:
      colors.append('r')


  pyplot.scatter(x, y, c=colors, alpha=0.5)
  pyplot.show()

def histagram_displacements_directly():

  pos = [] ; neg = []   
  for key, example in  dataset.iteritems():

    if example['disp_1'] == [] or example['disp_2'] == []:
      continue

    if example['merged']:
      pos += example['disp_1'] + example['disp_2']
    else:
      neg += example['disp_1'] + example['disp_2']

  hist_pos, bins_pos = np.histogram(pos, bins=100, density=True)
  hist_neg, bins_neg = np.histogram(neg, bins=100, density=True)

  # alpha , _ = scipy.stats.ks_2samp(hist_pos, hist_neg)
  # print 'Both samples comes from the same distribution with alpha ',alpha ,' .'
  # print 'condiered ', len(pos), 'correct merges and ' , len(neg), ' incorrect ones.'
 
  width_pos = 0.7 * (bins_pos[1] - bins_pos[0])
  center_pos = (bins_pos[:-1] + bins_pos[1:]) / 2
  pyplot.bar(center_pos, hist_pos, align='center', width=width_pos, alpha=0.5, label='correct merges' , color="g")


  width_neg = 0.7 * (bins_neg[1] - bins_neg[0])
  center_neg = (bins_neg[:-1] + bins_neg[1:]) / 2
  pyplot.bar(center_neg, hist_neg, align='center', width=width_neg, alpha=0.5, label='incorrect merges', color="r")

  pyplot.legend(loc='upper right')
  pyplot.show()

def supervise_learning():

  def get_features_for_disp( disp ):

    contact_size = len(disp)
    average_displacement = np.average(disp)
    smallest_4 = np.average(sorted(disp)[:len(disp)/4])
    smallest_3 = np.average(sorted(disp)[:len(disp)/3])
    smallest_2 = np.average(sorted(disp)[:len(disp)/2])

    largest_4 = np.average(sorted(disp)[-len(disp)/4:])
    largest_3 = np.average(sorted(disp)[-len(disp)/3:])
    largest_2 = np.average(sorted(disp)[-len(disp)/2:])

    return [contact_size, average_displacement, smallest_4, smallest_3, smallest_2, largest_4, largest_3, largest_2]

  x = [] ; y = []   
  for key, example in  dataset.iteritems():

    if example['disp_1'] == [] or example['disp_2'] == []:
      continue

    disp_1_features = get_features_for_disp(example['disp_1'])
    disp_2_features = get_features_for_disp(example['disp_2'])
    disp_all = get_features_for_disp(example['disp_1'] + example['disp_2'])

    features =  disp_1_features +  [example['size_1']] + disp_2_features + [example['size_2']] + disp_all 
    features = np.array(features)
    if np.isnan(features).any() :
      continue

    x.append(features)
    if example['merged']:
      y.append(1)
    else:
      y.append(0)

  x = np.array(x)
  y = np.array(y)

  np.save('features_x.npy',x)
  np.save('features_y.npy',y)

  return


if __name__ == '__main__':
  x = np.load('features_x.npy')
  y = np.load('features_y.npy')

  # print sum(y) / float(len(y))
  
  # from  sklearn.ensemble import RandomForestClassifier
  from sklearn.tree import DecisionTreeClassifier
  from sklearn.metrics import *
  from sklearn.cross_validation import train_test_split

  X_train, X_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)
  model = DecisionTreeClassifier()
  model.fit(X_train,y_train)
  y_pred = model.predict(X_test)
  
  # from sklearn import cross_validation
  # cv = cross_validation.ShuffleSplit(x.shape[0], n_iter=10, test_size=0.2, random_state=0)
  # scores =  cross_validation.cross_val_score( model , x , y, cv=cv)

  # print("Accuracy: %0.2f (+/- %0.2f)" % (scores.mean(), scores.std() * 2))


  print classification_report(y_test, y_pred)
# mesh.display_pair(57615, 1427, 1091)


