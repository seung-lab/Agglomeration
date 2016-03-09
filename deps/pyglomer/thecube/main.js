(function (window) {
"use strict";

function setTask(task) {

  $.get('http://localhost:8888/volume/'+task.segmentation_id+'/edges').done(function(edges){
 
    task.edges = edges
    assignedTask = task;

    function loadTaskData(done) {
      waitForAll([
        loadTiles,
        SegmentManager.loadEdge
      ], done);
    }

    loadTaskData(function () {
      console.log('we are done loading!');
    });
  })


}

///////////////////////////////////////////////////////////////////////////////
/// utils

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

function rgbEqual(rgb1, rgb2) {
  return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
}

function rgbToSegId(rgb) {
  return rgb[0] + rgb[1] * 256 + rgb[2] * 256 * 256;
}

function segIdToRGB(segId) {
  var blue = Math.floor(segId / (256 * 256));
  var green = Math.floor((segId % (256 * 256)) / 256);
  var red = segId % 256;

  return [red, green, blue];
}



///////////////////////////////////////////////////////////////////////////////
/// classes

var seedColor = [0, 0, 255];
var selectedColor = [0, 255, 0];

// var selectSegIdTween = null;
// var hideSegIdTween = null;

function SegmentProxy(segId) {

  var mesh = SegmentManager.meshes[segId];

  return {
    get opacity() {
      return mesh.material.uniforms.opacity.value;
    },

    set opacity(op) {
      mesh.material.uniforms.opacity.value = op;

      console.log(op);

      var eps = 0.05;

      if (op < eps) {
        mesh.visible = false;
      } else if (op === 1) {
        mesh.visible = true;
        // mesh.material.transparent = false; // TODO, why does this cause the segment to blip?
      } else {
        mesh.visible = true;
        mesh.material.transparent = true;
      }
    }
  }
}

var SegmentManager = {
  // defaults, reset in loadForTask
  selected: [],
  selectedColors: [],
  meshes: {},
  _opacity: 1.0,
  _transparent: false,
  _visible: true,


  get opacity () {
    return this._opacity;
  },

  get transparent () {
    return this._transparent;
  },

  // sets the opacity for all segments
  set opacity (op) {
    this._opacity = op;

    var eps = 0.05;

    if (op < eps) {
      this._visible = false;
    } else if (op === 1) {
      this._visible = true;
      this._transparent = false;
    } else {
      this._visible = true;
      this._transparent = true;
    }

    var _this = this;

    segments.children.map(function (segment) {
      if (segment.material && segment.material.uniforms) {
        segment.material.uniforms.opacity.value = op;
        segment.visible = _this._visible;
        segment.material.transparent = _this.transparent;
      }
    });
  },
  loadEdge: function(done) {

    SegmentManager.meshes = {};

    while( cube.getObjectByName("segments").children.length ){
      cube.getObjectByName("segments").remove(cube.getObjectByName("segments").children[0])
    }

    var edge = assignedTask.edges[current_edge]
    var seedsLoaded = 0;

    SegmentManager.selected = []
    SegmentManager.selectedColors = []

    SegmentManager.selected.push( edge[0] );
    SegmentManager.selectedColors.push( [0,0,255] );
    SegmentManager.selected.push( edge[1] );
    SegmentManager.selectedColors.push( [255,0,0] );
    displayMeshForVolumeAndSegId(assignedTask.segmentation_id, edge[0], 'blue' ,function () {
      seedsLoaded++;
      if (seedsLoaded === 2) {
        done();
      }
    });

    displayMeshForVolumeAndSegId(assignedTask.segmentation_id, edge[1], 'red' ,function () {
      seedsLoaded++;
      if (seedsLoaded === 2) {
        done();
      }
    });

  },
  displayMesh: function (segId) {
    segments.add(this.meshes[segId]);
  },
  addMesh: function (segId, mesh) {
    this.meshes[segId] = mesh;
  },
  loaded: function (segId) {
    return this.meshes[segId] !== undefined;
  }
};




// loads the VOA mesh for the given segment in the given chunk from the EyeWire data server into a Three JS mesh.
// passes the mesh to the done handler as a single argument or passes false if there is no mesh for the given segment in the chunk
function getDataForVolumeXYZAndSegId(volume, chunk, segId, done) {
  var meshUrl = cache_domain + '/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;

  var req = new XMLHttpRequest();
  req.open("GET", meshUrl, true);
  req.responseType = "arraybuffer";

  req.onload = function (event) {
    var data = req.response;

    if (data) {
      done(new Float32Array(data));
    } else {
      done(false);
    }
  };

  req.send();
}


// start game
// waits for all async functions to call a ca
function waitForAll(asyncFunctions, done) {
  var count = asyncFunctions.length;

  asyncFunctions.forEach(function (f) {
    f(function () {
      count--;

      if (count === 0) {
        done();
      }
    });
  });
}

var loadedStartingTile = false;
var tileLoadingQueue = [];

// load all the tiles for the assigned task
function loadTiles(done) {
  var tileCount = 0;

  var startingTile = assignedTask.startingTile;
  TileManager.setCurrentTile(startingTile, true);

  function loadTilesNicely() {
    for (var i = 0; i < 8; i++) {
      var load = tileLoadingQueue.shift();
      if (load) {
        load();
      }
    }

    if (tileCount < CUBE_SIZE) {
      // continue to check for more tiles
      requestAnimationFrame(loadTilesNicely);
    }
  }
  requestAnimationFrame(loadTilesNicely);

  loadTilesForAxis('xy', startingTile, function (tile) {
    tileCount++;

    if (tile.id === startingTile) {
      loadedStartingTile = true;
      tile.draw();
      needsRender = true;
    } else if (tile.id === TileManager.currentTileIdx) {
      tile.draw();
      needsRender = true;
    }

    if (tileCount === CUBE_SIZE) {
      done();
    }
  });

  needsRender = true;
}



var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var mouseStart = null;
var isZoomed = false;

function tileClick(x, y) {

}

function getPositionOnTileFromMouse(mouse) {
  raycaster.setFromCamera(mouse, camera.realCamera);
  var intersects = raycaster.intersectObject(planes.z);

  if (intersects.length === 1) {
    var point = intersects[0].point;
    point.applyQuaternion(pivot.quaternion.clone().inverse());
    point.sub(cube.position);

    return new THREE.Vector2(point.x, point.y);
  }
}


function tileDelta(delta) {
  TileManager._currentTileFloat = clamp(TileManager._currentTileFloat + delta, 1, 254);

  var nextTile = Math.round(TileManager._currentTileFloat);

  if (nextTile !== TileManager._currentTileIdx) {
    TileManager.setCurrentTile(nextTile);
  }

  if (isZoomed) {
    cube.position.z = -planes.z.position.z + 0.5;
  }
}

function mousewheel( event ) {
  event.preventDefault();
  event.stopPropagation();

  tileDelta(event.wheelDelta / 40);
}
document.addEventListener('mousewheel', mousewheel, false);

// document.addEventListener('mouseup', mouseup, false);
// document.addEventListener('mousemove', mousemove, false);
// document.addEventListener('mousedown', mousedown, false);


function handleChange () {
  if (controls.snapState === controls.SNAP_STATE.SHIFT) {
    hideTimeline(); // bad place


    // TODO , this doesn't work with rotating on the z axis, think about this from the ground up
    // maybe keep track of angle in rotate cube after a snap event
    var targetFacingVec = new THREE.Vector3(0, 0, 1);
    targetFacingVec.applyQuaternion(controls.targetQuaternion);

    var currentFacingVec = new THREE.Vector3(0, 0, 1);
    currentFacingVec.applyQuaternion(pivot.quaternion);

    var angle = targetFacingVec.angleTo(currentFacingVec);

    var segmentOpacity = function (currentOpacity, angle, min, max) {
      if (angle === 0) {
        return 0;
      } else if (angle < currentOpacity && angle < min) {
        return Math.min(min, currentOpacity);
      } else {
        return Math.min(max, angle);
      }
    }


    var p = Math.min(1, angle / (Math.PI / 4));
    var op = segmentOpacity(SegmentManager.opacity, p, 0.3, 1);

    PlaneManager.opacity = Math.max(1 - op, 0.8);
    SegmentManager.opacity = op;

    camera.fov = Math.max(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);
  }

  needsRender = true;
}

function handleSnapBegin () {
  console.log('snapBegin');
}

function handleSnapComplete () {
  console.log('snapComplete distance', camera.realCamera.position.z);

  PlaneManager.opacity = 1;

  setTimeline(planes.z.position.z);

  SegmentManager.opacity = 0;
}

function handleUnSnap() {
  var o = {t: 0};
  new TWEEN.Tween(o).to({t: 1}, 250).onUpdate(function () {
    var p = o.t;
    camera.fov = Math.max(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);

    SegmentManager.opacity = p;// * (isZoomed ? 0.8 : 1.0);

    // PlaneManager.opacity = Math.max(1 - p, 0.8));

    PlaneManager.opacity = (1-p) * (0.2) + 0.8;

    needsRender = true;
  }).start();
}

controls.addEventListener('change', handleChange);
controls.addEventListener('snapBegin', handleSnapBegin);
// controls.addEventListener('snapUpdate', handleSnapUpdate);
controls.addEventListener('snapComplete', handleSnapComplete);
// controls.addEventListener('rotate', handleRotate);
controls.addEventListener('unSnap', handleUnSnap);




var animating = false;
var centerPoint = new THREE.Vector2(0, 0);
function animateToPositionAndZoom(point, zoomLevel, reset) {
  if (animating) {
    return;
  }

  centerPoint.copy(point);

  animating = true;
  isZoomed = zoomLevel !== 1;

  var duration = 500;

  // new TWEEN.Tween(SegmentManager).to({ opacity: 0.8 }, duration)
  // .onUpdate(function () {
  //     needsRender = true;
  // })
  // .start();

  new TWEEN.Tween(cube.position).to({x: -point.x, y: -point.y, z: !reset ? -planes.z.position.z + 0.5 : 0}, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .onUpdate(function () {
      needsRender = true;
    }).start();


  new TWEEN.Tween(camera).to({viewHeight: 2/zoomLevel}, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
      needsRender = true;
    }).onComplete(function () {
      animating = false;
    }).start();
}

function handleInput() {
  if (key('x', PRESSED)) {
    animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1, true);
  }

  if (key('z', HELD)) {

      var point = getPositionOnTileFromMouse(mouse);

      if (point) {
        animateToPositionAndZoom(point, 4);
      }
  }
  if (key('shift', PRESSED)) {

    highlight_segments = false
    TileManager.currentTile().draw();
    needsRender = true;
  }
  if (key('shift', RELEASED)) {

    highlight_segments = true
    TileManager.currentTile().draw();
    needsRender = true;
  }

  if (key('y', PRESSED) || key('n', PRESSED) || key('m', PRESSED)) {
    current_edge ++;
    SegmentManager.loadEdge(function() {
      console.log('displaying new edge');
    });
    TileManager.currentTile().draw();
    needsRender = true;
  }

  var td = 0;

  if (key('w', PRESSED)) {
    td += 1;
  }

  if (key('s', PRESSED)) {
    td -= 1;
  }

  if (key('r', PRESSED)) {
    needsRender = true;
  }

  if (key('p', PRESSED)) {
    segments.children.map(function (segment) {
      console.log(segment.material.uniforms.opacity.value, segment.visible, segment.material.transparent);
    });
  }

  tileDelta(td);
}


var needsRender = true;

function animate() {
  pollInput();
  handleInput();

  TWEEN.update();
  controls.update();

  // console.log(needsRender)
  if (needsRender) {
    needsRender = false;
    render();
  }

  requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
}
requestAnimationFrame(animate);

// kick off the game
(function start() {
  $.get(cache_domain+'/tasks').done(setTask);
})();

var render = (function () {
  var faceVec = new THREE.Vector3();
  var cameraToPlane = new THREE.Vector3();
  var normalMatrix = new THREE.Matrix3();
  scene.autoUpdate = false; // since we call updateMatrixWorld below
  return function () {
    scene.updateMatrixWorld();

    cameraToPlane.setFromMatrixPosition(planes.z.matrixWorld);

    cameraToPlane.subVectors(camera.realCamera.position, cameraToPlane);


    faceVec.set(0, 0, 1);

    normalMatrix.getNormalMatrix(planes.z.matrixWorld);
    faceVec.applyMatrix3(normalMatrix).normalize();


    // is the camera on the same side as the front of the plane?
    var cameraInFront = cameraToPlane.dot(faceVec) >= 0;

    renderer.render(scene, camera.realCamera, undefined, undefined, cameraInFront, !SegmentManager.transparent);
  }
}());

}(window))
