'use strict';

/**
 * @ngdoc service
 * @name cubeApp.planeService
 * @description
 * # planeService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('planeService', function () {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      opactiy:0.8
    };

    srv.getOpacity = function() {
      return srv.opactiy;
    };

    srv.setOpacity = function(opactiy) {
      srv.opactiy = opactiy;

      //TODO define planes
      // planes.z.material.materials.map(function (material) {
      //   material.opacity = o;
      // });
    };

    return srv;

  });
