'use strict';

/**
 * @ngdoc service
 * @name cubeApp.tileService
 * @description
 * # tileService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('tileService', function (overlayService) {
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
      segmentation: {},
      channel: {},
      currentTileIdx: null,
      currentTileFloat: null,
      planes: {}
    };

    srv.init = function(channel_id, segmentation_id) {
      srv.channel_id = channel_id;
      srv.segmentation_id = segmentation_id;

      srv.create_canvas();
      srv.create_planes();
    };

    srv.currentTile = function () {
      //TODO modfile tiles to use channels , segmentation
      return srv.tiles[srv.currentTileIdx]
    };

    srv.setCurrentTile =  function (i, hard) {
      
      srv.currentTileIdx = i;
      if (srv.currentTileFloat === undefined || hard) {
        srv.currentTileFloat = i;
      }
      
      srv.planes.z.position.z = i / srv.CUBE_SIZE;
      overlayService.setTimeline(srv.planes.z.position.z);

      //TODO fix this
      // segments.children.forEach(function (segment) {
      //   if (segment.material && segment.material.uniforms) { //This is only available after finish loading the meshes
      //     segment.material.uniforms.nMin.value.z = planes.z.position.z;// - 1 / 512; // TODO this combo with three.js works, don't know why, seems to cause minor artifacts on snap to ortho
      //   }
      // });

      // var curTile = srv.currentTile();
      // if (curTile) { // TODO this is only for the intiial loading check. Move that somewhere else?
      //   curTile.draw();
      // }
      
      //TODO fix this
      // needsRender = true;
      // sceneService.pleaseRender();
    };


    function loadTilesForAxis(axis, startingTile, callback) {
      for (var i = 0; i < srv.CUBE_SIZE; i++) {
        TileManager.tiles[i] = new Tile(i);
      }

      for (var i = 0; i < 4; i++) {
        var chunk = srv.CHUNKS[i];
        getStartingTiles(startingTile, 1, srv.channel_id, chunk, axis, 'channel', callback);
        getStartingTiles(startingTile, 1, srv.segmentation_id, chunk, axis, 'segmentation', callback);
      }

      for (var i = 0; i < 4; i++) {
        var chunk = srv.CHUNKS[i];
        getStartingTiles(startingTile, 32, srv.channel_id, chunk, axis, 'channel', callback);
        getStartingTiles(startingTile, 32, srv.segmentation_id, chunk, axis, 'segmentation', callback);
      }

      srv.CHUNKS.forEach(function(chunk) {
        getImagesForVolXY(srv.channel_id, chunk, axis, 'channel', callback);
        getImagesForVolXY(srv.segmentation_id, chunk, axis, 'segmentation', callback);
      });
    }

    // get tiles around the starting tile
    function getStartingTiles(realTileNum, bundleSize, volId, chunk, axis, type, callback) {
      var chunkTile = realTileNum % CHUNK_SIZE;
      var chunkZ = Math.floor(realTileNum / CHUNK_SIZE);
      var start = clamp(chunkTile - Math.floor(bundleSize / 2), 0, CHUNK_SIZE - bundleSize);
      var range = [start, start + bundleSize];
      var url = srv.server + "/volume/" + volId + "/chunk/0/" + chunk[0] + "/" + chunk[1] + "/" + chunkZ + "/tile/" + axis + "/" + range[0] + ":" + range[1];

      $.get(url).done(function (tilesRes) {
        for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
          var realTileNum = chunkZ * CHUNK_SIZE + range[0] + trIdx;

          srv.tiles[realTileNum].load(tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
        }
      });
    }

    // load all the tiles for the given axis in the given chunk of the given type
    // ex. load all the segmentation tiles in chunk (0, 0, 0) for the 'z' axis (x/y plane)
    function getImagesForVolXY(volId, chunk, axis, type, callback) {
      var url = srv.server + "/volume/" + volId + "/chunk/0/" + chunk[0] + "/" + chunk[1] + "/" + chunk[2] + "/tile/" + axis + "/" + 0 + ":" + CHUNK_SIZE;
      $.get(url).done(function (tilesRes) {
        for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
          var realTileNum = chunk[2] * CHUNK_SIZE + trIdx;

          TileManager.tiles[realTileNum].load(tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
        }
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
    }

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
      srv.planesHolder.position.set(-.5, -.5, -.5);
      srv.planesHolder.add(srv.planes.z);
    };

    srv.isComplete = function() {
      return srv.count === 8;
    }

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
    srv.load = function (data, type, x, y, callback) {

      var chunk = y * 2 + x;

      if (srv[type][chunk]) {
        return; // chunk already loaded or in queue
      }

      srv[type][chunk] = true; // mark it as being in progress

      tileLoadingQueue.push(function () {
        convertBase64ImgToImage(data, function (image) {
          srv[type][chunk] = image;
          srv.count++;

          if (srv.isComplete()) { // all tiles have been loaded
            callback(srv);
          }
        });
      });
    };

    srv.draw = function () {
      if (!this.isComplete()) {
        console.log('not complete');
        return;
      }

      for (var i = 0; i < 4; i++) {
        var x = i % 2;
        var y = i < 2 ? 0 : 1;

        //TODO This are define in scene
        // stagingContext.drawImage(this.channel[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
        // segContext.drawImage(this.segmentation[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
      }

      if (highlight_segments) { 
        highlight();
      }

      //TODO acess planes from here
      // planes.z.material.materials[5].map.needsUpdate = true; //What are the other materials for?
    };

  
    // highlight the seeds and selected segments in the tile 2d view
    // returns a new image buffer
    function highlight() {
      // copy is a working buffer to add highlights without modifying the original tile data
      var segPixels = segContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE).data;
      var channelImageData = stagingContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE);
      var channelPixels = channelImageData.data;

      var selectedColors = SegmentManager.selectedColors;
      var seedColors = SegmentManager.seedColors;

      // get the color for a pixel in the given buffer
      function getColor(buffer, startIndex) {
        return [buffer[startIndex], buffer[startIndex+1], buffer[startIndex+2]];
      }

      // highlights the pixel with the given rgb and alpha
      function setColorAlpha(buffer, startIndex, rgb, alpha) {
        var overlayColor = [rgb[0] * alpha, rgb[1] * alpha, rgb[2] * alpha];

        for (var i = 0; i < 3; i++) {
          buffer[startIndex + i] = overlayColor[i] + buffer[startIndex + i] * (1 - alpha);
        }
      }

      // loop through all the pixels
      for (var j = 0; j < segPixels.length; j += 4) {
        var rgb = getColor(segPixels, j);

        // is the current pixel part of selected segment? if so highlight it
        for (var k = 0; k < selectedColors.length; k += 1) {
          if (rgbEqual(segIdToRGB(SegmentManager.selected[k]), rgb)) {
            setColorAlpha(channelPixels, j, selectedColors[k], 0.5);
          }
        }
      }

      stagingContext.putImageData(channelImageData, 0, 0);

      // return copy;
    }

    // returns the the segment id located at the given x y position of this tile
    srv.segIdForPosition = function(x, y) {
      var segPixels = segContext.getImageData(0, 0, srv.CUBE_SIZE, srv.CUBE_SIZE).data;
      // var data = //this.segmentation[chunkY * 2 + chunkX].data;
      var start = (y * srv.CUBE_SIZE + x) * 4;
      var rgb = [segPixels[start], segPixels[start+1], segPixels[start+2]];
      return rgbToSegId(rgb);
    };



    return srv;
  });
