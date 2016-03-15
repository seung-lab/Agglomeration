'use strict';

/**
 * @ngdoc function
 * @name cubeApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the cubeApp
 */
angular.module('cubeApp')
  .controller('MainCtrl', function (taskService, $scope, sceneService,
    tileService, overlayService, planeService, 
    meshService, controlService, $window) {



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

    function displayNextEdge () {
      if (!taskService.task) {return}
      //Hide all the current visible meshes
      while( meshService.meshes.children.length ) {
        meshService.meshes.remove(meshService.meshes.children[0]);
      }

      taskService.getNextEdge(function(edge){
        meshService.displayEdge(taskService.task.segmentation_id, edge, function(segment) {
          //This function is called for every segment being loaded
          animateDisplaySegment(segment);
        });
      });
    }
    controlService.subscribe($scope, displayNextEdge);

    function animateDisplaySegment(segment) {

      var duration = 500;
      if (controlService.snap_state === controlService.snap_states.ORTHO) {
          segment.visible = true;
          var indvTweenOut = new TWEEN.Tween(SegmentProxy(segment)).to({ opacity: 1.0 }, duration).onUpdate(function () {
            controlService.needsRender = true;
          })
          .repeat(1)
          .yoyo(true)
          .onComplete(function () {
            segment.visible = false;
          })
          .start();

          var reshowPlaneTween = new TWEEN.Tween(planeService).to({ opacity: 1.0 }, duration).onUpdate(function () {
            controlService.needsRender = true;
          });

          var hidePlaneTween = new TWEEN.Tween(planeService).to({ opacity: 0.8 }, duration).onUpdate(function () {
            controlService.needsRender = true;
          }).chain(reshowPlaneTween).start();
        } else {
          var indvTweenOut = new TWEEN.Tween(SegmentProxy(segment)).to({ opacity: meshService.opacity }, duration).onUpdate(function () {
            controlService.needsRender = true;
          }).start();
      }
    }

    function SegmentProxy(segment) {

      return {
        get opacity() {
          return segment.children[0].material.uniforms.opacity.value;
        },

        set opacity(op) {
          meshService.setSegmentOpacity( segment, op )

          var eps = 0.05;

          if (op < eps) {
            segment.visible = false;
          } else if (op === 1) {
            segment.visible = true;
            // mesh.material.transparent = false; // TODO, why does this cause the segment to blip?
          } else {
            segment.visible = true;
            segment.children.forEach(function (mesh) {
              mesh.material.transparent = true;
            });
          }
        }
      }
    }



  });
