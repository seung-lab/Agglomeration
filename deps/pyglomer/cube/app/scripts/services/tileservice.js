'use strict';

/**
 * @ngdoc service
 * @name cubeApp.tileService
 * @description
 * # tileService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('tileService', function (overlayService, meshService, chunkService, $http) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    // Tile represents a single 2d 256x256 slice
    // since chunks are 128x128, a tile consists of 4 segments and 4 channel iamges.
    var srv = {
      CHUNK_SIZE: 128,
      CUBE_SIZE: new THREE.Vector3(256,256,256),
      CHUNKS:[],
      channel_id: null,
      segmentation_id: null,
      id: null,
      count: 0,
      opacity: 1.0,
      tiles: {},
      currentTileIdx: null,
      currentTileFloat: null,
      planes: {},  
      highlight_segments: true,
      initialized: false
    };

    srv.init = function(channel_id, segmentation_id) {
      srv.channel_id = channel_id;
      srv.segmentation_id = segmentation_id;

      for (var x=0; x < srv.CUBE_SIZE.x / srv.CHUNK_SIZE; ++x) {
        for (var y=0; y < srv.CUBE_SIZE.y / srv.CHUNK_SIZE; ++y) {
          for (var z=0; z < srv.CUBE_SIZE.z / srv.CHUNK_SIZE; ++z) {
            srv.CHUNKS.push([x,y,z]);
          }
        }        
      }

      chunkService.CHUNK_SIZE = srv.CHUNK_SIZE;
      chunkService.CUBE_SIZE = srv.CUBE_SIZE;
      meshService.CHUNK_SIZE = srv.CHUNK_SIZE;
      meshService.CUBE_SIZE = srv.CUBE_SIZE;
      meshService.CHUNKS = srv.CHUNKS;
      meshService.init();
      // console.log(srv.CHUNKS);

      srv.create_canvas();
      srv.create_planes();
      loadTilesForAxis('xy');
    };

    srv.currentTile = function () {
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
      
      srv.planes.z.position.z = i / srv.CUBE_SIZE.z;
      overlayService.setTimeline(srv.planes.z.position.z);

      meshService.meshes.children.forEach(function (segment) {
        // - 1 / 512; // TODO this combo with three.js works, don't know why, seems to cause minor artifacts on snap to ortho
        segment.children.forEach(function (mesh) {
          mesh.material.uniforms.nMin.value.z = srv.planes.z.position.z;
        });
      });

      srv.draw();
    };


    function loadTilesForAxis(axis) {
      for (var z = 0; z < srv.CUBE_SIZE.z; z++) {
        srv.tiles[z] = { segmentation: {}, channel: {} , count:0};
      }

      srv.CHUNKS.forEach(function(chunk) {
        chunkService.getImagesForVol(srv.channel_id, chunk, axis, 'channel', function(tile_idx, type, x, y ,image){
            srv.tiles[tile_idx][type][[x,y]] = image;
            srv.tiles[tile_idx].count++;
        });
        chunkService.getImagesForVol(srv.segmentation_id, chunk, axis, 'segmentation', function(tile_idx, type, x, y , image){
            srv.tiles[tile_idx][type][[x,y]] = image;
            srv.tiles[tile_idx].count++;
        });
      });
    }


    srv.create_canvas = function() {

      srv.bufferCanvas = document.createElement('canvas');
      srv.bufferCanvas.height = srv.bufferCanvas.width = srv.CHUNK_SIZE;
      srv.bufferContext = srv.bufferCanvas.getContext('2d');

      srv.segCanvas = document.createElement('canvas');
      srv.segCanvas.width = srv.CUBE_SIZE.x;
      srv.segCanvas.height = srv.CUBE_SIZE.y; 
      srv.segContext = srv.segCanvas.getContext('2d');

      // staging canvas is where the data is prepared for future presentation on a different canvas
      srv.stagingCanvas = document.createElement('canvas');
      srv.stagingCanvas.width = srv.CUBE_SIZE.x;
      srv.stagingCanvas.height = srv.CUBE_SIZE.y;
      srv.stagingContext = srv.stagingCanvas.getContext('2d');
    };

    function createPlaneMaterial() {
      //It returns a material for each side of the "plane" which is actually a box
      //where z << x && z << y

      var channelTex = new THREE.Texture(srv.stagingCanvas, //image
                                          undefined, //mapping
                                          undefined, //wrapS
                                          undefined, //wrapT
                                          THREE.NearestFilter, //magFilter
                                          THREE.NearestFilter  //minFilter
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
      return materials;
    }
    srv.create_planes = function() {
      
      //Plane geometry is the one that holds the electron microscopy image, it has some tickness that's why
      //we are using a box
      var planeGeometry = new THREE.BoxGeometry(1, 1, 1 / (srv.CUBE_SIZE.z));
      planeGeometry.faceVertexUvs[0][10] = [new THREE.Vector2(1, 1), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];
      planeGeometry.faceVertexUvs[0][11] = [new THREE.Vector2(1, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
      
      var materials = createPlaneMaterial();
      srv.planes.z = new THREE.Mesh(planeGeometry, new THREE.MeshFaceMaterial(materials));
      srv.planes.z.position.x = 0.5;
      srv.planes.z.position.y = 0.5;

      srv.planesHolder = new THREE.Object3D();
      srv.planesHolder.position.set(-0.5, -0.5, -0.5);
      srv.planesHolder.add(srv.planes.z);
    };


    // loads all the segmentation and channel images for this tile
    // and runs the callback when complete
    // tiles are queued for loading to throttle the rate.


    srv.isComplete = function(tile_idx) {
      return srv.tiles[tile_idx].count === (srv.CUBE_SIZE.x / srv.CHUNK_SIZE) * (srv.CUBE_SIZE.y / srv.CHUNK_SIZE) * 2;
    };

    srv.draw = function () {

      if (!srv.isComplete(srv.currentTileIdx)) {
        console.log('not complete '+ srv.tiles[srv.currentTileIdx].count);
        return;
      }

      var tile = srv.currentTile();

      for (var x=0; x < srv.CUBE_SIZE.x / srv.CHUNK_SIZE; ++x) {
        for (var y=0; y < srv.CUBE_SIZE.y / srv.CHUNK_SIZE; ++y) {
          srv.stagingContext.drawImage(tile.channel[[x,y]], x * srv.CHUNK_SIZE, y * srv.CHUNK_SIZE);
          srv.segContext.drawImage(tile.segmentation[[x,y]], x * srv.CHUNK_SIZE, y * srv.CHUNK_SIZE);
        }
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
      var segPixels = srv.segContext.getImageData(0, 0, srv.CUBE_SIZE.x, srv.CUBE_SIZE.y).data;
      var channelImageData = srv.stagingContext.getImageData(0, 0, srv.CUBE_SIZE.x, srv.CUBE_SIZE.y);
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
      var segPixels = srv.segContext.getImageData(0, 0, srv.CUBE_SIZE.x, srv.CUBE_SIZE.y).data;
      // var data = //this.segmentation[chunkY * 2 + chunkX].data;
      var start = (y * srv.CUBE_SIZE.y + x) * 4;
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
