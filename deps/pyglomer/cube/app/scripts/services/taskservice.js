'use strict';

/**
 * @ngdoc service
 * @name cubeApp.taskService
 * @description
 * # taskService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('taskService', function ($http) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      server: 'http://localhost:8888'
    };

    srv.init = function(callback) {
    };


    srv.getTask = function( callback ) {

      $http({
        method: 'GET',
        url: srv.server+'/tasks',
      }).then(function successCallback(response) {
          // this callback will be called asynchronously
          // when the response is available
          callback(response.data);

        }, function errorCallback(response) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
        });
    }

    return srv;
  });
