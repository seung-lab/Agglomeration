'use strict';

/**
 * @ngdoc service
 * @name cubeApp.overlayService
 * @description
 * # overlayService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('overlayService', function ($window) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      circleRadius: null
    };

    srv.init = function() {

      srv.overlayCanvas = document.getElementById('overlay');
      srv.overlayContext = srv.overlayCanvas.getContext('2d');
      srv.resize();
    };

    srv.resize = function() {
      
      srv.overlayCanvas.width = $window.innerWidth;
      srv.overlayCanvas.height = $window.innerHeight;

      srv.overlayContext.fillStyle = "rgba(255, 255, 255, 0.5)";
      srv.overlayContext.fillRect(0, 0, srv.overlayCanvas.width, srv.overlayCanvas.height);

      srv.overlayContext.beginPath();
      // TODO, 2.2 is a magic constant
      srv.circleRadius = Math.min(srv.overlayCanvas.width, srv.overlayCanvas.height) / 2.2;

      srv.overlayContext.arc(srv.overlayCanvas.width / 2, srv.overlayCanvas.height / 2, srv.circleRadius, 0, Math.PI * 2, false);
      srv.overlayContext.closePath();
      
      srv.overlayContext.save();
      srv.overlayContext.clip();
      srv.overlayContext.clearRect(0, 0, srv.overlayCanvas.width, srv.overlayCanvas.height);
      srv.overlayContext.restore();

      srv.overlayContext.strokeStyle = "#000";
      srv.overlayContext.stroke();

      srv.setTimeline(0.002);
    };


    // function hideTimeline() {
    // var center = new THREE.Vector2(overlayCanvas.width / 2, overlayCanvas.height / 2);
    // var start = new THREE.Vector2(+circleRadius * 0.6, 0).add(center);
    // overlayContext.clearRect(start.x, start.y - 1, circleRadius * 1.2, 3);
    // }

    srv.setTimeline = function(fraction) {

      var centerOfCircle = new THREE.Vector2(srv.overlayCanvas.width / 2, srv.overlayCanvas.height / 2);
      var startOfLine = new THREE.Vector2(srv.circleRadius + 40, srv.circleRadius / 2).add(centerOfCircle);
      srv.overlayContext.fillStyle = 'black';
      srv.overlayContext.clearRect(startOfLine.x - 1, startOfLine.y, 3, -srv.circleRadius );
      srv.overlayContext.fillRect(startOfLine.x, startOfLine.y, 2, -srv.circleRadius * fraction);
      srv.overlayContext.fillRect(startOfLine.x, startOfLine.y - srv.circleRadius - 3, 2, 2);
    };

    return srv;

  });
