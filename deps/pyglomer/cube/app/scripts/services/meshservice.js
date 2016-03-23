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
      pixelToSegId: new Int32Array(globals.CUBE_SIZE.x * globals.CUBE_SIZE.y * globals.CUBE_SIZE.z)
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
      srv.meshes.position.set(-0.5, -0.5, -0.5);
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
      srv.displayMesh ( edge[0][0], 'red' , callback);
      srv.displayMesh ( edge[1][0], 'blue' , callback);
    };

    srv.displayMesh = function(segment_id, color ,callback) {

      var color =  new THREE.Color(color);
      if (!(segment_id in srv.cache)) {
        get_mesh2(segment_id, color,  function(mesh) {
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

    function get_mesh2(segment_id,  color, callback ) {
      // Compute the mesh in the browser using marching cubes
      
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

    function generateGeoForSegment(segId, pixelToSegId) {

      function count_normals(voxelNormal,i, xOff, yOff, zOff, precision = 0) {

        var close = 10;
        var med = 7;
        var far = 6; 

        switch(precision) {
        case 2:
           // right down forward (+ + +)
          voxelNormal[(i + xOff + yOff + zOff)*3] += far; 
          voxelNormal[(i + xOff + yOff + zOff)*3+1] += far;
          voxelNormal[(i + xOff + yOff + zOff)*3+2] += far;
          // right down back (+ + -)
          voxelNormal[(i + xOff + yOff - zOff)*3] += far; 
          voxelNormal[(i + xOff + yOff - zOff)*3+1] += far;
          voxelNormal[(i + xOff + yOff - zOff)*3+2] -= far;
          // left down forward (- + +)
          voxelNormal[(i - xOff + yOff + zOff)*3] -= far; 
          voxelNormal[(i - xOff + yOff + zOff)*3+1] += far;
          voxelNormal[(i - xOff + yOff + zOff)*3+2] += far;
          // left down back (- + -)
          voxelNormal[(i - xOff + yOff - zOff)*3] -= far; 
          voxelNormal[(i - xOff + yOff - zOff)*3+1] += far;
          voxelNormal[(i - xOff + yOff - zOff)*3+2] -= far;
          // left up forward (- - +)
          voxelNormal[(i - xOff - yOff + zOff)*3] -= far; 
          voxelNormal[(i - xOff - yOff + zOff)*3+1] -= far;
          voxelNormal[(i - xOff - yOff + zOff)*3+2] += far;
          // left up back (- - -)
          voxelNormal[(i - xOff - yOff - zOff)*3] -= far; 
          voxelNormal[(i - xOff - yOff - zOff)*3+1] -= far;
          voxelNormal[(i - xOff - yOff - zOff)*3+2] -= far;
          // right up forward (+ - +)
          voxelNormal[(i + xOff - yOff + zOff)*3] += far; 
          voxelNormal[(i + xOff - yOff + zOff)*3+1] -= far;
          voxelNormal[(i + xOff - yOff + zOff)*3+2] += far;
          // right up back (+ - -)
          voxelNormal[(i + xOff - yOff - zOff)*3] += far; 
          voxelNormal[(i + xOff - yOff - zOff)*3+1] -= far;
          voxelNormal[(i + xOff - yOff - zOff)*3+2] -= far;
        case 1:
          // right down (+ +)
          voxelNormal[(i + xOff + yOff)*3] += med; 
          voxelNormal[(i + xOff + yOff)*3+1] += med;
          // left down (- +)
          voxelNormal[(i - xOff + yOff)*3] -= med; 
          voxelNormal[(i - xOff + yOff)*3+1] += med;
          // left up (- -)
          voxelNormal[(i - xOff - yOff)*3] -= med; 
          voxelNormal[(i - xOff - yOff)*3+1] -= med;
          // right up (+ -)
          voxelNormal[(i + xOff - yOff)*3] += med; 
          voxelNormal[(i + xOff - yOff)*3+1] -= med;

        case 0:
          voxelNormal[(i + xOff) * 3] += close;
          voxelNormal[(i - xOff) * 3] -= close;
          voxelNormal[(i + yOff) * 3 + 1] += close;
          voxelNormal[(i - yOff) * 3 + 1] -= close;
          voxelNormal[(i + zOff) * 3 + 2] += close;
          voxelNormal[(i - zOff) * 3 + 2] -= close;
          break;
        default:
            throw "unkown level of preicion"
        }
      };

      function count_neighboors() {
        var meshVertices = [];
        var meshNormals = [];
      
        var voxelNormal = new Int8Array(X_DIM * Y_DIM * Z_DIM * 3); // normal has x y and z component
        for ( var x= 0; x < X_DIM; ++x ) {
          for( var y=0; y < Y_DIM; ++y ) {
            for( var z=0; z < Z_DIM; ++ z) {

              var i = x + y * X_DIM + z * X_DIM * Y_DIM;
              if (pixelToSegId[i] !== segId) {
                continue
              }

              count_normals(voxelNormal,i, xOff, yOff, zOff, 0)

              var cubeIndex = 0;
              // An 8 bit index is formed where each bit corresponds to a vertex.
              if (pixelToSegId[i] === segId)                      { cubeIndex     |= 1; }   // 0
              if (pixelToSegId[i + xOff] === segId)               { cubeIndex     |= 2; }   // 1
              if (pixelToSegId[i + xOff + yOff] === segId)        { cubeIndex     |= 4; }   // 2
              if (pixelToSegId[i + yOff] === segId)               { cubeIndex     |= 8; }   // 3 
              if (pixelToSegId[i + zOff] === segId)               { cubeIndex     |= 16; }  // 4
              if (pixelToSegId[i + zOff + xOff] === segId)        { cubeIndex     |= 32; }  // 5
              if (pixelToSegId[i + zOff+ yOff + zOff ] === segId) { cubeIndex     |= 64; }  // 6
              if (pixelToSegId[i + yOff+ zOff] === segId)         { cubeIndex     |= 128; } // 7
      
              // Looking up the edge table returns a 12 bit number,
              // each bit corresponding to an edge, 0 if the edge isn't cut by the isosurface,
              // 1 if the edge is cut by the isosurface. If none of the edges are cut the table returns a 0,
              // this occurs when cubeindex is 0 (all vertices below the isosurface) or 0xff (all vertices above the isosurface).
              var indvTriCount = triCountTable[cubeIndex];
              if (indvTriCount === 0) {
                continue;
              }


              var vertBuffer = compute_vertex_position(x,y,z);
              var normBuffer = compute_normals(voxelNormal,i);

              cubeIndex <<= 4; // mult by 16 (triTable row width)
              var j = cubeIndex;

              for (var m = indvTriCount - 1; m >= 0; --m) {
                var vert1 = triTable[j] * 3;
                var vert2 = triTable[j + 1] * 3;
                var vert3 = triTable[j + 2] * 3;
                j+=3;

                meshVertices.push(vertBuffer[vert1] / (X_DIM));
                meshVertices.push(vertBuffer[vert1+1] / (Y_DIM));
                meshVertices.push(vertBuffer[vert1+2] / (Z_DIM));

                meshNormals.push(normBuffer[vert1]);
                meshNormals.push(normBuffer[vert1+1]);
                meshNormals.push(normBuffer[vert1+2]);


                meshVertices.push(vertBuffer[vert2] / (X_DIM));
                meshVertices.push(vertBuffer[vert2+1] / (Y_DIM));
                meshVertices.push(vertBuffer[vert2+2] / (Z_DIM));

                meshNormals.push(normBuffer[vert2]);
                meshNormals.push(normBuffer[vert2+1]);
                meshNormals.push(normBuffer[vert2+2]);


                meshVertices.push(vertBuffer[vert3] / (X_DIM));
                meshVertices.push(vertBuffer[vert3+1] / (Y_DIM));
                meshVertices.push(vertBuffer[vert3+2] / (Z_DIM));

                meshNormals.push(normBuffer[vert3]);
                meshNormals.push(normBuffer[vert3+1]);
                meshNormals.push(normBuffer[vert3+2]);
              }
            }
          }
        }

        return { meshNormals:meshNormals, meshVertices:meshVertices };
      }

      function compute_normals(normBuffer, voxelNormal,i) {
        var normBuffer = new Float32Array(12*3);

        var no = i*3;
        var n0x = voxelNormal[no]; 
        var n0y = voxelNormal[no+1]; 
        var n0z = voxelNormal[no+2];
        
        var n1x = voxelNormal[no+(xOff)*3]; var n1y = voxelNormal[no+(xOff)*3+1]; var n1z = voxelNormal[no+(xOff)*3+2];
        var n2x = voxelNormal[no+(zOff+xOff)*3]; var n2y = voxelNormal[no+(zOff+xOff)*3+1]; var n2z = voxelNormal[no+(zOff+xOff)*3+2];
        var n3x = voxelNormal[no+(zOff)*3]; var n3y = voxelNormal[no+(zOff)*3+1]; var n3z = voxelNormal[no+(zOff)*3+2];
        var n4x = voxelNormal[no+(yOff)*3]; var n4y = voxelNormal[no+(yOff)*3+1]; var n4z = voxelNormal[no+(yOff)*3+2];
        var n5x = voxelNormal[no+(yOff+xOff)*3]; var n5y = voxelNormal[no+(yOff+xOff)*3+1]; var n5z = voxelNormal[no+(yOff+xOff)*3+2];
        var n6x = voxelNormal[no+(zOff+yOff+xOff)*3]; var n6y = voxelNormal[no+(zOff+yOff+xOff)*3+1]; var n6z = voxelNormal[no+(zOff+yOff+xOff)*3+2];
        var n7x = voxelNormal[no+(zOff+yOff)*3]; var n7y = voxelNormal[no+(zOff+yOff)*3+1]; var n7z = voxelNormal[no+(zOff+yOff)*3+2];

        // 0 and 1
        normBuffer[0] = n0x + n1x;
        normBuffer[1] = n0y + n1y;
        normBuffer[2] = n0z + n1z;
        // 1 and 2
        normBuffer[3] = n1x + n2x;
        normBuffer[4] = n1y + n2y;
        normBuffer[5] = n1z + n2z;
        // 2 and 3
        normBuffer[6] = n2x + n3x;
        normBuffer[7] = n2y + n3y;
        normBuffer[8] = n2z + n3z;
        // 3 and 0
        normBuffer[9] = n0x + n3x;
        normBuffer[10] = n0y + n3y;
        normBuffer[11] = n0z + n3z;
        // 4 and 5
        normBuffer[12] = n4x + n5x;
        normBuffer[13] = n4y + n5y;
        normBuffer[14] = n4z + n5z;
        // 5 and 6
        normBuffer[15] = n5x + n6x;
        normBuffer[16] = n5y + n6y;
        normBuffer[17] = n5z + n6z;
        // 6 and 7
        normBuffer[18] = n6x + n7x;
        normBuffer[19] = n6y + n7y;
        normBuffer[20] = n6z + n7z;
        // 7 and 4
        normBuffer[21] = n4x + n7x;
        normBuffer[22] = n4y + n7y;
        normBuffer[23] = n4z + n7z;
        // 0 and 4
        normBuffer[24] = n0x + n4x;
        normBuffer[25] = n0y + n4y;
        normBuffer[26] = n0z + n4z;
        // 1 and 5
        normBuffer[27] = n1x + n5x;
        normBuffer[28] = n1y + n5y;
        normBuffer[29] = n1z + n5z;
        // 2 and 6
        normBuffer[30] = n2x + n6x;
        normBuffer[31] = n2y + n6y;
        normBuffer[32] = n2z + n6z;
        // 3 and 7
        normBuffer[33] = n3x + n7x;
        normBuffer[34] = n3y + n7y;
        normBuffer[35] = n3z + n7z;

        return normBuffer;
      }

      function compute_vertex_position(x,y,z) {
        var vertBuffer = new Float32Array(12*3);

        // 0 and 1
        vertBuffer[0] = x + 0.5;
        vertBuffer[1] = y;
        vertBuffer[2] = z;
        // 1 and 2
        vertBuffer[3] = x + 1;
        vertBuffer[4] = y;
        vertBuffer[5] = z + 0.5;
        // 2 and 3
        vertBuffer[6] = x + 0.5;
        vertBuffer[7] = y;
        vertBuffer[8] = z + 1;
        // 3 and 0
        vertBuffer[9]  = x;
        vertBuffer[10] = y;
        vertBuffer[11] = z + 0.5;
        // 4 and 5
        vertBuffer[12] = x + 0.5;
        vertBuffer[13] = y + 1;
        vertBuffer[14] = z;
        // 5 and 6
        vertBuffer[15] = x + 1;
        vertBuffer[16] = y + 1;
        vertBuffer[17] = z + 0.5;
        // 6 and 7
        vertBuffer[18] = x + 0.5;
        vertBuffer[19] = y + 1;
        vertBuffer[20] = z + 1;
        // 7 and 4
        vertBuffer[21] = x;
        vertBuffer[22] = y + 1;
        vertBuffer[23] = z + 0.5;
        // 0 and 4
        vertBuffer[24] = x;
        vertBuffer[25] = y + 0.5;
        vertBuffer[26] = z;
        // 1 and 5
        vertBuffer[27] = x + 1;
        vertBuffer[28] = y + 0.5;
        vertBuffer[29] = z;
        // 2 and 6
        vertBuffer[30] = x + 1;
        vertBuffer[31] = y + 0.5;
        vertBuffer[32] = z + 1;
        // 3 and 7
        vertBuffer[33] = x;
        vertBuffer[34] = y + 0.5;
        vertBuffer[35] = z + 1;

        return vertBuffer;
      }

      console.log('from mesher segment_id=' + segId);
      var X_DIM = globals.CUBE_SIZE.x;
      var Y_DIM = globals.CUBE_SIZE.y;
      var Z_DIM = globals.CUBE_SIZE.z;
      var xOff = 1;
      var yOff = X_DIM;
      var zOff = X_DIM * Y_DIM;


      var start = window.performance.now();
      var partCount = 0;

   
  
      if (segId === 0) {
        //TODO return nothing
      }

      var count = count_neighboors();
      if (count === undefined ) {
        return undefined;
      }
  
      var segGeo = new THREE.BufferGeometry();
      var meshVertices = new Float32Array(count.meshVertices);
      var meshNormals = new Float32Array(count.meshNormals);

      segGeo.addAttribute('position', new THREE.BufferAttribute(meshVertices, 3));
      segGeo.addAttribute('normal', new THREE.BufferAttribute(meshNormals, 3));

      segGeo.normalizeNormals();

      var end = window.performance.now();

      console.log('time', end - start);
      console.log('triCount', count.meshVertices.length);

      return segGeo;
    }
  /////////////////////////////////////
  // Marching cubes lookup tables
  /////////////////////////////////////

  var triCountTable = new Uint8Array([
    0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 2, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4,
    3, 4, 4, 3, 2, 3, 3, 2, 3, 4, 4, 3, 3, 4, 4, 3, 4, 5, 5, 2, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 2, 3, 3, 4, 3, 4, 4, 5,
    3, 4, 4, 5, 4, 5, 5, 4, 2, 3, 3, 4, 3, 4, 2, 3, 3, 4, 4, 5, 4, 5, 3, 2, 3, 4, 4, 3, 4, 5, 3, 2, 4, 5, 5, 4, 5, 2, 4, 1, 1, 2, 2, 3,
    2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 3, 2, 3, 3, 4, 3, 4, 4, 5, 3, 2, 4, 3, 4, 3, 5, 2, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 4,
    3, 4, 4, 3, 4, 5, 5, 4, 4, 3, 5, 2, 5, 4, 2, 1, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 2, 3, 3, 2, 3, 4, 4, 5, 4, 5, 5, 2, 4, 3, 5, 4,
    3, 2, 4, 1, 3, 4, 4, 5, 4, 5, 3, 4, 4, 5, 5, 2, 3, 4, 2, 1, 2, 3, 3, 2, 3, 4, 2, 1, 3, 2, 4, 1, 2, 1, 1, 0]);

  var triTable = new Uint32Array([
  - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 8, 3, 9, 8, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 2, 10, 0, 2, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 8, 3, 2, 10, 8, 10, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 11, 2, 8, 11, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 9, 0, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 11, 2, 1, 9, 11, 9, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 10, 1, 11, 10, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 10, 1, 0, 8, 10, 8, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 9, 0, 3, 11, 9, 11, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 3, 0, 7, 3, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 1, 9, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 1, 9, 4, 7, 1, 7, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 4, 7, 3, 0, 4, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 2, 10, 9, 0, 2, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
  8, 4, 7, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 4, 7, 11, 2, 4, 2, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 0, 1, 8, 4, 7, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, - 1, - 1, - 1, - 1,
  3, 10, 1, 3, 11, 10, 7, 8, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, - 1, - 1, - 1, - 1,
  4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
  4, 7, 11, 4, 11, 9, 9, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 5, 4, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 5, 4, 1, 5, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 5, 4, 8, 3, 5, 3, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 0, 8, 1, 2, 10, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 2, 10, 5, 4, 2, 4, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, - 1, - 1, - 1, - 1,
  9, 5, 4, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 11, 2, 0, 8, 11, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 5, 4, 0, 1, 5, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, - 1, - 1, - 1, - 1,
  10, 3, 11, 10, 1, 3, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, - 1, - 1, - 1, - 1,
  5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
  5, 4, 8, 5, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 7, 8, 5, 7, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 3, 0, 9, 5, 3, 5, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 7, 8, 0, 1, 7, 1, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 7, 8, 9, 5, 7, 10, 1, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, - 1, - 1, - 1, - 1,
  8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, - 1, - 1, - 1, - 1,
  2, 10, 5, 2, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 9, 5, 7, 8, 9, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
  2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, - 1, - 1, - 1, - 1,
  11, 2, 1, 11, 1, 7, 7, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, - 1, - 1, - 1, - 1,
  5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, - 1,
  11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, - 1,
  11, 10, 5, 7, 11, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 0, 1, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 8, 3, 1, 9, 8, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 6, 5, 2, 6, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 6, 5, 1, 2, 6, 3, 0, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 6, 5, 9, 0, 6, 0, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, - 1, - 1, - 1, - 1,
  2, 3, 11, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 0, 8, 11, 2, 0, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 1, 9, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, - 1, - 1, - 1, - 1,
  6, 3, 11, 6, 5, 3, 5, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
  3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, - 1, - 1, - 1, - 1,
  6, 5, 9, 6, 9, 11, 11, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 10, 6, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 3, 0, 4, 7, 3, 6, 5, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 9, 0, 5, 10, 6, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
  6, 1, 2, 6, 5, 1, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, - 1, - 1, - 1, - 1,
  8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, - 1, - 1, - 1, - 1,
  7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, - 1,
  3, 11, 2, 7, 8, 4, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
  0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1,
  9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, - 1,
  8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
  5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, - 1,
  0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, - 1,
  6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, - 1, - 1, - 1, - 1,
  10, 4, 9, 6, 4, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 10, 6, 4, 9, 10, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 0, 1, 10, 6, 0, 6, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
  1, 4, 9, 1, 2, 4, 2, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, - 1, - 1, - 1, - 1,
  0, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 3, 2, 8, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 4, 9, 10, 6, 4, 11, 2, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, - 1, - 1, - 1, - 1,
  3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
  6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, - 1,
  9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, - 1, - 1, - 1, - 1,
  8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, - 1,
  3, 11, 6, 3, 6, 0, 0, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  6, 4, 8, 11, 6, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 10, 6, 7, 8, 10, 8, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, - 1, - 1, - 1, - 1,
  10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, - 1, - 1, - 1, - 1,
  10, 6, 7, 10, 7, 1, 1, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
  2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, - 1,
  7, 8, 0, 7, 0, 6, 6, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 3, 2, 6, 7, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
  2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, - 1,
  1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, - 1,
  11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, - 1, - 1, - 1, - 1,
  8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, - 1,
  0, 9, 1, 11, 6, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, - 1, - 1, - 1, - 1,
  7, 11, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 0, 8, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 1, 9, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 1, 9, 8, 3, 1, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 1, 2, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, 3, 0, 8, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 9, 0, 2, 10, 9, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, - 1, - 1, - 1, - 1,
  7, 2, 3, 6, 2, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  7, 0, 8, 7, 6, 0, 6, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 7, 6, 2, 3, 7, 0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, - 1, - 1, - 1, - 1,
  10, 7, 6, 10, 1, 7, 1, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, - 1, - 1, - 1, - 1,
  0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, - 1, - 1, - 1, - 1,
  7, 6, 10, 7, 10, 8, 8, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  6, 8, 4, 11, 8, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 6, 11, 3, 0, 6, 0, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 6, 11, 8, 4, 6, 9, 0, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, - 1, - 1, - 1, - 1,
  6, 8, 4, 6, 11, 8, 2, 10, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, - 1, - 1, - 1, - 1,
  4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, - 1, - 1, - 1, - 1,
  10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, - 1,
  8, 2, 3, 8, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, - 1, - 1, - 1, - 1,
  1, 9, 4, 1, 4, 2, 2, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, - 1, - 1, - 1, - 1,
  10, 1, 0, 10, 0, 6, 6, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, - 1,
  10, 9, 4, 6, 10, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 9, 5, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, 4, 9, 5, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 0, 1, 5, 4, 0, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, - 1, - 1, - 1, - 1,
  9, 5, 4, 10, 1, 2, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, - 1, - 1, - 1, - 1,
  7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, - 1, - 1, - 1, - 1,
  3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, - 1,
  7, 2, 3, 7, 6, 2, 5, 4, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, - 1, - 1, - 1, - 1,
  3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, - 1, - 1, - 1, - 1,
  6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, - 1,
  9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, - 1, - 1, - 1, - 1,
  1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, - 1,
  4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, - 1,
  7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, - 1, - 1, - 1, - 1,
  6, 9, 5, 6, 11, 9, 11, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, - 1, - 1, - 1, - 1,
  0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, - 1, - 1, - 1, - 1,
  6, 11, 3, 6, 3, 5, 5, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, - 1, - 1, - 1, - 1,
  0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, - 1,
  11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, - 1,
  6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, - 1, - 1, - 1, - 1,
  5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, - 1, - 1, - 1, - 1,
  9, 5, 6, 9, 6, 0, 0, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, - 1,
  1, 5, 6, 2, 1, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, - 1,
  10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, - 1, - 1, - 1, - 1,
  0, 3, 8, 5, 6, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 5, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 5, 10, 7, 5, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 5, 10, 11, 7, 5, 8, 3, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 11, 7, 5, 10, 11, 1, 9, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, - 1, - 1, - 1, - 1,
  11, 1, 2, 11, 7, 1, 7, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, - 1, - 1, - 1, - 1,
  9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, - 1, - 1, - 1, - 1,
  7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, - 1,
  2, 5, 10, 2, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, - 1, - 1, - 1, - 1,
  9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, - 1, - 1, - 1, - 1,
  9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, - 1,
  1, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 7, 0, 7, 1, 1, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 0, 3, 9, 3, 5, 5, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 8, 7, 5, 9, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 8, 4, 5, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, - 1, - 1, - 1, - 1,
  0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, - 1, - 1, - 1, - 1,
  10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, - 1,
  2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, - 1, - 1, - 1, - 1,
  0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, - 1,
  0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, - 1,
  9, 4, 5, 2, 11, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, - 1, - 1, - 1, - 1,
  5, 10, 2, 5, 2, 4, 4, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, - 1,
  5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, - 1, - 1, - 1, - 1,
  8, 4, 5, 8, 5, 3, 3, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 4, 5, 1, 0, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, - 1, - 1, - 1, - 1,
  9, 4, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 11, 7, 4, 9, 11, 9, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, - 1, - 1, - 1, - 1,
  1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, - 1, - 1, - 1, - 1,
  3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, - 1,
  4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, - 1, - 1, - 1, - 1,
  9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, - 1,
  11, 7, 4, 11, 4, 2, 2, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, - 1, - 1, - 1, - 1,
  2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, - 1, - 1, - 1, - 1,
  9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, - 1,
  3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, - 1,
  1, 10, 2, 8, 7, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 9, 1, 4, 1, 7, 7, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, - 1, - 1, - 1, - 1,
  4, 0, 3, 7, 4, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  4, 8, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 0, 9, 3, 9, 11, 11, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 1, 10, 0, 10, 8, 8, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 1, 10, 11, 3, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 2, 11, 1, 11, 9, 9, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, - 1, - 1, - 1, - 1,
  0, 2, 11, 8, 0, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  3, 2, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 3, 8, 2, 8, 10, 10, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  9, 10, 2, 0, 9, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, - 1, - 1, - 1, - 1,
  1, 10, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  1, 3, 8, 9, 1, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 9, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  0, 3, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
  - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1 ] );


  // debugging
  // function drawNormal(x1, y1, z1, x2, y2, z2) {
  //   var material = new THREE.LineBasicMaterial({
  //     color: 0xffff00
  //   });

  //   var vertPos = new THREE.Vector3( x1, y1, z1 );


  //   var normal = new THREE.Vector3(x2, y2, z2);

  //     // console.log('normal', new THREE.Vector3(x1 * 256 - 0.5, y1 * 256 - 0.5, z1 * 256 - 0.5), normal);

  //   normal.setLength(2/256);


  //   var geometry = new THREE.Geometry();
  //   geometry.vertices.push(
  //     vertPos,
  //     normal.add(vertPos)
  //   );

  //   var line = new THREE.Line(geometry, material);

  //   cubeContents.add(line);
  // }


    return srv;

  });
