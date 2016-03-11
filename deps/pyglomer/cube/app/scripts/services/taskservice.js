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
      server: 'http://localhost:8888',
      task: null,
      current_edge: null
    };

    srv.getTask = function( callback ) {

      $http({
        method: 'GET',
        url: srv.server+'/tasks',
      }).then(function successCallback(response) {
          srv.task = response.data;
          callback(response.data);

        }, function errorCallback(response) {
          console.error(response);
      });
    };

    srv.getNextEdge = function(callback) {

      $http({
        method: 'GET',
        url: srv.server+'/volume/'+srv.task.segmentation_id+'/edges',
      }).then(function successCallback(response) {
          // this callback will be called asynchronously
          // when the response is available
          callback(response.data);
          srv.current_edge = response.data;

        }, function errorCallback(response) {
          console.error(response);
      });
    };

    srv.submitEdgeDecision = function( decision ) {

        $http({
          method: 'POST',
          url: srv.server+'/volume/'+srv.task.segmentation_id+'/edges',
          data: { 'edge': srv.current_edge, 'decision': decision }
        }).then(function successCallback(response) {
          }, function errorCallback(response) {
            console.error(response);
        });
    };

    return srv;
  });
