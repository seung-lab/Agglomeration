'use strict';

/**
 * @ngdoc service
 * @name cubeApp.meshService
 * @description
 * # meshService
 * Service in the cubeApp.
 */

 //TODO define CHUNKS
angular.module('cubeApp')
  .service('meshService', function () {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      opacity: 1.0
    }
    function get( volume_id , segment_id, callback ) {

      count = 0
      var segmentMesh = new THREE.Object3D();
      segmentMesh.segId = segId;
      segmentMesh.name = "segId " + segId;
      SegmentManager.addMesh(segId, segmentMesh);
      SegmentManager.displayMesh(segId);

      CHUNKS.forEach(function(chunk, idx) {       
        var meshUrl = cache_domain + '/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;
        var ctm = new THREE.CTMLoader(false);
        ctm.load( meshUrl , function(geometry) { 

          var mesh = new THREE.Mesh( geometry , material);
          segmentMesh.add(mesh);

          if (count == CHUNKS.length) {
            callback(segmentMesh)
          }
          
        }, { 'useWorker': true } );
      });

    };

    function material(){
      
      var count = CHUNKS.length; // ensure that we have a response for each chunk
      var shader = angular.extend(true, { transparent: true  }, Shaders.idPacked);
      {
        var u = shader.uniforms;
        u.color.value = new THREE.Color(color);
        u.segid.value = segId;
        u.mode.value = 0;
        u.opacity.value = SegmentManager.opacity;
        u.nMin.value = new THREE.Vector3(0, 0, planes.z.position.z);
        u.nMax.value = new THREE.Vector3(1.0, 1.0, 1.0);
      }
      var material = new THREE.ShaderMaterial(shader);
      material.transparent = false;
      return material
    }

    return srv;

  });
