#from http://nishantnath.com/2015/11/29/step-by-step-guide-machine-learning-using-python-on-aws-environment-setup/
sudo yum install python-pip
wget ftp://ftp.hdfgroup.org/HDF5/current/src/hdf5-1.8.16.tar.gz
tar -xvzf hdf5-1.8.16.tar.gz
rm hdf5-1.8.16.tar.gz 
cd hdf5-1.8.16
./configure --prefix=/usr/local/hdf5
make
make check
sudo make install
make check-install
export HDF5_DIR=/usr/local/hdf5
export LD_LIBRARY_PATH=/usr/local/hdf5/lib
export CPLUS_INCLUDE_PATH=/usr/local/hdf5/include
sudo pip install --global-option=build_ext --global-option="-I/usr/local/hdf5/include" --global-option="-L/usr/local/hdf5/lib" h5py 
sudo yum install libjpeg-devel libpng-devel freetype-devel
sudo pip install scikit-image



#for ubuntu
sudo add-apt-repository ppa:webupd8team/java
sudo apt-get update
sudo apt-get install oracle-java9-installer
sudo echo "JAVA_HOME=/usr/lib/jvm/java-9-oracle/bin/java" >> /etc/environment 

sudo wget www.scala-lang.org/files/archive/scala-2.10.4.deb
sudo dpkg -i scala-2.10.4.deb