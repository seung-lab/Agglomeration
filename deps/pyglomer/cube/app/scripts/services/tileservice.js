'use strict';

/**
 * @ngdoc service
 * @name cubeApp.tileService
 * @description
 * # tileService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('tileService', function (overlayService, meshService, taskService, $http) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    // Tile represents a single 2d 256x256 slice
    // since chunks are 128x128, a tile consists of 4 segments and 4 channel iamges.
    var srv = {
      CHUNK_SIZE: 128,
      CUBE_SIZE: 256,
      CHUNKS:[
              [0,0,0],
              [1,0,0],
              [0,1,0],
              [1,1,0],
              [0,0,1],
              [1,0,1],
              [0,1,1],
              [1,1,1]
            ],
      channel_id: null,
      segmentation_id: null,
      id: null,
      count: 0,
      opacity: 1.0,
      tiles: {},
      currentTileIdx: null,
      currentTileFloat: null,
      planes: {},  
      server: 'http://localhost:8888',
      highlight_segments: true
    };

    srv.init = function(channel_id, segmentation_id) {
      srv.channel_id = channel_id;
      srv.segmentation_id = segmentation_id;

      srv.create_canvas();
      srv.create_planes();
      loadTilesForAxis('xy', function() {});
    };

    srv.currentTile = function () {
      //TODO modfile tiles to use channels , segmentation
      return srv.tiles[srv.currentTileIdx];
    };

    srv.setCurrentTile =  function (i, hard) {
      
      srv.currentTileIdx = i;
      if (srv.currentTileFloat === undefined || hard) {
        srv.currentTileFloat = i;
      }

      if (!('z' in srv.planes)) {
        return;
      }
      
      srv.planes.z.position.z = i / srv.CUBE_SIZE;
      overlayService.setTimeline(srv.planes.z.position.z);

      meshService.meshes.children.forEach(function (segment) {
        // - 1 / 512; // TODO this combo with three.js works, don't know why, seems to cause minor artifacts on snap to ortho
        segment.children.forEach(function (mesh) {
          mesh.material.uniforms.nMin.value.z = srv.planes.z.position.z;
        });
      });

      srv.draw();
    };


    function loadTilesForAxis(axis, callback) {
      for (var i = 0; i < srv.CUBE_SIZE; i++) {
        srv.tiles[i] = { segmentation: {}, channel: {} , count:0};
      }

      srv.CHUNKS.forEach(function(chunk) {
        getImagesForVolXY(srv.channel_id, chunk, axis, 'channel', callback);
        getImagesForVolXY(srv.segmentation_id, chunk, axis, 'segmentation', callback);
      });
    }


    // load all the tiles for the given axis in the given chunk of the given type
    // ex. load all the segmentation tiles in chunk (0, 0, 0) for the 'z' axis (x/y plane)
    function getImagesForVolXY(volId, chunk, axis, type, callback) {
      var url = srv.server + "/volume/" + volId + "/chunk/0/" +
      chunk[0] + "/" + chunk[1] + "/" + chunk[2] + "/tile/" +
      axis + "/" + 0 + ":" + srv.CHUNK_SIZE;

      $http({
        method: 'GET',
        url: url,
      }).then(function successCallback(response) {
          // this callback will be called asynchronously
          // when the response is available
          var tilesRes = response.data;
          for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
            var realTileNum = chunk[2] * srv.CHUNK_SIZE + trIdx;
            srv.load(realTileNum , tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
          }

        }, function errorCallback(response) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
          console.error(response);
      });
    }

    srv.create_canvas = function() {

      srv.bufferCanvas = document.createElement('canvas');
      srv.bufferCanvas.height = srv.bufferCanvas.width = srv.CHUNK_SIZE;
      srv.bufferContext = srv.bufferCanvas.getContext('2d');

      srv.segCanvas = document.createElement('canvas');
      srv.segCanvas.height = srv.segCanvas.width = srv.CUBE_SIZE;
      srv.segContext = srv.segCanvas.getContext('2d');

      srv.stagingCanvas = document.createElement('canvas');
      srv.stagingCanvas.height = srv.stagingCanvas.width = srv.CUBE_SIZE;
      srv.stagingContext = srv.stagingCanvas.getContext('2d');
    };

    srv.create_planes = function() {
      
      var planeGeometry = new THREE.BoxGeometry(1, 1, 1 / srv.CUBE_SIZE);
      planeGeometry.faceVertexUvs[0][10] = [new THREE.Vector2(1, 1), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];
      planeGeometry.faceVertexUvs[0][11] = [new THREE.Vector2(1, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
      
      var channelTex = new THREE.Texture(srv.stagingCanvas,
                                          undefined,
                                          undefined,
                                          undefined,
                                          THREE.NearestFilter,
                                          THREE.NearestFilter
                                          );
      channelTex.flipY = false;
      channelTex.generateMipmaps = false;

      var imageMat = new THREE.MeshBasicMaterial({
        map: channelTex,
        color: 0xFFFFFF,
        opacity: 0.8,
        transparent: true,
      });
    
      // this seems to disable flickering
      imageMat.polygonOffset = true;
      // positive value is pushing the material away from the screen
      imageMat.polygonOffsetFactor = 0.1; // https://www.opengl.org/archives/resources/faq/technical/polygonoffset.htm

      var plainMat = new THREE.MeshBasicMaterial({
        color: 0xCCCCCC,
        opacity: 0.8,
        transparent: true
      });

      var materials = [
        plainMat,
        plainMat,
        plainMat,
        plainMat,
        imageMat,
        imageMat,
      ];

      srv.planes.z = new THREE.Mesh(planeGeometry, new THREE.MeshFaceMaterial(materials));
      srv.planes.z.position.x = 0.5;
      srv.planes.z.position.y = 0.5;

      srv.planesHolder = new THREE.Object3D();
      srv.planesHolder.position.set(-0.5, -0.5, -0.5);
      srv.planesHolder.add(srv.planes.z);
    };

    function convertBase64ImgToImage(b64String, callback) {
      var imageBuffer = new Image();
      imageBuffer.onload = function () {
        callback(this);
      };
      imageBuffer.src = b64String;
    }

    // loads all the segmentation and channel images for this tile
    // and runs the callback when complete
    // tiles are queued for loading to throttle the rate.
    srv.load = function (tile_idx , data, type, x, y, callback) {

      var chunk = y * 2 + x;

      if (srv.tiles[tile_idx][type][chunk]) {
        return; // chunk already loaded or in queue
      }

      srv.tiles[tile_idx][type][chunk] = true; // mark it as being in progress

      convertBase64ImgToImage(data, function (image) {
        srv.tiles[tile_idx][type][chunk] = image;
        srv.tiles[tile_idx].count++;

          if (srv.isComplete(tile_idx)) { // all tiles have been loaded
            callback(srv.tiles[tile_idx]);
          }
      });
    };

    srv.isComplete = function(tile_idx) {
      return srv.tiles[tile_idx].count === 8;
    };

    srv.draw = function () {

      if (!this.isComplete(srv.currentTileIdx)) {
        console.log('not complete');
        return;
      }

      var tile = srv.currentTile();

      for (var i = 0; i < 4; i++) {
        var x = i % 2;
        var y = i < 2 ? 0 : 1;

        srv.stagingContext.drawImage(tile.channel[i], x * srv.CHUNK_SIZE, y * srv.CHUNK_SIZE);
        srv.segContext.drawImage(tile.segmentation[i], x * srv.CHUNK_SIZE, y * srv.CHUNK_SIZE);
      }
      highlight();
      
      srv.planes.z.material.materials[5].map.needsUpdate = true; //What are the other materials for?
    };

  
    // highlight the seeds and selected segments in the tile 2d view
    // returns a new image buffer
    function highlight() {

      if (!srv.highlight_segments) { 
        return;
      }


      // copy is a working buffer to add highlights without modifying the original tile data
      var segPixels = srv.segContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE).data;
      var channelImageData = srv.stagingContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE);
      var channelPixels = channelImageData.data;

      var segment_ids = [];
      var colors = [];

      //A segment is composed of many meshes(one per chunk)
      meshService.meshes.children.forEach(function (segment) {
        if (segment.children.length) {
          colors.push(segment.children[0].material.uniforms.color.value);
          segment_ids.push(segment.segment_id);
        }
      });



      // get the color for a pixel in the given buffer
      function getColor(buffer, startIndex) {
        return [buffer[startIndex], buffer[startIndex+1], buffer[startIndex+2]];
      }

      // highlights the pixel with the given rgb and alpha
      function setColorAlpha(buffer, startIndex, color, alpha) {
        var overlayColor = [color.r * alpha* 255, color.g * alpha * 255,color.b * alpha* 255];

        for (var i = 0; i < 3; i++) {
          buffer[startIndex + i] = overlayColor[i] + buffer[startIndex + i] * (1 - alpha);
        }
      }

      // loop through all the pixels
      for (var j = 0; j < segPixels.length; j += 4) {
        var rgb = getColor(segPixels, j);

        // is the current pixel part of selected segment? if so highlight it
        for (var k = 0; k < colors.length; k += 1) {
          if (rgbEqual(segIdToRGB(segment_ids[k]), rgb)) {
            setColorAlpha(channelPixels, j, colors[k], 0.25);
          }
        }
      }
      srv.stagingContext.putImageData(channelImageData, 0, 0);
    }

    // returns the the segment id located at the given x y position of this tile
    srv.segIdForPosition = function(x, y) {
      var segPixels = srv.segContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE).data;
      // var data = //this.segmentation[chunkY * 2 + chunkX].data;
      var start = (y * srv.CUBE_SIZE + x) * 4;
      var rgb = [segPixels[start], segPixels[start+1], segPixels[start+2]];
      return rgbToSegId(rgb);
    };

    function rgbEqual(rgb1, rgb2) {
      return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
    }

    function rgbToSegId(rgb) {
      return rgb[0] + rgb[1] * 256 + rgb[2] * 256 * 256;
    }

    function segIdToRGB(segId) {
      var blue = Math.floor(segId / (256 * 256));
      var green = Math.floor((segId % (256 * 256)) / 256);
      var red = segId % 256;

      return [red, green, blue];
    }

    return srv;
  });
