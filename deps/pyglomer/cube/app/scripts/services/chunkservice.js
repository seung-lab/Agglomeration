'use strict';

/**
 * @ngdoc service
 * @name cubeApp.chunkService
 * @description
 * # chunkService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('chunkService', function ($http, globals, meshService) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      server: 'http://localhost:8888',
    };

    function init() {
      srv.bufferCanvas = document.createElement('canvas');
      srv.bufferCanvas.height = srv.bufferCanvas.width = globals.CHUNK_SIZE;
      srv.bufferContext = srv.bufferCanvas.getContext('2d');
    }
    init();
    
    // load all the tiles for the given axis in the given chunk 
    // ex. load all the segmentation tiles in chunk (0, 0, 0) for the 'z' axis (x/y plane)
    srv.getImagesForVol = function(chunk, axis, callback) {
      var url = srv.server + "/chunk/"+ chunk[2] + "-" + chunk[1] + "-" + chunk[0] + ".json";

      $http({
        method: 'GET',
        url: url,
      }).then(function successCallback(response) {
          // this callback will be called asynchronously
          // when the response is available
          var tilesResSegmentation = response.data.segmentation;
          for (var trIdx = 0; trIdx < tilesResSegmentation.length; trIdx++) {
            var realTileNum = chunk[2] * globals.CHUNK_SIZE + trIdx;
            srv.load(realTileNum , tilesResSegmentation[trIdx].data, "segmentation", chunk[0], chunk[1], callback);
          }

          var tilesResChannel = response.data.channel;
          for (var trIdx = 0; trIdx < tilesResChannel.length; trIdx++) {
            var realTileNum = chunk[2] * globals.CHUNK_SIZE + trIdx;
            srv.load(realTileNum , tilesResChannel[trIdx].data, "channel", chunk[0], chunk[1], callback);
          }

          meshService.chunks[chunk] = response.data.meshes

        }, function errorCallback(response) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
          console.error(response);
      });
    };

    function convertBase64ImgToImage(b64String, callback) {
      var imageBuffer = new Image();
      imageBuffer.onload = function () {
        callback(this);
      };
      imageBuffer.src = b64String;
    }

    srv.load = function (z , data, type, x, y, callback) {

      convertBase64ImgToImage(data, function (image) {

        callback(z, type, x, y , image);

      });
    };

    return srv;
  });
