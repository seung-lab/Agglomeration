'use strict';

/**
 * @ngdoc function
 * @name cubeApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the cubeApp
 */
angular.module('cubeApp')
  .controller('MainCtrl', function (sceneService, keyboardService,
    tileService, taskService, overlayService, planeService, 
    controlService, $window) {

    sceneService.init();
    keyboardService.init();
    overlayService.init();

    controlService.init(sceneService.pivot, sceneService.camera);
    function resize(event) {
      overlayService.resize();
      sceneService.resize();
      controlService.resize($window.innerWidth, $window.innerHeight)
    };
    $window.addEventListener('resize', resize );
    resize();


    taskService.init();
    taskService.getTask(function(task){
      tileService.init(task.channel_id, task.segmentation_id);
      sceneService.cube.add(tileService.planesHolder);
    });


    function mousewheel( event ) {
      event.preventDefault();
      event.stopPropagation();

      tileDelta(event.wheelDelta / 40);
    }

    document.addEventListener('mousewheel', mousewheel, false);
    function clamp(val, min, max) {
      return Math.max(Math.min(val, max), min);
    }

    function tileDelta(delta) {
      tileService.currentTileFloat = clamp(tileService.currentTileFloat + delta, 1, 254);

      var nextTile = Math.round(tileService.currentTileFloat);

      if (nextTile !== tileService.currentTileIdx) {
        tileService.setCurrentTile(nextTile);
      }

      if (sceneService.isZoomed) {
        sceneService.cube.position.z = - tileService.planes.z.position.z + 0.5;
      }
    }



    function handleSnapBegin () {
      console.log('snapBegin');
    }

    function handleSnapComplete () {

      // planeService.opacity = 1;

      // setTimeline(planes.z.position.z);

      // tileService.opacity = 0;
    }

    function handleUnSnap() {
      var o = {t: 0};
      new TWEEN.Tween(o).to({t: 1}, 250).onUpdate(function () {
        var p = o.t;
        
        var camera = sceneService.camera
        camera.fov = Math.max(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);

        tileService.opacity = p;// * (isZoomed ? 0.8 : 1.0);

        // PlaneManager.opacity = Math.max(1 - p, 0.8));

        // PlaneManager.opacity = (1-p) * (0.2) + 0.8;

        // needsRender = true;
      }).start();
    }

    // controlService.addEventListener('change', handleChange);
    // controlService.addEventListener('snapBegin', handleSnapBegin);
    // controlService.addEventListener('snapComplete', handleSnapComplete);
    // controlService.addEventListener('unSnap', handleUnSnap);

    function animate() {
        // pollInput();
        // handleInput();
        // console.log('animating')
        TWEEN.update();
        controlService.update();

        if (true) {
          // srv.needsRender = false;
          sceneService.render();
        }

        requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
      }
    requestAnimationFrame(animate);

  });
