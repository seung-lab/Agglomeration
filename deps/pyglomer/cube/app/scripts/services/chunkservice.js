'use strict';

/**
 * @ngdoc service
 * @name cubeApp.chunkService
 * @description
 * # chunkService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('chunkService', function ($http, meshService, globals) {
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
    
    // load all the tiles for the given axis in the given chunk of the given type
    // ex. load all the segmentation tiles in chunk (0, 0, 0) for the 'z' axis (x/y plane)
    srv.getImagesForVol = function(chunk, axis, type, callback) {
      var url = srv.server + "/volume/" + type + "/chunk/0/" +
      chunk[0] + "/" + chunk[1] + "/" + chunk[2] + "/tile/" +
      axis + "/" + 0 + ":" + globals.CHUNK_SIZE;

      $http({
        method: 'GET',
        url: url,
      }).then(function successCallback(response) {
          // this callback will be called asynchronously
          // when the response is available
          var tilesRes = response.data;
          for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
            var realTileNum = chunk[2] * globals.CHUNK_SIZE + trIdx;
            srv.load(realTileNum , tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
          }

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

    srv.load = function (tile_idx , data, type, x, y, callback) {

      convertBase64ImgToImage(data, function (image) {
      

        if (type === 'segmentation') {
          srv.bufferContext.drawImage(image, 0, 0);
          var segPixels = srv.bufferContext.getImageData(0, 0, globals.CHUNK_SIZE, globals.CHUNK_SIZE).data;

          var z = tile_idx;
          //4177920 sum for an empty tile
          if (4177920 !== segPixels.reduce( (prev, curr) => prev + curr )) {
            for (var i = 0; i < globals.CHUNK_SIZE * globals.CHUNK_SIZE; ++i) {
              var px = i % globals.CHUNK_SIZE + x * globals.CHUNK_SIZE;
              var py = Math.floor(i / globals.CHUNK_SIZE) + y * globals.CHUNK_SIZE;
              var pixel = z * globals.CUBE_SIZE.x * globals.CUBE_SIZE.y + py * globals.CUBE_SIZE.y + px;

              meshService.pixelToSegId[pixel] = rgbToSegIdOffset(segPixels, i * 4);
            }
          }
        }

        callback(tile_idx, type, x, y , image);

      });
    };


    function rgbToSegIdOffset(rgb, offset) {

      // console.log(rgb[offset])
      // console.log(rgb[offset] + rgb[offset+1] * globals.CHUNK_SIZE + rgb[offset+2] * globals.CHUNK_SIZE * globals.CHUNK_SIZE)
      return rgb[offset] + rgb[offset+1] * globals.CHUNK_SIZE + rgb[offset+2] * globals.CHUNK_SIZE * globals.CHUNK_SIZE;
    }

    return srv;
  });
