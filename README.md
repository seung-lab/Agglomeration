# Agglomeration
[![Build Status](https://magnum.travis-ci.com/seung-lab/Agglomeration.svg?token=8Tibg9gfSDjmNTt3rpeu&branch=master)](https://magnum.travis-ci.com/seung-lab/Agglomeration)
## Installation
```
- Pkg.clone("git@github.com:seung-lab/Agglomeration.git")
- Pkg.build("Agglomeration")
- Pkg.resolve()
```

## Usage
```
using Agglomeration
using Process
dend, dendValues = Process.forward(aff, segm)
```
