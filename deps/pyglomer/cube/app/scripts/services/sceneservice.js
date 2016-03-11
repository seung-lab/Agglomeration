'use strict';

/**
 * @ngdoc service
 * @name cubeApp.sceneService
 * @description
 * # sceneService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('sceneService', function ($window, meshService, tileService) {
    // AngularJS will instantiate a singleton by calling "new" on srv function

    var srv = {
      bufferCanvas: null,
      camera:null,
      scene:null,
      cube:null,
      isZoomed: false
    }; //service

    srv.create_camera = function (perspFov, orthoFov, viewHeight) {

      function simpleViewHeight(fov, realHeight) {
        function deg2Rad(deg) { return deg / 180 * Math.PI; }
        var radius = realHeight / Math.sin(deg2Rad(fov)) * Math.sin(deg2Rad((180 - fov) / 2));
        return fov * radius;
      }

      var realCamera = new THREE.PerspectiveCamera(
        perspFov, // Field of View (degrees)
        $window.innerWidth / $window.innerHeight, // Aspect ratio (set later) TODO why?
        0.2, // Inner clipping plane // TODO, at 0.1 you start to see white artifacts when scrolling quickly
        1300 // Far clipping plane
      );

      realCamera.position.set(0, 0, simpleViewHeight(perspFov, viewHeight) / perspFov);
      realCamera.up.set(0, 1, 0);
      realCamera.lookAt(new THREE.Vector3(0, 0, 0));

      return {
        realCamera: realCamera,
        perspFov: perspFov,
        orthoFov: orthoFov,
        _viewHeight: viewHeight,
        fakeViewHeight:simpleViewHeight(perspFov, viewHeight),
        set viewHeight(vH) {
          this._viewHeight = vH;
          this.fakeViewHeight = simpleViewHeight(perspFov, vH);
          this.fov = srv.fov; // hahaha
        },
        get viewHeight() {
          return srv._viewHeight;
        },
        get fov() {
          return realCamera.fov;
        },
        set fov(fov) {
          realCamera.fov = fov; 
          realCamera.position.z =  this.fakeViewHeight / fov;
          realCamera.updateProjectionMatrix();
        }
      };
    };


    srv.create_cube = function() {
      
      srv.pivot = new THREE.Object3D();
      srv.scene.add(srv.pivot);

      srv.cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshNormalMaterial({visible: false})
      );
      srv.pivot.add(srv.cube);


      var light = new THREE.DirectionalLight(0xffffff);
      light.position.copy(srv.camera.realCamera.position);
      srv.scene.add(light);


      var wireframe = new THREE.BoxHelper(srv.cube);
      wireframe.material.color.set("#000000");
      srv.pivot.add(wireframe);
    };




    srv.init = function() {

      srv.renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true, // TODO, why?
        alpha: true,
      });
      // renderer.state.setDepthTest(false); // TODO, why did we do this?

      srv.renderer.setPixelRatio($window.devicePixelRatio);
      srv.renderer.setSize($window.innerWidth, $window.innerHeight);
      // ThreeDView.setSize($window.innerWidth, $window.innerHeight);

      srv.scene = new THREE.Scene();

      var webGLContainer = document.getElementById('webGLContainer');//$('#webGLContainer');
      webGLContainer.appendChild(srv.renderer.domElement);

      srv.camera = srv.create_camera(40, 0.1, 2);

      srv.scene.add(srv.camera.realCamera);
   
      srv.create_cube();
   
      srv.resize();

      srv.render = (function () {
        var faceVec = new THREE.Vector3();
        var cameraToPlane = new THREE.Vector3();
        var normalMatrix = new THREE.Matrix3();
        srv.scene.autoUpdate = false; // since we call updateMatrixWorld below
        return function () {

          if (tileService.planes.z === undefined) {
            return;
          }
          srv.scene.updateMatrixWorld();
          cameraToPlane.setFromMatrixPosition(tileService.planes.z.matrixWorld);
          cameraToPlane.subVectors(srv.camera.realCamera.position, cameraToPlane);
          faceVec.set(0, 0, 1);
          normalMatrix.getNormalMatrix(tileService.planes.z.matrixWorld);
          faceVec.applyMatrix3(normalMatrix).normalize();

          // is the camera on the same side as the front of the plane?
          var cameraInFront = cameraToPlane.dot(faceVec) >= 0;
          srv.renderer.render(srv.scene, srv.camera.realCamera, undefined, undefined, cameraInFront);
        };
      }());
    };

    srv.resize = function() {

      srv.camera.realCamera.aspect = $window.innerWidth / $window.innerHeight;
      srv.camera.realCamera.updateProjectionMatrix();
      srv.renderer.setSize($window.innerWidth, $window.innerHeight);
      srv.needsRender = true;

      // ThreeDView.setSize(window.innerWidth, window.innerHeight);
    };

    return srv;

  });
