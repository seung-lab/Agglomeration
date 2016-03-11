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
    meshService, controlService, $window) {

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

    taskService.getTask(function(task){
      tileService.init(task.channel_id, task.segmentation_id);
      sceneService.cube.add(tileService.planesHolder);
      sceneService.cube.add(meshService.meshes);
      displayNextEdge();
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

    function handleInput() {
      if (keyboardService.key('x', keyboardService.PRESSED)) {
        controlService.animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1, true);
      }

      if (keyboardService.key('z', keyboardService.HELD)) {

          var point = controlService.getPositionOnTileFromMouse();

          if (point) {
            controlService.animateToPositionAndZoom(point, 4);
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
        displayNextEdge();
        tileService.draw();
      }

      if (keyboardService.key('n', keyboardService.PRESSED)) {
        taskService.submitEdgeDecision('n');
        displayNextEdge();
        tileService.draw();
      }

      if (keyboardService.key('m', keyboardService.PRESSED)) {
        taskService.submitEdgeDecision('m');
        displayNextEdge();
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

    function displayNextEdge () {

      //Hide all the current visible meshes

      while( meshService.meshes.children.length ) {
        meshService.meshes.remove(meshService.meshes.children[0]);
      }

      taskService.getNextEdge(function(edge){
        meshService.displayEdge(taskService.task.segmentation_id, edge);
      });
    }

    var needsRender = true
    function animate() {
      keyboardService.pollInput();
      handleInput();

      TWEEN.update();
      controlService.update();

      if (needsRender) {
        // srv.needsRender = false;
        sceneService.render();
      }

      requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
    }
    animate();

  });
