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
      _opacity: 1.0,
      meshes: new THREE.Object3D(),

      get opacity () {
        return this._opacity;
      },
      // sets the opacity for all segments
      set opacity (op) {
        this._opacity = op;

        var eps = 0.05;

        if (op < eps) {
          this.visible = false;
        } else if (op === 1) {
          this.visible = true;
          this.transparent = false;
        } else {
          this.visible = true;
          this.transparent = true;
        }
      },
    };

    function init() {
      srv.meshes.position.set(-.5, -.5, -.5);
    };
    init();

    srv.transparent = function() {
        return srv.transparent;
    };

    function get_mesh( volume_id , segment_id,  color, callback ) {

      var count = 0
      var segmentMesh = new THREE.Object3D();
      segmentMesh.segment_id = segment_id;
      var material = srv.get_material( color );
      material.side = THREE.DoubleSide;
      srv.CHUNKS.forEach(function(chunk, idx) {       
        var meshUrl = srv.server + '/volume/' + volume_id + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segment_id;
        var ctm = new THREE.CTMLoader(false);
        ctm.load( meshUrl , function(geometry) { 

          if (geometry) {
            var mesh = new THREE.Mesh( geometry , material );
            segmentMesh.add(mesh);
          }

          count ++;
          if (count == srv.CHUNKS.length) {
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

      var shader = Shaders.idPacked;
      {
        var u = shader.uniforms;
        u.color.value = new THREE.Color(color);
        u.mode.value = 0;
        u.opacity.value = srv.opacity;
        u.nMin.Value =  new THREE.Vector3(0.0, 0.0 , 0.0); //This value gets updated by the tileService
        u.nMax.value = new THREE.Vector3(1.0, 1.0, 1.0);
      }
      var material = new THREE.ShaderMaterial(shader);
      material.transparent = false;
      return material
    }

    srv.displayEdge = function(volume_id, edge) {
      
      srv.displayMesh ( volume_id, edge[0], 'red' );
      srv.displayMesh ( volume_id, edge[1], 'blue' );
    };

    srv.displayMesh = function(volume_id, segment_id, color ) {

      if (!(segment_id in srv.cache)) {
        get_mesh( volume_id , segment_id, color,  function(mesh) {
          srv.cache[segment_id] = mesh;
          srv.meshes.add(mesh);
        });
      } else {
        //TODO resfresh cache time, once we have real cache
        srv.meshes.add(srv.cache[segment_id]);
      }




    }

    return srv;

  });
