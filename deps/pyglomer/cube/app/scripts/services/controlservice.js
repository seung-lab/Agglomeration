'use strict';

/**
 * @ngdoc service
 * @name cubeApp.controlService
 * @description
 * # controlService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('controlService', function (meshService, tileService, planeService,
    overlayService, sceneService, keyboardService,
    taskService, $rootScope, globals) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var srv = {
      initialized: false,
      states: { NONE: 1, ROTATE: 2, ANIMATE: 3},
      prev_state: null,
      state: null,
      snap_states: { NONE: 1, BEGIN: 2, ORTHO: 3, SHIFT: 4 },
      snap_state: null,
      object: null,
      enabled: true,
      screen: { left: 0, top: 0, width: 0, height: 0 },
      rotateSpeed : 1.0,
      dynamicDampingFactor: 0.2,
      rotateStart: new THREE.Vector3(),
      rotateEnd: new THREE.Vector3(),
      noRotate: false,
      prev_quaternion: null,
      targetQuaternion: new THREE.Quaternion(),
      panStart: new THREE.Vector2(),
      panEnd: new THREE.Vector2(),
      mouse: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
      events: {
        changeEvent: { type: 'change' },
        startEvent: { type: 'start' },
        endEvent: { type: 'end' },
        rotateEvent: { type: 'rotate'},
        snapBeginEvent: { type: 'snapBegin' },
        snapUpdateEvent: { type: 'snapUpdate' },
        snapCompleteEvent: { type: 'snapComplete' },
        unSnapEvent: { type: 'unSnap' }
      },
      needsRender: true,
    };


    function init() {
      srv.object = sceneService.pivot;
      srv.camera = sceneService.camera;
      srv.prev_state = srv.states.NONE;
      srv.state = srv.states.NONE;
      srv.prev_quaternion = srv.object.quaternion.clone()
      srv.snap_state = srv.snap_states.NONE

      document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
      document.addEventListener( 'mousedown', mousedown, false );
      window.addEventListener( 'keydown', keydown, false );
      window.addEventListener( 'keyup', keyup, false );
      srv.initialized = true;
    };
    init();

    srv.resize = function (width , height) {
      srv.screen.left = 0;
      srv.screen.top = 0;
      srv.screen.width = width;
      srv.screen.height = height;
    };

    srv.handleEvent = function ( event ) {
      if ( typeof srv[ event.type ] == 'function' ) {
        srv[ event.type ]( event );
      }
    };

    var getMouseProjectionOnBall = ( function () {
      var mouseOnBall = new THREE.Vector3();
      return function ( pageX, pageY ) {
        var minDist = Math.min(srv.screen.width, srv.screen.height);
        var circleRadius = minDist / 2.2;
        mouseOnBall.set(
          ( pageX - srv.screen.width / 2 - srv.screen.left ) / circleRadius,
          ( srv.screen.height / 2 + srv.screen.top - pageY ) / circleRadius,
          0.0
        );
        var length = mouseOnBall.length();
        if (length > 1.0) {
          mouseOnBall.normalize();
        } else {
          mouseOnBall.z = Math.sqrt( 1.0 - length * length );
        }
        return mouseOnBall;
      };
    }());


    function clamp(val, min, max) {
      return Math.max(Math.min(val, max), min);
    }

    //TODO first rotation attemp does not work
    srv.rotateObject = (function() {
      var axis = new THREE.Vector3();
      var quaternion = new THREE.Quaternion();
      return function () {
        var angle = Math.acos( srv.rotateStart.dot( srv.rotateEnd ) / srv.rotateStart.length() / srv.rotateEnd.length() );
        if ( angle ) {
          if (srv.snap_state === srv.snap_states.ORTHO) {
            srv.snap_state = srv.snap_states.SHIFT;
          }

          axis.crossVectors( srv.rotateStart, srv.rotateEnd ).normalize();
          angle *= srv.rotateSpeed;
          quaternion.setFromAxisAngle( axis, angle ).normalize(); // maybe normalize is neccesary

          var curQuaternion = srv.object.quaternion;
          curQuaternion.multiplyQuaternions(quaternion, curQuaternion).normalize();
          srv.object.setRotationFromQuaternion(curQuaternion);

          // TODO, only switch to 'dynamic' on mouseup
          if ( srv.state === srv.states.NONE) {
            quaternion.setFromAxisAngle( axis, angle * 0.1 ).normalize();
          }
          srv.rotateStart.applyQuaternion( quaternion );
        }
      }

    }());

    srv.update = function () {
      if (!srv.initialized) { return; }

      if (srv.state !== srv.states.ANIMATE) {
        srv.rotateObject(); // TODO, should ignore input as well
      }
      if (!srv.object.quaternion.equals(srv.prev_quaternion)) {
        srv.prev_quaternion.copy(srv.object.quaternion);
        changeEvent();
      } 
      else {
        changeEvent();
      }  
    };

    function changeEvent() {
  
        if (srv.snap_state === srv.snap_states.SHIFT) {


        // TODO , this doesn't work with rotating on the z axis, think about this from the ground up
        // maybe keep track of angle in rotate cube after a snap event
        var targetFacingVec = new THREE.Vector3(0, 0, 1);
        targetFacingVec.applyQuaternion(srv.targetQuaternion);

        var currentFacingVec = new THREE.Vector3(0, 0, 1);
        currentFacingVec.applyQuaternion(sceneService.pivot.quaternion);

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
        var op = segmentOpacity(meshService.opacity, p, 0.3, 1);

        planeService.opacity = Math.max(1 - op, 0.8);
        meshService.setOpacity(op);

        sceneService.camera.fov = Math.max(sceneService.camera.fov, sceneService.camera.orthoFov * (1 - p) + sceneService.camera.perspFov * p);
      }
    }

    srv.animateToTargetQuaternion = function(duration, cb) {

      srv.state = srv.states.ANIMATE; 
      srv.snap_state = srv.snap_states.ORTHO;

      var startQuat = new THREE.Quaternion().copy(srv.object.quaternion);
      var opacity = {t: 0};
      var currentSegOpacity = meshService.opacity;

      new TWEEN.Tween(opacity).to({t: 1}, duration).onUpdate(function () {
        THREE.Quaternion.slerp(startQuat, srv.targetQuaternion, srv.object.quaternion, opacity.t);
        var p = 1 - opacity.t;
        srv.camera.fov = Math.min(srv.camera.fov, srv.camera.orthoFov * (1 - p) + srv.camera.perspFov * p);
        meshService.setOpacity( Math.min(meshService.opacity, p));
        tileService.opacity = opacity.t * 0.2 + 0.8;

      }).onComplete(function () {
        srv.object.quaternion.copy(srv.targetQuaternion);
        srv.object.setRotationFromQuaternion(srv.targetQuaternion);
        srv.state = srv.states.NONE;
        cb();
      }).start();
    }

    var animating = false;
    var centerPoint = new THREE.Vector2(0, 0);
    srv.animateToPositionAndZoom = function(point, zoomLevel, reset) {
      if (animating) {
        return;
      }

      centerPoint.copy(point);

      animating = true;
      srv.isZoomed = zoomLevel !== 1;

      var duration = 500;

      new TWEEN.Tween(meshService).to({ opacity: 0.8 }, duration)
      .onUpdate(function () {
          srv.needsRender = true;
      })
      .start();

      new TWEEN.Tween(sceneService.cube.position).to({x: -point.x, y: -point.y, z: !reset ? -tileService.planes.z.position.z + 0.5 : 0}, duration)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .onUpdate(function () {
          srv.needsRender = true;
        }).start();


      console.log(zoomLevel);
      console.log(srv.camera.viewHeight)

      new TWEEN.Tween(srv.camera).to({viewHeight: 2/zoomLevel}, duration)
        .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
          srv.needsRender = true;
        }).onComplete(function () {
          animating = false;
        }).start();
    }


      // listeners
    function keydown( event ) {
      if ( srv.enabled === false ) return;
      srv.prev_state = srv.state;

      // if ( _state !== STATE.NONE ) {
        // return;
      // } else 
      if ( event.keyCode === 32 ) { // TODO, I want to snap/unsnap even when rotating
        if (srv.snap_state === srv.snap_states.NONE) {
          srv.snap();
        } else {
          srv.unSnap();
        }
      }
    }

    function keyup( event ) {
      // if ( _this.enabled === false ) return;
      // _state = _prevState;
      // window.addEventListener( 'keydown', keydown, false );
    }

    function mousedown( event ) {
      if ( srv.enabled === false ) return;
      event.preventDefault();
      event.stopPropagation();
      srv.mouse.x = (event.clientX / srv.screen.width) * 2 - 1; // why *2 - 1?
      srv.mouse.y = -(event.clientY / srv.screen.height) * 2 + 1;

      if ( srv.state === srv.states.NONE ) {
        if (event.button === 0 /* TODO && !key("shift", HELD) && !key("ctrl", HELD)*/) {
          srv.state = srv.states.ROTATE;
        }
      } 

      if ( srv.state === srv.states.ROTATE && !srv.noRotate) {
        srv.rotateStart.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
        srv.rotateEnd.copy( srv.rotateStart );
      }

     

      document.addEventListener( 'mousemove', mousemove, false );
      document.addEventListener( 'mouseup', mouseup, false );
    }

    function mousemove( event ) {

      if ( srv.enabled === false ) return;

      event.preventDefault();
      event.stopPropagation();
      srv.mouse.x = (event.clientX / srv.screen.width) * 2 - 1; // why *2 - 1?
      srv.mouse.y = -(event.clientY / srv.screen.height) * 2 + 1;

      if ( srv.state === srv.states.ROTATE && !srv.noRotate ) {
        srv.rotateEnd.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
      }

    }

    function mouseup( event ) {
      // todo, this is screwing up animations
      if ( srv.enabled === false ) return;
        event.preventDefault();
        event.stopPropagation();

      srv.state = srv.states.NONE;
      srv.mouse.x = (event.clientX / srv.screen.width) * 2 - 1; // why *2 - 1?
      srv.mouse.y = -(event.clientY / srv.screen.height) * 2 + 1;

      document.removeEventListener( 'mousemove', mousemove );
      document.removeEventListener( 'mouseup', mouseup );

      if (srv.snap_state === srv.snap_states.SHIFT) {
        srv.snap();
      }

      if (srv.snap_state === srv.snap_states.ORTHO && keyboardService.key('shift', keyboardService.HELD)) {
        srv.mouse.x = (event.clientX / srv.screen.width) * 2 - 1; // why *2 - 1?
        srv.mouse.y = -(event.clientY / srv.screen.height) * 2 + 1;
        checkForTileClick(event);
      }

    }


    function mousewheel( event ) {
      event.preventDefault();
      event.stopPropagation();

      tileDelta(event.wheelDelta / 40);
    }
    document.addEventListener('mousewheel', mousewheel, false);

    function tileDelta(delta) {
      tileService.currentTileFloat = clamp(tileService.currentTileFloat + delta, 1, globals.CUBE_SIZE.z - 1);

      var nextTile = Math.round(tileService.currentTileFloat);

      if (nextTile !== tileService.currentTileIdx) {
        tileService.setCurrentTile(nextTile);
      }

      if (sceneService.isZoomed) {
        sceneService.cube.position.z = - tileService.planes.z.position.z + 0.5;
      }
    }

    function handleInput() {
      if (keyboardService.key('x', keyboardService.PRESSED)) {
        srv.animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1, true);
      }

      if (keyboardService.key('z', keyboardService.HELD)) {

          var point = srv.getPositionOnTileFromMouse();
          if (point) {
            srv.animateToPositionAndZoom(point, 4);
          }
      }
      if (keyboardService.key('shift', keyboardService.PRESSED)) {

        tileService.highlight_segments = false
        tileService.draw();
        needsRender = true;
      }
      if (keyboardService.key('shift', keyboardService.RELEASED)) {

        tileService.highlight_segments = true
        tileService.draw();
        needsRender = true;
      }

      if (keyboardService.key('y', keyboardService.PRESSED)) {
        taskService.submitEdgeDecision('y');
        next();
        tileService.draw();
      }

      if (keyboardService.key('n', keyboardService.PRESSED)) {
        taskService.submitEdgeDecision('n');
        next();
        tileService.draw();
      }

      if (keyboardService.key('m', keyboardService.PRESSED)) {
        taskService.submitEdgeDecision('m');
        next();
        tileService.draw();
      }

      var td = 0;

      if (keyboardService.key('w', keyboardService.HELD)) {
        td += 1;
      }

      if (keyboardService.key('s', keyboardService.HELD)) {
        td -= 1;
      }

      if (keyboardService.key('r', keyboardService.PRESSED)) {
        needsRender = true;
      }

      tileDelta(td);
    }

    srv.subscribe = function(scope, callback) {
      var handler = $rootScope.$on('next-edge-event', callback);
      scope.$on('$destroy', handler);
    };

    function next() {
       $rootScope.$emit('next-edge-event');
    }

    srv.snap = function () {

      // TODO, should we be doing this? (maybe so animate can take over rotation, especially if cube has momentum)
      // _state = STATE.NONE;
      // _prevState = STATE.NONE;

      if (srv.snap_state === srv.snap_states.NONE) {
        var nMatrix = snapMatrix(srv.object.matrix);
        srv.targetQuaternion.setFromRotationMatrix(nMatrix);
      }

      srv.snap_state = srv.snap_states.BEGIN;
      // srv.noRotate = true;
      srv.rotateStart.copy( srv.rotateEnd );

      srv.animateToTargetQuaternion(250, function () {
        srv.snapState = srv.snap_states.ORTHO;
        changeEvent();
        planeService.opacity = 1;
        overlayService.setTimeline(tileService.planes.z.position.z);
        meshService.setOpacity(0);

      });
    };

    function snapAxis(val) {
      var HALF_PI = Math.PI / 2;
      return Math.round(val / HALF_PI) * HALF_PI;
    }

    function snapMatrix(matrix) {
      var nMatrix = matrix.clone();
      var one = foo(nMatrix.elements, []);
      var two = foo(nMatrix.elements, [one]);
      var three = foo(nMatrix.elements, [one, two]);

      function snap(v) {
        if (v < 0) {
          return -1;
        } else {
          return 1;
        }
      }

      nMatrix.elements[one] = snap(matrix.elements[one]);
      nMatrix.elements[two] = snap(matrix.elements[two]);
      nMatrix.elements[three] = snap(matrix.elements[three]);

      return nMatrix;
    }

    function foo(matrix, ignores) {
      var largest = null;

      for (var i = 0; i < matrix.length; i++) {
        if (ignores.indexOf(i) === -1) {
          largest = i;
          break;
        }
      };

      if (largest === null) {
        throw "WTF!";
      }

      for (var i = 0; i < matrix.length; i++) {
        // if (ignores.indexOf(i) !== -1) {
        //  continue;
        // }

        var y = Math.floor(i / 4);
        var x = i % 4;

        if (x > 2 || y > 2) {
          continue;
        }

        if (Math.abs(matrix[i]) > Math.abs(matrix[largest])) {
          largest = i;
        }
      };

      var ly = Math.floor(largest / 4);
      var lx = largest % 4;

      for (var i = 0; i < matrix.length; i++) {
        var y = Math.floor(i / 4);
        var x = i % 4;

        if (x === lx || y === ly) {
          matrix[i] = 0;
        }
      }

      return largest;
    }

    function checkForTileClick(event) {
      srv.raycaster.setFromCamera(srv.mouse, srv.camera.realCamera);
      var intersects = srv.raycaster.intersectObject(tileService.planes.z);

      if (intersects.length) {
        var point = intersects[0].point;
        point.applyQuaternion(sceneService.pivot.quaternion.clone().inverse());
        point.sub(sceneService.cube.position);

        var xPixel = Math.floor((point.x + 0.5) * globals.CUBE_SIZE.x); 
        var yPixel = Math.floor((point.y + 0.5) * globals.CUBE_SIZE.y);

        console.log({x: xPixel, y:yPixel})
        var segment_id = tileService.segIdForPosition(xPixel, yPixel);
        console.log(segment_id)

        meshService.displayMesh(segment_id, 'green', function(){
          console.log('adding mesh because of click');
        });
          // if (key('ctrl', HELD)) {
          //   SegmentManager.deselectSegId(segId);
          // } else {
          //   SegmentManager.selectSegId(segId);
          // }
        

      // } else if (intersects.length > 1) {
      //   console.log('wtf', intersects);
      } else {
        console.log('no interesects', intersects);
      }
    }

    // function checkForSegmentClick(x, y) {
    //   wireframe.visible = false;
    //   planes.z.visible = false;
    //   var ids = ThreeDView.readBuffer(x, y, 1, renderer, scene, camera.realCamera, segments);
    //   for (var i = 0; i < ids.length; i++) {
    //     var segId = ids[i];
    //     SegmentManager.deselectSegId(segId);
    //   };

    //   planes.z.visible = true;
    //   wireframe.visible = true;
    // }


    srv.unSnap = function () {
      srv.snap_state = srv.snap_states.NONE;

      var o = {t: 0};
      new TWEEN.Tween(o).to({t: 1}, 250).onUpdate(function () {
        var p = o.t;
        
        srv.camera.fov = Math.max(srv.camera.fov, srv.camera.orthoFov * (1 - p) + srv.camera.perspFov * p);
        meshService.setOpacity(p);// * (isZoomed ? 0.8 : 1.0);
        planeService.opacity = (1-p) * (0.2) + 0.8;
      }).start();
    };

    srv.getPositionOnTileFromMouse = function() {

      srv.raycaster.setFromCamera(srv.mouse, srv.camera.realCamera);
      var intersects = srv.raycaster.intersectObject(tileService.planes.z);

      if (intersects.length >= 1) {
        var point = intersects[0].point;
        point.applyQuaternion(sceneService.pivot.quaternion.clone().inverse());
        point.sub(sceneService.cube.position);

        return new THREE.Vector2(point.x, point.y);
      }
    }

    var needsRender = true
    function animate() {
      keyboardService.pollInput();
      handleInput();

      TWEEN.update();
      srv.update();

      if (needsRender) {
        // srv.needsRender = false;
        sceneService.render();
      }

      requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
    }
    animate();
    return srv;
  });
