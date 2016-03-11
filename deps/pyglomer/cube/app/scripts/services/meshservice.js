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
      cache: {},
      server: 'http://localhost:8888',
      transparent: false,
      opacity: 1.0,
      meshes: new THREE.Object3D(),
      pixelToSegId: new Int32Array(256 * 256 * 256)  
    };

    window.meshService = srv;
    
    // sets the opacity for all segments
    srv.setOpacity = function(op) {
      srv.opacity = op;
      srv.meshes.children.forEach(function (segment) {
        srv.setSegmentOpacity(segment , op); 
      });
  
      var eps = 0.05;

      if (op < eps) {
        srv.meshes.visible = false;
      } else if (op === 1) {
        srv.meshes.visible = true;
        srv.meshes.children.forEach(function (segment) {
          segment.visible = true; 
        });
        srv.meshes.transparent = false;
      } else {
        srv.meshes.visible = true;
        srv.meshes.transparent = true;
      }
    };

    function init() {
      srv.meshes.position.set(-0.5, -0.5, -0.5);
    }
    init();

    function get_mesh( volume_id , segment_id,  color, callback ) {

      var count = 0;
      var segmentMesh = new THREE.Object3D();
      segmentMesh.segment_id = segment_id;
      var material = srv.get_material( color );
      material.issegment = true; // hacked three.js so that we can render transparent segments before and after the plane

      srv.CHUNKS.forEach(function(chunk, idx) {       
        var meshUrl = srv.server + '/volume/' + volume_id + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segment_id;
        var ctm = new THREE.CTMLoader(false);
        ctm.load( meshUrl , function(bufferGeometry) { 

          if (bufferGeometry) {

            var geometry = new THREE.Geometry().fromBufferGeometry( bufferGeometry );
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();
            var mesh = new THREE.Mesh( geometry , material );
            var edges = new THREE.FaceNormalsHelper( mesh, 20, 0x00ff00, 10 );
            segmentMesh.add(mesh);
         

          }

          count++;
          if (count === srv.CHUNKS.length) {
            callback(segmentMesh)
          }
          
        }, { 'useWorker': true } );
      });

    };

    srv.get_material = function( color ) {
      
      var count = srv.CHUNKS.length; // ensure that we have a response for each chunk
      var Shaders = {
        idPacked: {
          transparent: true,
          side: THREE.DoubleSide,
          uniforms: {
            color: { type: "c", value: new THREE.Color( 0xffffff ) },
            opacity: { type: "f", value: 1.0 },
            taskid: { type: "i", value: 0 },
            segid: { type: "i", value: 0 },
            mode: { type: "i", value: 0 },

            diffuse: { type: "c", value: new THREE.Color( 0xeeeeee ) },
            ambient: { type: "c", value: new THREE.Color( 0xffffff ) },
            specular: { type: "c", value: new THREE.Color( 0x666666 ) },
            shininess: { type: "f", value: 30 },
            ambientLightColor: { type: "c", value: new THREE.Color( 0x111111 ) },

            nMin: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
            nMax: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
          },

          vertexShader: [
            "varying vec3 vViewPosition;",
            "varying vec3 vNormal;",
            "varying vec4 vPos;",
            "void main() {",
              "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

              "vViewPosition = -mvPosition.xyz;",
              "vNormal = normalMatrix * normal;",

              "vPos = vec4(position, 1.0);",

              "gl_Position = projectionMatrix * mvPosition;",
            "}"
          ].join("\n"),

          fragmentShader: [
            "uniform float tilePosition;",
            "uniform vec3 color;",
            "uniform float opacity;",
            "uniform int taskid;",
            "uniform int segid;",
            "uniform int mode;",

            "uniform vec3 diffuse;",
            "uniform vec3 ambient;",
            "uniform vec3 specular;",
            "uniform float shininess;",

            "uniform bool clip;",
            "uniform vec3 nMin;",
            "uniform vec3 nMax;",

            "uniform vec3 ambientLightColor;",

            "varying vec3 vViewPosition;",
            "varying vec3 vNormal;",
            "varying vec4 vPos;",

            "vec3 pack_int( const in int id ) {",

              "const highp vec3 bit_shift = vec3( 256.0 * 256.0, 256.0, 1.0 );",
              "float fid = float(id);",
              "vec3 res = floor(fid / bit_shift);",
              "res = mod(res, 256.0);",
              "return (res / 255.0);",

            "}",

            "void main() {",
              "if (any(lessThan(vPos.xyz, nMin)) || any(greaterThan(vPos.xyz, nMax))) {",
                "discard;",
              "}",

                "gl_FragColor.rgb = color;",

                "vec3 normal = normalize( vNormal );",
                "vec3 viewPosition = normalize( vViewPosition );",

                "vec4 lDirection = viewMatrix * vec4( cameraPosition, 0.0 );",
                "vec3 dirVector = normalize( lDirection.xyz );",

                // diffuse

                "float dotProduct = dot( normal, dirVector );",
                "float dirDiffuseWeight = max( dotProduct, 0.0 );",
                "vec3 dirDiffuse = diffuse * dirDiffuseWeight;",

                // specular

                "vec3 dirHalfVector = normalize( dirVector + viewPosition );",
                "float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
                "float dirSpecularWeight = max( pow( dirDotNormalHalf, shininess ), 0.0 );",

                "vec3 dirSpecular = specular * dirSpecularWeight * dirDiffuseWeight;",

                "gl_FragColor.rgb = gl_FragColor.rgb * ( dirDiffuse + ambientLightColor * ambient ) + dirSpecular;",
                "gl_FragColor.a = opacity;",
            "}"
          ].join("\n")
        }
      };

      //each segment should be rendered twice, once as if it is in front of the plane, and also as if it is behind the plane
      //If you look at the shader, I use nMin/nMax to only render part of the segment.
      //this is because threejs cannot determine which part of the segment is in front of the tile or behind the tile so you get transparency error
      var shader = Shaders.idPacked;
      {
        var u = shader.uniforms;
        u.color.value = color;
        u.mode.value = 0;
        u.opacity.value = 1.0;
        u.nMin.value =  new THREE.Vector3(0.5, 0.5 , 0.5); //This value gets updated by the tileService
        u.nMax.value = new THREE.Vector3(1.0, 1.0, 1.0);
      }
      var material = new THREE.ShaderMaterial(shader);
      material.transparent = false;
      return material
    }

    srv.displayEdge = function(volume_id, edge, callback) {
      
      srv.displayMesh ( volume_id, edge[0], 'red' , callback);
      srv.displayMesh ( volume_id, edge[1], 'blue' , callback);
    };

    srv.displayMesh = function(volume_id, segment_id, color ,callback) {

      var color =  new THREE.Color(color);
      if (!(segment_id in srv.cache)) {
        get_mesh2( volume_id , segment_id, color,  function(mesh) {
          srv.cache[segment_id] = mesh;
          srv.meshes.add(mesh);
          callback(mesh);
        });
      } else {
        //TODO resfresh cache time, once we have a real cache
        var segment = srv.cache[segment_id]
        srv.setSegmentColor(segment, color);
        srv.meshes.add(segment);
        callback(segment);
      }
    }

    srv.setSegmentColor = function(segment , color) {
      segment.children.forEach(function (mesh) {
        mesh.material.uniforms.color.value = color;
      });
    };
    srv.setSegmentOpacity = function(segment , opacity) {
      segment.children.forEach(function (mesh) {
        mesh.material.uniforms.opacity.value = opacity;
      });
    };

    function generateMeshForSegment(segId) {
      var segGeo = generateGeoForSegment(segId, pixelToSegId);

      var color = SegmentManager.isSeed(segId) ? "rgb(0, 104, 242)" : "rgb(40, 205, 255)";
      var shader = $.extend(true, {
        transparent: true,
        side: THREE.DoubleSide
      }, Shaders.idPacked);
      
      var u = shader.uniforms;
      u.color.value = new THREE.Color(color);
      u.segid.value = segId;
      u.mode.value = 0;
      u.opacity.value = SegmentManager.opacity;

      u.nMin.value = new THREE.Vector3(0.0, 0.0, planes.z.position.z);
      u.nMax.value = new THREE.Vector3(1.0, 1.0, 1.0);

      var material = new THREE.ShaderMaterial(shader);

      var segMesh = new THREE.Mesh(segGeo, material);

      material.issegment = true; // hacked three.js so that we can render transparent segments before and after the plane

      return segMesh;
    }

    function get_mesh2( volume_id , segment_id,  color, callback ) {

      var count = 0;
      var segmentMesh = new THREE.Object3D();
      segmentMesh.segment_id = segment_id;
      var material = srv.get_material( color );
      material.issegment = true; // hacked three.js so that we can render transparent segments before and after the plane
      var geometry = generateGeoForSegment(segment_id, srv.pixelToSegId);
  
      var mesh = new THREE.Mesh( geometry , material );
      segmentMesh.add(mesh);  
      callback(segmentMesh);
    };


    return srv;

  });
