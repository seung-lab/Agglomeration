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
  .service('meshService', function (globals) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var srv = {
      cache: {},
      server: 'http://localhost:8888',
      transparent: false,
      opacity: 1.0,
      meshes: new THREE.Object3D(),
      chunks: {},
    };
     

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

    function init(){

      // I have no clue why I have to apply this mirroring
      // And rotation to have channel images and meshes orientation Matching
      var mS = (new THREE.Matrix4()).identity();
      mS.elements[0] = -1;
      mS.elements[5] = -1;
      mS.elements[10] = -1;
      srv.meshes.applyMatrix(mS);
      srv.meshes.rotateX(Math.PI)
      srv.meshes.rotateY(Math.PI/2)

    }
    init();

    srv.get_material = function( color ) {
      
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

    srv.displayEdge = function(edge, callback) {
      
      //TODO modify this so it supports many segment_ids for each edge
      edge.atomic_1.forEach(function(seg_id) {
        srv.displayMesh ( seg_id, 'red' , callback);
      });

       edge.atomic_2.forEach(function(seg_id) {
        srv.displayMesh ( seg_id , 'blue' , callback);
      });

    };

    srv.displayMesh = function(segment_id, color ,callback) {
      if (segment_id == 0) {
        return
      }

      var color =  new THREE.Color(color);
      if (!(segment_id in srv.cache)) {
        get_mesh(segment_id, color,  function(mesh) {
          if (mesh == null) {
            return null;
          }

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
      segment.material.uniforms.opacity.value = opacity;
    };

    function get_mesh(segment_id,  color, callback ) {
      // Compute the mesh in the browser using marching cubes
      var count = 0;
      var segmentGeometry = new THREE.Geometry();
      segmentGeometry.segment_id = segment_id;
      var material = srv.get_material( color );
      material.issegment = true; // hacked three.js so that we can render transparent segments before and after the plane

      var chunks_with_meshes = 0;
      for (var key in srv.chunks) {
        
        if (segment_id in srv.chunks[key]) {
          chunks_with_meshes++;
          // instantiate a loader
          var loader = new THREE.JSONLoader();
          var geometry = loader.parse(srv.chunks[key][segment_id]).geometry;
          segmentGeometry.merge(geometry);

        }
      }
      if (chunks_with_meshes == 0){
        console.error("there is no mesh for segment id: "+ segment_id.toString() )
        return null;
      }

      segmentGeometry.scale(0.5 / 64.0, 0.5 / 384.0, 0.5 / 384.0);
    
      var segmentMesh = new THREE.Mesh( segmentGeometry , material );
      segmentMesh.segment_id = segment_id;
      segmentMesh.position.set(-0.5,-0.5,-0.5);
      callback(segmentMesh);
    };

 
    return srv;

  });
