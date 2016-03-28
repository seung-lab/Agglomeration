// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  Module['arguments'] = process['argv'].slice(2);

  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (vararg) return 8;
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_ && type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    code = Pointer_stringify(code);
    if (code[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (code.indexOf('"', 1) === code.length-1) {
        code = code.substr(1, code.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + code + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    return Runtime.asmConstCache[code] = eval('(function(' + args.join(',') + '){ ' + code + ' })'); // new Function does not allow upvars in node
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;

// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++; // ignore const
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        if (func[i] === 'C') { // constructor
          parts.push(parts[parts.length-1]);
          i += 2;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    var first = true;
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] === 'N') {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      } else {
        // not namespaced
        if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      }
      first = false;
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 234217728;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 4096;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be more reasonable');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 37767056;


/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });

























/* memory initializer */ allocate([116,111,116,97,108,44,32,116,105,109,101,32,61,32,37,102,109,115,44,32,116,114,105,115,32,61,32,37,100,10,0,0,116,114,105,97,110,103,117,108,97,116,101,44,32,116,105,109,101,32,61,32,37,102,109,115,10,0,0,0,0,0,0,0,97,108,108,111,99,97,116,101,32,109,101,115,104,32,109,101,109,111,114,121,44,32,116,105,109,101,32,61,32,37,102,109,115,10,0,0,0,0,0,0,109,97,114,99,104,44,32,116,105,109,101,32,61,32,37,102,109,115,10,0,0,0,0,0,109,101,109,115,101,116,44,32,116,105,109,101,32,61,32,37,102,109,115,10,0,0,0,0,109,97,114,99,104,105,110,103,95,99,117,98,101,115,40,37,100,41,10,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,8,0,0,0,3,0,0,0,9,0,0,0,8,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,2,0,0,0,10,0,0,0,0,0,0,0,2,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,8,0,0,0,3,0,0,0,2,0,0,0,10,0,0,0,8,0,0,0,10,0,0,0,9,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,11,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,11,0,0,0,2,0,0,0,8,0,0,0,11,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,9,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,11,0,0,0,2,0,0,0,1,0,0,0,9,0,0,0,11,0,0,0,9,0,0,0,8,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,10,0,0,0,1,0,0,0,11,0,0,0,10,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,10,0,0,0,1,0,0,0,0,0,0,0,8,0,0,0,10,0,0,0,8,0,0,0,11,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,9,0,0,0,0,0,0,0,3,0,0,0,11,0,0,0,9,0,0,0,11,0,0,0,10,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,8,0,0,0,10,0,0,0,10,0,0,0,8,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,7,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,3,0,0,0,0,0,0,0,7,0,0,0,3,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,1,0,0,0,9,0,0,0,4,0,0,0,7,0,0,0,1,0,0,0,7,0,0,0,3,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,4,0,0,0,7,0,0,0,3,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,2,0,0,0,10,0,0,0,9,0,0,0,0,0,0,0,2,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,10,0,0,0,9,0,0,0,2,0,0,0,9,0,0,0,7,0,0,0,2,0,0,0,7,0,0,0,3,0,0,0,7,0,0,0,9,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,4,0,0,0,7,0,0,0,3,0,0,0,11,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,4,0,0,0,7,0,0,0,11,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,0,0,0,0,1,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,7,0,0,0,11,0,0,0,9,0,0,0,4,0,0,0,11,0,0,0,9,0,0,0,11,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,10,0,0,0,1,0,0,0,3,0,0,0,11,0,0,0,10,0,0,0,7,0,0,0,8,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,11,0,0,0,10,0,0,0,1,0,0,0,4,0,0,0,11,0,0,0,1,0,0,0,0,0,0,0,4,0,0,0,7,0,0,0,11,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,0,0,0,0,11,0,0,0,9,0,0,0,11,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,7,0,0,0,11,0,0,0,4,0,0,0,11,0,0,0,9,0,0,0,9,0,0,0,11,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,8,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,5,0,0,0,4,0,0,0,1,0,0,0,5,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,5,0,0,0,4,0,0,0,8,0,0,0,3,0,0,0,5,0,0,0,3,0,0,0,1,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,9,0,0,0,5,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,0,0,0,0,8,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,4,0,0,0,9,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,2,0,0,0,10,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,10,0,0,0,5,0,0,0,3,0,0,0,2,0,0,0,5,0,0,0,3,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,11,0,0,0,2,0,0,0,0,0,0,0,8,0,0,0,11,0,0,0,4,0,0,0,9,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,1,0,0,0,5,0,0,0,2,0,0,0,5,0,0,0,8,0,0,0,2,0,0,0,8,0,0,0,11,0,0,0,4,0,0,0,8,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,3,0,0,0,11,0,0,0,10,0,0,0,1,0,0,0,3,0,0,0,9,0,0,0,5,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,9,0,0,0,5,0,0,0,0,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,10,0,0,0,1,0,0,0,8,0,0,0,11,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,4,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,11,0,0,0,5,0,0,0,11,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,4,0,0,0,8,0,0,0,5,0,0,0,8,0,0,0,10,0,0,0,10,0,0,0,8,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,7,0,0,0,8,0,0,0,5,0,0,0,7,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,3,0,0,0,0,0,0,0,9,0,0,0,5,0,0,0,3,0,0,0,5,0,0,0,7,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,7,0,0,0,8,0,0,0,0,0,0,0,1,0,0,0,7,0,0,0,1,0,0,0,5,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,5,0,0,0,3,0,0,0,3,0,0,0,5,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,5,0,0,0,7,0,0,0,10,0,0,0,1,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,1,0,0,0,2,0,0,0,9,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,3,0,0,0,0,0,0,0,5,0,0,0,7,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,0,0,0,0,2,0,0,0,8,0,0,0,2,0,0,0,5,0,0,0,8,0,0,0,5,0,0,0,7,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,5,0,0,0,3,0,0,0,3,0,0,0,5,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,9,0,0,0,5,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,3,0,0,0,11,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,7,0,0,0,9,0,0,0,7,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,7,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,3,0,0,0,11,0,0,0,0,0,0,0,1,0,0,0,8,0,0,0,1,0,0,0,7,0,0,0,8,0,0,0,1,0,0,0,5,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,2,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,7,0,0,0,7,0,0,0,1,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,8,0,0,0,8,0,0,0,5,0,0,0,7,0,0,0,10,0,0,0,1,0,0,0,3,0,0,0,10,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,7,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,9,0,0,0,7,0,0,0,11,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,10,0,0,0,11,0,0,0,10,0,0,0,0,0,0,0,255,255,255,255,11,0,0,0,10,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,3,0,0,0,10,0,0,0,5,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,7,0,0,0,5,0,0,0,7,0,0,0,0,0,0,0,255,255,255,255,11,0,0,0,10,0,0,0,5,0,0,0,7,0,0,0,11,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,6,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,8,0,0,0,3,0,0,0,1,0,0,0,9,0,0,0,8,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,6,0,0,0,5,0,0,0,2,0,0,0,6,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,6,0,0,0,5,0,0,0,1,0,0,0,2,0,0,0,6,0,0,0,3,0,0,0,0,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,6,0,0,0,5,0,0,0,9,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,9,0,0,0,8,0,0,0,5,0,0,0,8,0,0,0,2,0,0,0,5,0,0,0,2,0,0,0,6,0,0,0,3,0,0,0,2,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,3,0,0,0,11,0,0,0,10,0,0,0,6,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,0,0,0,0,8,0,0,0,11,0,0,0,2,0,0,0,0,0,0,0,10,0,0,0,6,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,10,0,0,0,6,0,0,0,1,0,0,0,9,0,0,0,2,0,0,0,9,0,0,0,11,0,0,0,2,0,0,0,9,0,0,0,8,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,3,0,0,0,11,0,0,0,6,0,0,0,5,0,0,0,3,0,0,0,5,0,0,0,1,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,11,0,0,0,0,0,0,0,11,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,1,0,0,0,5,0,0,0,11,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,11,0,0,0,6,0,0,0,0,0,0,0,3,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,5,0,0,0,9,0,0,0,6,0,0,0,9,0,0,0,11,0,0,0,11,0,0,0,9,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,10,0,0,0,6,0,0,0,4,0,0,0,7,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,3,0,0,0,0,0,0,0,4,0,0,0,7,0,0,0,3,0,0,0,6,0,0,0,5,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,9,0,0,0,0,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,6,0,0,0,5,0,0,0,1,0,0,0,9,0,0,0,7,0,0,0,1,0,0,0,7,0,0,0,3,0,0,0,7,0,0,0,9,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,1,0,0,0,2,0,0,0,6,0,0,0,5,0,0,0,1,0,0,0,4,0,0,0,7,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,5,0,0,0,5,0,0,0,2,0,0,0,6,0,0,0,3,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,4,0,0,0,7,0,0,0,9,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,6,0,0,0,5,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,3,0,0,0,9,0,0,0,7,0,0,0,9,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,9,0,0,0,5,0,0,0,9,0,0,0,6,0,0,0,2,0,0,0,6,0,0,0,9,0,0,0,255,255,255,255,3,0,0,0,11,0,0,0,2,0,0,0,7,0,0,0,8,0,0,0,4,0,0,0,10,0,0,0,6,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,10,0,0,0,6,0,0,0,4,0,0,0,7,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,7,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,4,0,0,0,7,0,0,0,8,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,2,0,0,0,1,0,0,0,9,0,0,0,11,0,0,0,2,0,0,0,9,0,0,0,4,0,0,0,11,0,0,0,7,0,0,0,11,0,0,0,4,0,0,0,5,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,8,0,0,0,4,0,0,0,7,0,0,0,3,0,0,0,11,0,0,0,5,0,0,0,3,0,0,0,5,0,0,0,1,0,0,0,5,0,0,0,11,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,1,0,0,0,11,0,0,0,5,0,0,0,11,0,0,0,6,0,0,0,1,0,0,0,0,0,0,0,11,0,0,0,7,0,0,0,11,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,11,0,0,0,255,255,255,255,0,0,0,0,5,0,0,0,9,0,0,0,0,0,0,0,6,0,0,0,5,0,0,0,0,0,0,0,3,0,0,0,6,0,0,0,11,0,0,0,6,0,0,0,3,0,0,0,8,0,0,0,4,0,0,0,7,0,0,0,255,255,255,255,6,0,0,0,5,0,0,0,9,0,0,0,6,0,0,0,9,0,0,0,11,0,0,0,4,0,0,0,7,0,0,0,9,0,0,0,7,0,0,0,11,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,4,0,0,0,9,0,0,0,6,0,0,0,4,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,10,0,0,0,6,0,0,0,4,0,0,0,9,0,0,0,10,0,0,0,0,0,0,0,8,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,0,0,0,0,1,0,0,0,10,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,4,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,3,0,0,0,1,0,0,0,8,0,0,0,1,0,0,0,6,0,0,0,8,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,1,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,4,0,0,0,9,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,0,0,0,0,8,0,0,0,1,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,4,0,0,0,9,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,2,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,3,0,0,0,2,0,0,0,8,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,2,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,4,0,0,0,9,0,0,0,10,0,0,0,6,0,0,0,4,0,0,0,11,0,0,0,2,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,2,0,0,0,2,0,0,0,8,0,0,0,11,0,0,0,4,0,0,0,9,0,0,0,10,0,0,0,4,0,0,0,10,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,11,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,1,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,4,0,0,0,1,0,0,0,6,0,0,0,1,0,0,0,10,0,0,0,4,0,0,0,8,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,11,0,0,0,8,0,0,0,11,0,0,0,1,0,0,0,255,255,255,255,9,0,0,0,6,0,0,0,4,0,0,0,9,0,0,0,3,0,0,0,6,0,0,0,9,0,0,0,1,0,0,0,3,0,0,0,11,0,0,0,6,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,11,0,0,0,1,0,0,0,8,0,0,0,1,0,0,0,0,0,0,0,11,0,0,0,6,0,0,0,1,0,0,0,9,0,0,0,1,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,1,0,0,0,255,255,255,255,3,0,0,0,11,0,0,0,6,0,0,0,3,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,4,0,0,0,8,0,0,0,11,0,0,0,6,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,10,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,10,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,7,0,0,0,3,0,0,0,0,0,0,0,10,0,0,0,7,0,0,0,0,0,0,0,9,0,0,0,10,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,6,0,0,0,7,0,0,0,1,0,0,0,10,0,0,0,7,0,0,0,1,0,0,0,7,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,7,0,0,0,1,0,0,0,1,0,0,0,7,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,6,0,0,0,1,0,0,0,6,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,9,0,0,0,8,0,0,0,6,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,6,0,0,0,9,0,0,0,2,0,0,0,9,0,0,0,1,0,0,0,6,0,0,0,7,0,0,0,9,0,0,0,0,0,0,0,9,0,0,0,3,0,0,0,7,0,0,0,3,0,0,0,9,0,0,0,255,255,255,255,7,0,0,0,8,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,6,0,0,0,6,0,0,0,0,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,3,0,0,0,2,0,0,0,6,0,0,0,7,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,3,0,0,0,11,0,0,0,10,0,0,0,6,0,0,0,8,0,0,0,10,0,0,0,8,0,0,0,9,0,0,0,8,0,0,0,6,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,0,0,0,0,7,0,0,0,2,0,0,0,7,0,0,0,11,0,0,0,0,0,0,0,9,0,0,0,7,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,9,0,0,0,10,0,0,0,7,0,0,0,255,255,255,255,1,0,0,0,8,0,0,0,0,0,0,0,1,0,0,0,7,0,0,0,8,0,0,0,1,0,0,0,10,0,0,0,7,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,2,0,0,0,3,0,0,0,11,0,0,0,255,255,255,255,11,0,0,0,2,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,7,0,0,0,10,0,0,0,6,0,0,0,1,0,0,0,6,0,0,0,7,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,9,0,0,0,6,0,0,0,8,0,0,0,6,0,0,0,7,0,0,0,9,0,0,0,1,0,0,0,6,0,0,0,11,0,0,0,6,0,0,0,3,0,0,0,1,0,0,0,3,0,0,0,6,0,0,0,255,255,255,255,0,0,0,0,9,0,0,0,1,0,0,0,11,0,0,0,6,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,8,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,6,0,0,0,3,0,0,0,11,0,0,0,0,0,0,0,11,0,0,0,6,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,11,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,6,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,0,0,0,0,8,0,0,0,11,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,11,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,1,0,0,0,9,0,0,0,8,0,0,0,3,0,0,0,1,0,0,0,11,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,1,0,0,0,2,0,0,0,6,0,0,0,11,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,3,0,0,0,0,0,0,0,8,0,0,0,6,0,0,0,11,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,9,0,0,0,0,0,0,0,2,0,0,0,10,0,0,0,9,0,0,0,6,0,0,0,11,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,11,0,0,0,7,0,0,0,2,0,0,0,10,0,0,0,3,0,0,0,10,0,0,0,8,0,0,0,3,0,0,0,10,0,0,0,9,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,2,0,0,0,3,0,0,0,6,0,0,0,2,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,0,0,0,0,8,0,0,0,7,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,7,0,0,0,6,0,0,0,2,0,0,0,3,0,0,0,7,0,0,0,0,0,0,0,1,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,6,0,0,0,2,0,0,0,1,0,0,0,8,0,0,0,6,0,0,0,1,0,0,0,9,0,0,0,8,0,0,0,8,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,7,0,0,0,6,0,0,0,10,0,0,0,1,0,0,0,7,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,7,0,0,0,6,0,0,0,1,0,0,0,7,0,0,0,10,0,0,0,1,0,0,0,8,0,0,0,7,0,0,0,1,0,0,0,0,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,3,0,0,0,7,0,0,0,0,0,0,0,7,0,0,0,10,0,0,0,0,0,0,0,10,0,0,0,9,0,0,0,6,0,0,0,10,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,6,0,0,0,10,0,0,0,7,0,0,0,10,0,0,0,8,0,0,0,8,0,0,0,10,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,8,0,0,0,4,0,0,0,11,0,0,0,8,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,6,0,0,0,11,0,0,0,3,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,6,0,0,0,11,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,9,0,0,0,0,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,4,0,0,0,6,0,0,0,9,0,0,0,6,0,0,0,3,0,0,0,9,0,0,0,3,0,0,0,1,0,0,0,11,0,0,0,3,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,11,0,0,0,8,0,0,0,2,0,0,0,10,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,3,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,6,0,0,0,11,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,11,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,11,0,0,0,0,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,10,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,9,0,0,0,3,0,0,0,10,0,0,0,3,0,0,0,2,0,0,0,9,0,0,0,4,0,0,0,3,0,0,0,11,0,0,0,3,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,3,0,0,0,255,255,255,255,8,0,0,0,2,0,0,0,3,0,0,0,8,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,9,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,3,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,9,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,2,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,1,0,0,0,3,0,0,0,8,0,0,0,6,0,0,0,1,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,6,0,0,0,10,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,1,0,0,0,0,0,0,0,10], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([6,0,0,0,6,0,0,0,0,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,6,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,8,0,0,0,6,0,0,0,10,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,9,0,0,0,10,0,0,0,9,0,0,0,3,0,0,0,255,255,255,255,10,0,0,0,9,0,0,0,4,0,0,0,6,0,0,0,10,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,9,0,0,0,5,0,0,0,7,0,0,0,6,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,4,0,0,0,9,0,0,0,5,0,0,0,11,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,7,0,0,0,6,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,7,0,0,0,6,0,0,0,8,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,1,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,10,0,0,0,1,0,0,0,2,0,0,0,7,0,0,0,6,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,11,0,0,0,7,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,0,0,0,0,8,0,0,0,3,0,0,0,4,0,0,0,9,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,6,0,0,0,11,0,0,0,5,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,2,0,0,0,10,0,0,0,4,0,0,0,0,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,4,0,0,0,8,0,0,0,3,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,5,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,11,0,0,0,7,0,0,0,6,0,0,0,255,255,255,255,7,0,0,0,2,0,0,0,3,0,0,0,7,0,0,0,6,0,0,0,2,0,0,0,5,0,0,0,4,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,8,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,6,0,0,0,8,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,6,0,0,0,2,0,0,0,3,0,0,0,7,0,0,0,6,0,0,0,1,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,2,0,0,0,8,0,0,0,6,0,0,0,8,0,0,0,7,0,0,0,2,0,0,0,1,0,0,0,8,0,0,0,4,0,0,0,8,0,0,0,5,0,0,0,1,0,0,0,5,0,0,0,8,0,0,0,255,255,255,255,9,0,0,0,5,0,0,0,4,0,0,0,10,0,0,0,1,0,0,0,6,0,0,0,1,0,0,0,7,0,0,0,6,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,6,0,0,0,10,0,0,0,1,0,0,0,7,0,0,0,6,0,0,0,1,0,0,0,0,0,0,0,7,0,0,0,8,0,0,0,7,0,0,0,0,0,0,0,9,0,0,0,5,0,0,0,4,0,0,0,255,255,255,255,4,0,0,0,0,0,0,0,10,0,0,0,4,0,0,0,10,0,0,0,5,0,0,0,0,0,0,0,3,0,0,0,10,0,0,0,6,0,0,0,10,0,0,0,7,0,0,0,3,0,0,0,7,0,0,0,10,0,0,0,255,255,255,255,7,0,0,0,6,0,0,0,10,0,0,0,7,0,0,0,10,0,0,0,8,0,0,0,5,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,8,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,9,0,0,0,5,0,0,0,6,0,0,0,11,0,0,0,9,0,0,0,11,0,0,0,8,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,6,0,0,0,11,0,0,0,0,0,0,0,6,0,0,0,3,0,0,0,0,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,9,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,11,0,0,0,8,0,0,0,0,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,6,0,0,0,11,0,0,0,3,0,0,0,6,0,0,0,3,0,0,0,5,0,0,0,5,0,0,0,3,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,10,0,0,0,9,0,0,0,5,0,0,0,11,0,0,0,9,0,0,0,11,0,0,0,8,0,0,0,11,0,0,0,5,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,11,0,0,0,3,0,0,0,0,0,0,0,6,0,0,0,11,0,0,0,0,0,0,0,9,0,0,0,6,0,0,0,5,0,0,0,6,0,0,0,9,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,255,255,255,255,11,0,0,0,8,0,0,0,5,0,0,0,11,0,0,0,5,0,0,0,6,0,0,0,8,0,0,0,0,0,0,0,5,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,5,0,0,0,255,255,255,255,6,0,0,0,11,0,0,0,3,0,0,0,6,0,0,0,3,0,0,0,5,0,0,0,2,0,0,0,10,0,0,0,3,0,0,0,10,0,0,0,5,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,8,0,0,0,9,0,0,0,5,0,0,0,2,0,0,0,8,0,0,0,5,0,0,0,6,0,0,0,2,0,0,0,3,0,0,0,8,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,5,0,0,0,6,0,0,0,9,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,5,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,0,0,0,0,5,0,0,0,6,0,0,0,8,0,0,0,3,0,0,0,8,0,0,0,2,0,0,0,6,0,0,0,2,0,0,0,8,0,0,0,255,255,255,255,1,0,0,0,5,0,0,0,6,0,0,0,2,0,0,0,1,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,3,0,0,0,6,0,0,0,1,0,0,0,6,0,0,0,10,0,0,0,3,0,0,0,8,0,0,0,6,0,0,0,5,0,0,0,6,0,0,0,9,0,0,0,8,0,0,0,9,0,0,0,6,0,0,0,255,255,255,255,10,0,0,0,1,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,6,0,0,0,9,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,3,0,0,0,8,0,0,0,5,0,0,0,6,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,5,0,0,0,6,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,5,0,0,0,10,0,0,0,7,0,0,0,5,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,5,0,0,0,10,0,0,0,11,0,0,0,7,0,0,0,5,0,0,0,8,0,0,0,3,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,11,0,0,0,7,0,0,0,5,0,0,0,10,0,0,0,11,0,0,0,1,0,0,0,9,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,7,0,0,0,5,0,0,0,10,0,0,0,11,0,0,0,7,0,0,0,9,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,3,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,1,0,0,0,2,0,0,0,11,0,0,0,7,0,0,0,1,0,0,0,7,0,0,0,5,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,7,0,0,0,1,0,0,0,7,0,0,0,5,0,0,0,7,0,0,0,2,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,7,0,0,0,5,0,0,0,9,0,0,0,2,0,0,0,7,0,0,0,9,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,11,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,7,0,0,0,5,0,0,0,2,0,0,0,7,0,0,0,2,0,0,0,11,0,0,0,5,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,8,0,0,0,9,0,0,0,8,0,0,0,2,0,0,0,255,255,255,255,2,0,0,0,5,0,0,0,10,0,0,0,2,0,0,0,3,0,0,0,5,0,0,0,3,0,0,0,7,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,2,0,0,0,0,0,0,0,8,0,0,0,5,0,0,0,2,0,0,0,8,0,0,0,7,0,0,0,5,0,0,0,10,0,0,0,2,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,10,0,0,0,3,0,0,0,5,0,0,0,3,0,0,0,7,0,0,0,3,0,0,0,10,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,8,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,1,0,0,0,8,0,0,0,7,0,0,0,2,0,0,0,10,0,0,0,2,0,0,0,5,0,0,0,7,0,0,0,5,0,0,0,2,0,0,0,255,255,255,255,1,0,0,0,3,0,0,0,5,0,0,0,3,0,0,0,7,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,7,0,0,0,0,0,0,0,7,0,0,0,1,0,0,0,1,0,0,0,7,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,0,0,0,0,3,0,0,0,9,0,0,0,3,0,0,0,5,0,0,0,5,0,0,0,3,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,8,0,0,0,7,0,0,0,5,0,0,0,9,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,8,0,0,0,4,0,0,0,5,0,0,0,10,0,0,0,8,0,0,0,10,0,0,0,11,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,0,0,0,0,4,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,5,0,0,0,10,0,0,0,11,0,0,0,11,0,0,0,3,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,9,0,0,0,8,0,0,0,4,0,0,0,10,0,0,0,8,0,0,0,10,0,0,0,11,0,0,0,10,0,0,0,4,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,10,0,0,0,11,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,5,0,0,0,11,0,0,0,3,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,1,0,0,0,3,0,0,0,1,0,0,0,4,0,0,0,255,255,255,255,2,0,0,0,5,0,0,0,1,0,0,0,2,0,0,0,8,0,0,0,5,0,0,0,2,0,0,0,11,0,0,0,8,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,4,0,0,0,11,0,0,0,0,0,0,0,11,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,11,0,0,0,2,0,0,0,11,0,0,0,1,0,0,0,5,0,0,0,1,0,0,0,11,0,0,0,255,255,255,255,0,0,0,0,2,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,9,0,0,0,2,0,0,0,11,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,11,0,0,0,8,0,0,0,5,0,0,0,255,255,255,255,9,0,0,0,4,0,0,0,5,0,0,0,2,0,0,0,11,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,5,0,0,0,10,0,0,0,3,0,0,0,5,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,8,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,5,0,0,0,10,0,0,0,2,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,10,0,0,0,2,0,0,0,3,0,0,0,5,0,0,0,10,0,0,0,3,0,0,0,8,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,0,0,0,0,1,0,0,0,9,0,0,0,255,255,255,255,5,0,0,0,10,0,0,0,2,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,9,0,0,0,2,0,0,0,9,0,0,0,4,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,5,0,0,0,3,0,0,0,3,0,0,0,5,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,4,0,0,0,5,0,0,0,1,0,0,0,0,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,8,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,5,0,0,0,3,0,0,0,9,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,3,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,4,0,0,0,5,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,11,0,0,0,7,0,0,0,4,0,0,0,9,0,0,0,11,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,8,0,0,0,3,0,0,0,4,0,0,0,9,0,0,0,7,0,0,0,9,0,0,0,11,0,0,0,7,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,10,0,0,0,11,0,0,0,1,0,0,0,11,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,1,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,8,0,0,0,1,0,0,0,10,0,0,0,4,0,0,0,7,0,0,0,4,0,0,0,11,0,0,0,10,0,0,0,11,0,0,0,4,0,0,0,255,255,255,255,4,0,0,0,11,0,0,0,7,0,0,0,9,0,0,0,11,0,0,0,4,0,0,0,9,0,0,0,2,0,0,0,11,0,0,0,9,0,0,0,1,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,7,0,0,0,4,0,0,0,9,0,0,0,11,0,0,0,7,0,0,0,9,0,0,0,1,0,0,0,11,0,0,0,2,0,0,0,11,0,0,0,1,0,0,0,0,0,0,0,8,0,0,0,3,0,0,0,255,255,255,255,11,0,0,0,7,0,0,0,4,0,0,0,11,0,0,0,4,0,0,0,2,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,11,0,0,0,7,0,0,0,4,0,0,0,11,0,0,0,4,0,0,0,2,0,0,0,8,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,9,0,0,0,10,0,0,0,2,0,0,0,7,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,7,0,0,0,7,0,0,0,4,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,10,0,0,0,7,0,0,0,9,0,0,0,7,0,0,0,4,0,0,0,10,0,0,0,2,0,0,0,7,0,0,0,8,0,0,0,7,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,7,0,0,0,255,255,255,255,3,0,0,0,7,0,0,0,10,0,0,0,3,0,0,0,10,0,0,0,2,0,0,0,7,0,0,0,4,0,0,0,10,0,0,0,1,0,0,0,10,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,10,0,0,0,255,255,255,255,1,0,0,0,10,0,0,0,2,0,0,0,8,0,0,0,7,0,0,0,4,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,9,0,0,0,1,0,0,0,4,0,0,0,1,0,0,0,7,0,0,0,7,0,0,0,1,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,9,0,0,0,1,0,0,0,4,0,0,0,1,0,0,0,7,0,0,0,0,0,0,0,8,0,0,0,1,0,0,0,8,0,0,0,7,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,0,0,0,0,3,0,0,0,7,0,0,0,4,0,0,0,3,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,4,0,0,0,8,0,0,0,7,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,10,0,0,0,8,0,0,0,10,0,0,0,11,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,0,0,0,0,9,0,0,0,3,0,0,0,9,0,0,0,11,0,0,0,11,0,0,0,9,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,1,0,0,0,10,0,0,0,0,0,0,0,10,0,0,0,8,0,0,0,8,0,0,0,10,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,1,0,0,0,10,0,0,0,11,0,0,0,3,0,0,0,10,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,11,0,0,0,1,0,0,0,11,0,0,0,9,0,0,0,9,0,0,0,11,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,0,0,0,0,9,0,0,0,3,0,0,0,9,0,0,0,11,0,0,0,1,0,0,0,2,0,0,0,9,0,0,0,2,0,0,0,11,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,2,0,0,0,11,0,0,0,8,0,0,0,0,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,2,0,0,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,3,0,0,0,8,0,0,0,2,0,0,0,8,0,0,0,10,0,0,0,10,0,0,0,8,0,0,0,9,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,9,0,0,0,10,0,0,0,2,0,0,0,0,0,0,0,9,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,2,0,0,0,3,0,0,0,8,0,0,0,2,0,0,0,8,0,0,0,10,0,0,0,0,0,0,0,1,0,0,0,8,0,0,0,1,0,0,0,10,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,10,0,0,0,2,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,1,0,0,0,3,0,0,0,8,0,0,0,9,0,0,0,1,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,9,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,3,0,0,0,8,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,63,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,63,0,0,0,63,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,63,0,0,0,63,0,0,128,63,0,0,0,0,0,0,128,63,0,0,128,63,0,0,0,63,0,0,0,63,0,0,128,63,0,0,128,63,0,0,0,0,0,0,128,63,0,0,0,63,0,0,0,0,0,0,0,63,0,0,0,0,0,0,128,63,0,0,0,63,0,0,0,0,0,0,128,63,0,0,0,63,0,0,128,63,0,0,0,0,0,0,0,63,0,0,128,63,0,0,0,0,1,0,0,0,1,0,0,0,1,64,2,0,1,64,2,0,0,64,2,0,0,64,2,0,0,0,0,0,128,1,0,0,129,1,0,0,129,1,0,0,129,65,2,0,129,65,2,0,128,65,2,0,128,65,2,0,128,1,0,0,0,0,0,0,128,1,0,0,1,0,0,0,129,1,0,0,1,64,2,0,129,65,2,0,0,64,2,0,128,65,2,0,0,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,2,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,2,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,5,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,5,0,0,0,2,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,3,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,5,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10244);



var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  
  
  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
  
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
  
        if (!total) {
          // early out
          return callback(null);
        }
  
        var completed = 0;
        function done(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function transaction_onerror() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
  
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
  
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
  
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat, node;
  
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
  
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
  
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function req_onupgradeneeded() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function req_onsuccess() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function req_onerror() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function transaction_onerror() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function store_openCursor_onsuccess(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
  
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          stream.position = position;
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            current = current.mount.root;
          }
  
          // follow symlinks
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.parent = null;
            this.mount = null;
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            FS.hashAddNode(this);
          };
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          FS.FSNode.prototype = {};
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
        return new FS.FSNode(parent, name, mode, rdev);
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 1;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        if (stream.__proto__) {
          // reuse the object
          stream.__proto__ = FS.FSStream.prototype;
        } else {
          var newStream = new FS.FSStream();
          for (var p in stream) {
            newStream[p] = stream[p];
          }
          stream = newStream;
        }
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var completed = 0;
        var total = FS.mounts.length;
        function done(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
  
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path, { follow: false });
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
  
              if (!hasByteServing) chunkSize = datalength;
  
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
  
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
  
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
  
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  
  
  
  
  var _mkport=undefined;var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 0777, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              var url = 'ws://' + addr + ':' + port;
              // the node ws library API is slightly different than the browser's
              var opts = ENVIRONMENT_IS_NODE ? {headers: {'websocket-protocol': ['binary']}} : ['binary'];
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          }
          if (precision === -1) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }

  function _clock() {
      if (_clock.start === undefined) _clock.start = Date.now();
      return Math.floor((Date.now() - _clock.start) * (1000000/1000));
    }

  
   
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i32=_memset;

  var _floor=Math_floor;

  var _floorf=Math_floor;

  function _abort() {
      Module['abort']();
    }

  function ___errno_location() {
      return ___errno_state;
    }

  
   
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }






  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
  
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
  
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
  
  
            var errorInfo = '?';
            function onContextCreationError(event) {
              errorInfo = event.statusMessage || errorInfo;
            }
            canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
            try {
              ['experimental-webgl', 'webgl'].some(function(webglId) {
                return ctx = canvas.getContext(webglId, contextAttributes);
              });
            } finally {
              canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
            }
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e]);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          GLctx = Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
  
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
            Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
            Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
            // just add the mouse delta to the current absolut mouse position
            // FIXME: ideally this should be clamped against the canvas size and zero
            Browser.mouseX += Browser.mouseMovementX;
            Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (scrollX + rect.left);
              y = t.pageY - (scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (scrollX + rect.left);
            y = event.pageY - (scrollY + rect.top);
          }
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
            flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
            HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
            flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
            HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + 5242880;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");


var Math_min = Math.min;
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);

  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var NaN=+env.NaN;
  var Infinity=+env.Infinity;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var asmPrintInt=env.asmPrintInt;
  var asmPrintFloat=env.asmPrintFloat;
  var Math_min=env.min;
  var invoke_ii=env.invoke_ii;
  var invoke_v=env.invoke_v;
  var invoke_iii=env.invoke_iii;
  var invoke_vi=env.invoke_vi;
  var _sysconf=env._sysconf;
  var _pwrite=env._pwrite;
  var _sbrk=env._sbrk;
  var _floorf=env._floorf;
  var _clock=env._clock;
  var ___setErrNo=env.___setErrNo;
  var _fwrite=env._fwrite;
  var __reallyNegative=env.__reallyNegative;
  var __formatString=env.__formatString;
  var _send=env._send;
  var _write=env._write;
  var _abort=env._abort;
  var _fprintf=env._fprintf;
  var _floor=env._floor;
  var _printf=env._printf;
  var ___errno_location=env.___errno_location;
  var _fflush=env._fflush;
  var _time=env._time;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 7)&-8;
  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1|0] = HEAP8[ptr+1|0];
  HEAP8[tempDoublePtr+2|0] = HEAP8[ptr+2|0];
  HEAP8[tempDoublePtr+3|0] = HEAP8[ptr+3|0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1|0] = HEAP8[ptr+1|0];
  HEAP8[tempDoublePtr+2|0] = HEAP8[ptr+2|0];
  HEAP8[tempDoublePtr+3|0] = HEAP8[ptr+3|0];
  HEAP8[tempDoublePtr+4|0] = HEAP8[ptr+4|0];
  HEAP8[tempDoublePtr+5|0] = HEAP8[ptr+5|0];
  HEAP8[tempDoublePtr+6|0] = HEAP8[ptr+6|0];
  HEAP8[tempDoublePtr+7|0] = HEAP8[ptr+7|0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}

function setTempRet1(value) {
  value = value|0;
  tempRet1 = value;
}

function setTempRet2(value) {
  value = value|0;
  tempRet2 = value;
}

function setTempRet3(value) {
  value = value|0;
  tempRet3 = value;
}

function setTempRet4(value) {
  value = value|0;
  tempRet4 = value;
}

function setTempRet5(value) {
  value = value|0;
  tempRet5 = value;
}

function setTempRet6(value) {
  value = value|0;
  tempRet6 = value;
}

function setTempRet7(value) {
  value = value|0;
  tempRet7 = value;
}

function setTempRet8(value) {
  value = value|0;
  tempRet8 = value;
}

function setTempRet9(value) {
  value = value|0;
  tempRet9 = value;
}
function runPostSets() {


}

function _marching_cubes($segId,$pixelToSegId){
 $segId=($segId)|0;
 $pixelToSegId=($pixelToSegId)|0;
 var $1=0,$2=0,$3=0,$4=0,$5=0,$6=.0,$7=.0,$8=.0,$9=0,$10=0,$triCount_013=0,$i_012=0,$12=0,$13=0,$14=0,$15=0,$17=0,$18=0,$19=0,$20=0;
 var $21=0,$22=0,$23=0,$24=0,$25=0,$26=0,$27=0,$28=0,$29=0,$30=0,$31=0,$32=0,$33=0,$34=0,$35=0,$36=0,$37=0,$38=0,$39=0,$40=0;
 var $41=0,$42=0,$43=0,$44=0,$45=0,$46=0,$47=0,$48=0,$49=0,$50=0,$51=0,$52=0,$53=0,$54=0,$55=0,$56=0,$57=0,$58=0,$59=0,$60=0;
 var $61=0,$62=0,$63=0,$64=0,$65=0,$66=0,$67=0,$68=0,$69=0,$70=0,$71=0,$72=0,$73=0,$74=0,$75=0,$76=0,$77=0,$78=0,$79=0,$80=0;
 var $81=0,$82=0,$83=0,$84=0,$85=0,$86=0,$87=0,$88=0,$89=0,$90=0,$91=0,$92=0,$93=0,$94=0,$95=0,$96=0,$97=0,$98=0,$99=0,$100=0;
 var $101=0,$102=0,$103=0,$104=0,$105=0,$106=0,$107=0,$108=0,$109=0,$110=0,$111=0,$112=0,$113=0,$114=0,$115=0,$116=0,$117=0,$118=0,$119=0,$120=0;
 var $121=0,$122=0,$123=0,$124=0,$125=0,$126=0,$127=0,$128=0,$129=0,$130=0,$131=0,$132=0,$133=0,$134=0,$135=0,$136=0,$137=0,$138=0,$139=0,$140=0;
 var $141=0,$142=0,$143=0,$144=0,$145=0,$146=0,$147=0,$148=0,$149=0,$150=0,$151=0,$152=0,$153=0,$154=0,$155=0,$156=0,$157=0,$158=0,$159=0,$160=0;
 var $161=0,$162=0,$163=0,$164=0,$165=0,$166=0,$167=0,$168=0,$169=0,$170=0,$171=0,$172=0,$173=0,$174=0,$175=0,$176=0,$177=0,$178=0,$179=0,$180=0;
 var $181=0,$182=0,$183=0,$184=0,$185=0,$186=0,$187=0,$188=0,$189=0,$190=0,$191=0,$192=0,$193=0,$194=0,$195=0,$196=0,$197=0,$198=0,$199=0,$200=0;
 var $201=0,$202=0,$203=0,$204=0,$205=0,$206=0,$207=0,$208=0,$209=0,$210=0,$211=0,$212=0,$213=0,$214=0,$215=0,$216=0,$217=0,$218=0,$219=0,$220=0;
 var $221=0,$222=0,$223=0,$224=0,$225=0,$226=0,$227=0,$228=0,$229=0,$230=0,$231=0,$232=0,$233=0,$234=0,$235=0,$236=0,$237=0,$238=0,$239=0,$240=0;
 var $241=0,$242=0,$243=0,$244=0,$245=0,$246=0,$247=0,$248=0,$249=0,$250=0,$251=0,$252=0,$253=0,$254=0,$255=0,$256=0,$257=0,$258=0,$259=0,$260=0;
 var $261=0,$262=0,$263=0,$264=0,$265=0,$266=0,$268=0,$269=0,$270=0,$271=0,$272=0,$273=0,$274=0,$275=0,$277=0,$278=0,$279=.0,$280=.0,$281=.0,$282=0;
 var $283=0,$284=0,$285=0,$286=0,$287=0,$288=0,$289=.0,$290=0,$291=0,$292=0,$293=0,$294=.0,$295=.0,$296=.0,$297=0,$298=0,$i1_010=0,$startIdx_09=0,$300=0,$301=0;
 var $302=0,$303=0,$304=0,$305=0,$306=.0,$307=.0,$308=.0,$309=.0,$310=.0,$311=.0,$312=.0,$floorf=.0,$313=0,$314=.0,$315=.0,$316=.0,$317=.0,$318=0,$_off=0,$_cmp=0;
 var $319=0,$cubeIndex_08=0,$m_07=0,$startIdx_16=0,$320=0,$cubeIndex_15=0,$v_04=0,$startIdx_23=0,$322=0,$323=0,$324=0,$325=0,$326=0,$327=.0,$328=0,$329=0,$330=.0,$331=0,$332=0,$333=.0;
 var $334=.0,$335=.0,$336=0,$337=.0,$338=.0,$339=0,$340=0,$341=.0,$342=.0,$343=0,$344=0,$345=0,$346=0,$347=0,$348=0,$349=0,$350=0,$351=0,$352=0,$353=0;
 var $354=0,$355=0,$356=0,$357=0,$358=0,$359=0,$360=0,$361=0,$362=.0,$_sum=0,$363=0,$364=0,$365=0,$366=0,$367=0,$368=0,$369=0,$370=0,$371=0,$372=0;
 var $373=.0,$_sum1=0,$374=0,$375=0,$376=0,$377=0,$378=0,$379=0,$380=0,$381=0,$382=0,$383=0,$384=.0,$_sum2=0,$385=0,$386=0,$387=0,$388=0,$389=0,$391=0;
 var $392=0,$393=0,$394=0,$startIdx_1_lcssa=0,$395=0,$396=0,$398=0,$399=0,$400=.0,$401=.0,$402=.0,$403=0,$404=0,$405=.0,$406=.0,$407=.0,$408=0,label=0;
 var tempVarArgs=0;
 var sp=0;sp=STACKTOP;
 $1=((_printf(((160)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 8)|0,HEAP32[((tempVarArgs)>>2)]=$segId,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 $2=((_clock())|0);
 $3=((_clock())|0);
 _memset(((((28329880)|0))|0), ((((0)|0))|0), ((((9437184)|0))|0))|0;
 _memset(((((18328)|0))|0), ((((0)|0))|0), ((((28311552)|0))|0))|0;
 $4=((_clock())|0);
 $5=((($4)-($3))|0);
 $6=(+((($5|0))|0));
 $7=($6)*((1000.0));
 $8=($7)/((1000000.0));
 $9=((_printf(((136)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 8)|0,HEAPF64[((tempVarArgs)>>3)]=$8,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 $10=((_clock())|0);
 $i_012=9437183;$triCount_013=0;
 while(1) {


  $12=(($pixelToSegId+($i_012<<1))|0);
  $13=((HEAP16[(($12)>>1)])|0);
  $14=($13&65535);
  $15=($14|0)==($segId|0);
  if ($15) {
   $17=((28329880+$i_012)|0);
   $18=((HEAP8[($17)])|0);
   $19=$18|1;
   HEAP8[($17)]=$19;
   $20=((($i_012)-(1))|0);
   $21=((28329880+$20)|0);
   $22=((HEAP8[($21)])|0);
   $23=$22|2;
   HEAP8[($21)]=$23;
   $24=((($i_012)-(384))|0);
   $25=((28329880+$24)|0);
   $26=((HEAP8[($25)])|0);
   $27=$26|16;
   HEAP8[($25)]=$27;
   $28=((($i_012)-(385))|0);
   $29=((28329880+$28)|0);
   $30=((HEAP8[($29)])|0);
   $31=$30|32;
   HEAP8[($29)]=$31;
   $32=((($i_012)-(147456))|0);
   $33=((28329880+$32)|0);
   $34=((HEAP8[($33)])|0);
   $35=$34|8;
   HEAP8[($33)]=$35;
   $36=((($i_012)-(147457))|0);
   $37=((28329880+$36)|0);
   $38=((HEAP8[($37)])|0);
   $39=$38|4;
   HEAP8[($37)]=$39;
   $40=((($i_012)-(147840))|0);
   $41=((28329880+$40)|0);
   $42=((HEAP8[($41)])|0);
   $43=$42|-128;
   HEAP8[($41)]=$43;
   $44=((($i_012)-(147841))|0);
   $45=((28329880+$44)|0);
   $46=((HEAP8[($45)])|0);
   $47=$46|64;
   HEAP8[($45)]=$47;
   $48=((($i_012)*(3))&-1);
   $49=((($48)+(3))|0);
   $50=((18328+$49)|0);
   $51=((HEAP8[($50)])|0);
   $52=((($51)+(10))&255);
   HEAP8[($50)]=$52;
   $53=((($20)*(3))&-1);
   $54=((18328+$53)|0);
   $55=((HEAP8[($54)])|0);
   $56=((($55)-(10))&255);
   HEAP8[($54)]=$56;
   $57=((($48)+(1153))|0);
   $58=((18328+$57)|0);
   $59=((HEAP8[($58)])|0);
   $60=((($59)+(10))&255);
   HEAP8[($58)]=$60;
   $61=((($24)*(3))&-1);
   $62=((($61)+(1))|0);
   $63=((18328+$62)|0);
   $64=((HEAP8[($63)])|0);
   $65=((($64)-(10))&255);
   HEAP8[($63)]=$65;
   $66=((($48)+(442370))|0);
   $67=((18328+$66)|0);
   $68=((HEAP8[($67)])|0);
   $69=((($68)+(10))&255);
   HEAP8[($67)]=$69;
   $70=((($32)*(3))&-1);
   $71=((($70)+(2))|0);
   $72=((18328+$71)|0);
   $73=((HEAP8[($72)])|0);
   $74=((($73)-(10))&255);
   HEAP8[($72)]=$74;
   $75=((($48)+(1155))|0);
   $76=((18328+$75)|0);
   $77=((HEAP8[($76)])|0);
   $78=((($77)+(7))&255);
   HEAP8[($76)]=$78;
   $79=((($48)+(1156))|0);
   $80=((18328+$79)|0);
   $81=((HEAP8[($80)])|0);
   $82=((($81)+(7))&255);
   HEAP8[($80)]=$82;
   $83=((($48)+(443523))|0);
   $84=((18328+$83)|0);
   $85=((HEAP8[($84)])|0);
   $86=((($85)+(6))&255);
   HEAP8[($84)]=$86;
   $87=((($48)+(443524))|0);
   $88=((18328+$87)|0);
   $89=((HEAP8[($88)])|0);
   $90=((($89)+(6))&255);
   HEAP8[($88)]=$90;
   $91=((($48)+(443525))|0);
   $92=((18328+$91)|0);
   $93=((HEAP8[($92)])|0);
   $94=((($93)+(6))&255);
   HEAP8[($92)]=$94;
   $95=((($48)-(441213))|0);
   $96=((18328+$95)|0);
   $97=((HEAP8[($96)])|0);
   $98=((($97)+(6))&255);
   HEAP8[($96)]=$98;
   $99=((($48)-(441212))|0);
   $100=((18328+$99)|0);
   $101=((HEAP8[($100)])|0);
   $102=((($101)+(6))&255);
   HEAP8[($100)]=$102;
   $103=((($48)-(441211))|0);
   $104=((18328+$103)|0);
   $105=((HEAP8[($104)])|0);
   $106=((($105)-(6))&255);
   HEAP8[($104)]=$106;
   $107=((($48)+(1149))|0);
   $108=((18328+$107)|0);
   $109=((HEAP8[($108)])|0);
   $110=((($109)-(7))&255);
   HEAP8[($108)]=$110;
   $111=((($48)+(1150))|0);
   $112=((18328+$111)|0);
   $113=((HEAP8[($112)])|0);
   $114=((($113)+(7))&255);
   HEAP8[($112)]=$114;
   $115=((($48)+(443517))|0);
   $116=((18328+$115)|0);
   $117=((HEAP8[($116)])|0);
   $118=((($117)-(6))&255);
   HEAP8[($116)]=$118;
   $119=((($48)+(443518))|0);
   $120=((18328+$119)|0);
   $121=((HEAP8[($120)])|0);
   $122=((($121)+(6))&255);
   HEAP8[($120)]=$122;
   $123=((($48)+(443519))|0);
   $124=((18328+$123)|0);
   $125=((HEAP8[($124)])|0);
   $126=((($125)+(6))&255);
   HEAP8[($124)]=$126;
   $127=((($48)-(441219))|0);
   $128=((18328+$127)|0);
   $129=((HEAP8[($128)])|0);
   $130=((($129)-(6))&255);
   HEAP8[($128)]=$130;
   $131=((($48)-(441218))|0);
   $132=((18328+$131)|0);
   $133=((HEAP8[($132)])|0);
   $134=((($133)+(6))&255);
   HEAP8[($132)]=$134;
   $135=((($48)-(441217))|0);
   $136=((18328+$135)|0);
   $137=((HEAP8[($136)])|0);
   $138=((($137)-(6))&255);
   HEAP8[($136)]=$138;
   $139=((($28)*(3))&-1);
   $140=((18328+$139)|0);
   $141=((HEAP8[($140)])|0);
   $142=((($141)-(7))&255);
   HEAP8[($140)]=$142;
   $143=((($139)+(1))|0);
   $144=((18328+$143)|0);
   $145=((HEAP8[($144)])|0);
   $146=((($145)-(7))&255);
   HEAP8[($144)]=$146;
   $147=((($48)+(441213))|0);
   $148=((18328+$147)|0);
   $149=((HEAP8[($148)])|0);
   $150=((($149)-(6))&255);
   HEAP8[($148)]=$150;
   $151=((($48)+(441214))|0);
   $152=((18328+$151)|0);
   $153=((HEAP8[($152)])|0);
   $154=((($153)-(6))&255);
   HEAP8[($152)]=$154;
   $155=((($48)+(441215))|0);
   $156=((18328+$155)|0);
   $157=((HEAP8[($156)])|0);
   $158=((($157)+(6))&255);
   HEAP8[($156)]=$158;
   $159=((($44)*(3))&-1);
   $160=((18328+$159)|0);
   $161=((HEAP8[($160)])|0);
   $162=((($161)-(6))&255);
   HEAP8[($160)]=$162;
   $163=((($159)+(1))|0);
   $164=((18328+$163)|0);
   $165=((HEAP8[($164)])|0);
   $166=((($165)-(6))&255);
   HEAP8[($164)]=$166;
   $167=((($159)+(2))|0);
   $168=((18328+$167)|0);
   $169=((HEAP8[($168)])|0);
   $170=((($169)-(6))&255);
   HEAP8[($168)]=$170;
   $171=((($48)-(1149))|0);
   $172=((18328+$171)|0);
   $173=((HEAP8[($172)])|0);
   $174=((($173)+(7))&255);
   HEAP8[($172)]=$174;
   $175=((($48)-(1148))|0);
   $176=((18328+$175)|0);
   $177=((HEAP8[($176)])|0);
   $178=((($177)-(7))&255);
   HEAP8[($176)]=$178;
   $179=((($48)+(441219))|0);
   $180=((18328+$179)|0);
   $181=((HEAP8[($180)])|0);
   $182=((($181)+(6))&255);
   HEAP8[($180)]=$182;
   $183=((($48)+(441220))|0);
   $184=((18328+$183)|0);
   $185=((HEAP8[($184)])|0);
   $186=((($185)-(6))&255);
   HEAP8[($184)]=$186;
   $187=((($48)+(441221))|0);
   $188=((18328+$187)|0);
   $189=((HEAP8[($188)])|0);
   $190=((($189)+(6))&255);
   HEAP8[($188)]=$190;
   $191=((($48)-(443517))|0);
   $192=((18328+$191)|0);
   $193=((HEAP8[($192)])|0);
   $194=((($193)+(6))&255);
   HEAP8[($192)]=$194;
   $195=((($48)-(443516))|0);
   $196=((18328+$195)|0);
   $197=((HEAP8[($196)])|0);
   $198=((($197)-(6))&255);
   HEAP8[($196)]=$198;
   $199=((($48)-(443515))|0);
   $200=((18328+$199)|0);
   $201=((HEAP8[($200)])|0);
   $202=((($201)-(6))&255);
   HEAP8[($200)]=$202;
   $203=((HEAP8[($76)])|0);
   $204=((($203)+(7))&255);
   HEAP8[($76)]=$204;
   $205=((HEAP8[($80)])|0);
   $206=((($205)+(7))&255);
   HEAP8[($80)]=$206;
   $207=((HEAP8[($84)])|0);
   $208=((($207)+(6))&255);
   HEAP8[($84)]=$208;
   $209=((HEAP8[($88)])|0);
   $210=((($209)+(6))&255);
   HEAP8[($88)]=$210;
   $211=((HEAP8[($92)])|0);
   $212=((($211)+(6))&255);
   HEAP8[($92)]=$212;
   $213=((HEAP8[($96)])|0);
   $214=((($213)+(6))&255);
   HEAP8[($96)]=$214;
   $215=((HEAP8[($100)])|0);
   $216=((($215)+(6))&255);
   HEAP8[($100)]=$216;
   $217=((HEAP8[($104)])|0);
   $218=((($217)-(6))&255);
   HEAP8[($104)]=$218;
   $219=((HEAP8[($108)])|0);
   $220=((($219)-(7))&255);
   HEAP8[($108)]=$220;
   $221=((HEAP8[($112)])|0);
   $222=((($221)+(7))&255);
   HEAP8[($112)]=$222;
   $223=((HEAP8[($116)])|0);
   $224=((($223)-(6))&255);
   HEAP8[($116)]=$224;
   $225=((HEAP8[($120)])|0);
   $226=((($225)+(6))&255);
   HEAP8[($120)]=$226;
   $227=((HEAP8[($124)])|0);
   $228=((($227)+(6))&255);
   HEAP8[($124)]=$228;
   $229=((HEAP8[($128)])|0);
   $230=((($229)-(6))&255);
   HEAP8[($128)]=$230;
   $231=((HEAP8[($132)])|0);
   $232=((($231)+(6))&255);
   HEAP8[($132)]=$232;
   $233=((HEAP8[($136)])|0);
   $234=((($233)-(6))&255);
   HEAP8[($136)]=$234;
   $235=((HEAP8[($140)])|0);
   $236=((($235)-(7))&255);
   HEAP8[($140)]=$236;
   $237=((HEAP8[($144)])|0);
   $238=((($237)-(7))&255);
   HEAP8[($144)]=$238;
   $239=((HEAP8[($148)])|0);
   $240=((($239)-(6))&255);
   HEAP8[($148)]=$240;
   $241=((HEAP8[($152)])|0);
   $242=((($241)-(6))&255);
   HEAP8[($152)]=$242;
   $243=((HEAP8[($156)])|0);
   $244=((($243)+(6))&255);
   HEAP8[($156)]=$244;
   $245=((HEAP8[($160)])|0);
   $246=((($245)-(6))&255);
   HEAP8[($160)]=$246;
   $247=((HEAP8[($164)])|0);
   $248=((($247)-(6))&255);
   HEAP8[($164)]=$248;
   $249=((HEAP8[($168)])|0);
   $250=((($249)-(6))&255);
   HEAP8[($168)]=$250;
   $251=((HEAP8[($172)])|0);
   $252=((($251)+(7))&255);
   HEAP8[($172)]=$252;
   $253=((HEAP8[($176)])|0);
   $254=((($253)-(7))&255);
   HEAP8[($176)]=$254;
   $255=((HEAP8[($180)])|0);
   $256=((($255)+(6))&255);
   HEAP8[($180)]=$256;
   $257=((HEAP8[($184)])|0);
   $258=((($257)-(6))&255);
   HEAP8[($184)]=$258;
   $259=((HEAP8[($188)])|0);
   $260=((($259)+(6))&255);
   HEAP8[($188)]=$260;
   $261=((HEAP8[($192)])|0);
   $262=((($261)+(6))&255);
   HEAP8[($192)]=$262;
   $263=((HEAP8[($196)])|0);
   $264=((($263)-(6))&255);
   HEAP8[($196)]=$264;
   $265=((HEAP8[($200)])|0);
   $266=((($265)-(6))&255);
   HEAP8[($200)]=$266;
  }
  $268=((28329880+$i_012)|0);
  $269=((HEAP8[($268)])|0);
  $270=($269&255);
  $271=((16808+($270<<2))|0);
  $272=((HEAP32[(($271)>>2)])|0);
  $273=((($272)+($triCount_013))|0);
  $274=((($i_012)-(1))|0);
  $275=($i_012|0)>0;
  if ($275) {
   $i_012=$274;$triCount_013=$273;
  } else {
   break;
  }
 }
 $277=((_clock())|0);
 $278=((($277)-($10))|0);
 $279=(+((($278|0))|0));
 $280=($279)*((1000.0));
 $281=($280)/((1000000.0));
 $282=((_printf(((112)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 8)|0,HEAPF64[((tempVarArgs)>>3)]=$281,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 $283=((_clock())|0);
 $284=((($273)*(9))&-1);
 $285=((($273)*(18))&-1);
 $286=$285|1;
 $287=((_calloc($286,4))|0);
 $288=$287;
 $289=(+((($284|0))|0));
 HEAPF32[(($288)>>2)]=$289;
 $290=(($287+4)|0);
 $291=$290;
 $292=((_clock())|0);
 $293=((($292)-($283))|0);
 $294=(+((($293|0))|0));
 $295=($294)*((1000.0));
 $296=($295)/((1000000.0));
 $297=((_printf(((72)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 8)|0,HEAPF64[((tempVarArgs)>>3)]=$296,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 $298=((_clock())|0);
 $startIdx_09=0;$i1_010=0;
 while(1) {


  $300=((28329880+$i1_010)|0);
  $301=((HEAP8[($300)])|0);
  $302=($301&255);
  $303=((16808+($302<<2))|0);
  $304=((HEAP32[(($303)>>2)])|0);
  $305=(((($i1_010|0))/(147456))&-1);
  $306=(+((($305|0))|0));
  $307=(+(Math_floor($306)));
  $308=$307;
  $309=(+((($i1_010|0))|0));
  $310=($308)*((147456.0));
  $311=($309)-($310);
  $312=($311)/((384.0));
  $floorf=(+(Math_floor($312)));
  $313=(((($i1_010|0))%(384))&-1);
  $314=(+((($313|0))|0));
  $315=($308)+((0.5));
  $316=($floorf)+((0.5));
  $317=($314)+((0.5));
  $318=$304&255;
  $_off=((($301)+(1))&255);
  $_cmp=((($_off&255))>>>0)>((1)>>>0);
  if ($_cmp) {
   $319=$302<<4;
   $startIdx_16=$startIdx_09;$m_07=0;$cubeIndex_08=$319;
   while(1) {



    $320=((($startIdx_16)+(9))|0);
    $startIdx_23=$startIdx_16;$v_04=0;$cubeIndex_15=$cubeIndex_08;
    while(1) {



     $322=((184+($cubeIndex_15<<2))|0);
     $323=((HEAP32[(($322)>>2)])|0);
     $324=$323&255;
     $325=((($324)*(3))&-1);
     $326=((16568+($325<<2))|0);
     $327=(+(HEAPF32[(($326)>>2)]));
     $328=((($325)+(1))|0);
     $329=((16568+($328<<2))|0);
     $330=(+(HEAPF32[(($329)>>2)]));
     $331=((($325)+(2))|0);
     $332=((16568+($331<<2))|0);
     $333=(+(HEAPF32[(($332)>>2)]));
     $334=($317)+($327);
     $335=($334)/((384.0));
     $336=(($291+($startIdx_23<<2))|0);
     HEAPF32[(($336)>>2)]=$335;
     $337=($316)+($330);
     $338=($337)/((384.0));
     $339=((($startIdx_23)+(1))|0);
     $340=(($291+($339<<2))|0);
     HEAPF32[(($340)>>2)]=$338;
     $341=($315)+($333);
     $342=($341)*((0.015625));
     $343=((($startIdx_23)+(2))|0);
     $344=(($291+($343<<2))|0);
     HEAPF32[(($344)>>2)]=$342;
     $345=$324<<1;
     $346=((16712+($345<<2))|0);
     $347=((HEAP32[(($346)>>2)])|0);
     $348=((($347)+($i1_010))|0);
     $349=((($348)*(3))&-1);
     $350=$345|1;
     $351=((16712+($350<<2))|0);
     $352=((HEAP32[(($351)>>2)])|0);
     $353=((($352)+($i1_010))|0);
     $354=((($353)*(3))&-1);
     $355=((18328+$349)|0);
     $356=((HEAP8[($355)])|0);
     $357=(($356<<24)>>24);
     $358=((18328+$354)|0);
     $359=((HEAP8[($358)])|0);
     $360=(($359<<24)>>24);
     $361=((($360)+($357))|0);
     $362=(+((($361|0))|0));
     $_sum=((($startIdx_23)+($284))|0);
     $363=(($291+($_sum<<2))|0);
     HEAPF32[(($363)>>2)]=$362;
     $364=((($349)+(1))|0);
     $365=((18328+$364)|0);
     $366=((HEAP8[($365)])|0);
     $367=(($366<<24)>>24);
     $368=((($354)+(1))|0);
     $369=((18328+$368)|0);
     $370=((HEAP8[($369)])|0);
     $371=(($370<<24)>>24);
     $372=((($371)+($367))|0);
     $373=(+((($372|0))|0));
     $_sum1=((($339)+($284))|0);
     $374=(($291+($_sum1<<2))|0);
     HEAPF32[(($374)>>2)]=$373;
     $375=((($349)+(2))|0);
     $376=((18328+$375)|0);
     $377=((HEAP8[($376)])|0);
     $378=(($377<<24)>>24);
     $379=((($354)+(2))|0);
     $380=((18328+$379)|0);
     $381=((HEAP8[($380)])|0);
     $382=(($381<<24)>>24);
     $383=((($382)+($378))|0);
     $384=(+((($383|0))|0));
     $_sum2=((($343)+($284))|0);
     $385=(($291+($_sum2<<2))|0);
     HEAPF32[(($385)>>2)]=$384;
     $386=((($cubeIndex_15)+(1))|0);
     $387=((($startIdx_23)+(3))|0);
     $388=((($v_04)+(1))&255);
     $389=((($388&255))>>>0)<((3)>>>0);
     if ($389) {
      $startIdx_23=$387;$v_04=$388;$cubeIndex_15=$386;
     } else {
      break;
     }
    }
    $391=((($cubeIndex_08)+(3))|0);
    $392=((($m_07)+(1))&255);
    $393=($392&255);
    $394=($393>>>0)<($318>>>0);
    if ($394) {
     $startIdx_16=$320;$m_07=$392;$cubeIndex_08=$391;
    } else {
     $startIdx_1_lcssa=$320;
     break;
    }
   }
  } else {
   $startIdx_1_lcssa=$startIdx_09;
  }

  $395=((($i1_010)+(1))|0);
  $396=($395|0)<9437184;
  if ($396) {
   $startIdx_09=$startIdx_1_lcssa;$i1_010=$395;
  } else {
   break;
  }
 }
 $398=((_clock())|0);
 $399=((($398)-($298))|0);
 $400=(+((($399|0))|0));
 $401=($400)*((1000.0));
 $402=($401)/((1000000.0));
 $403=((_printf(((40)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 8)|0,HEAPF64[((tempVarArgs)>>3)]=$402,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 $404=((($398)-($2))|0);
 $405=(+((($404|0))|0));
 $406=($405)*((1000.0));
 $407=($406)/((1000000.0));
 $408=((_printf(((8)|0),(((tempVarArgs=STACKTOP,STACKTOP = (STACKTOP + 16)|0,HEAPF64[((tempVarArgs)>>3)]=$407,HEAP32[(((tempVarArgs)+(8))>>2)]=$273,tempVarArgs))|0)))|0); STACKTOP=tempVarArgs;
 STACKTOP=sp;return (($288)|0);
}


function _malloc($bytes){
 $bytes=($bytes)|0;
 var $1=0,$3=0,$5=0,$6=0,$8=0,$9=0,$10=0,$11=0,$12=0,$13=0,$15=0,$16=0,$17=0,$18=0,$19=0,$20=0,$_sum11=0,$21=0,$22=0,$23=0;
 var $24=0,$25=0,$27=0,$28=0,$29=0,$31=0,$32=0,$33=0,$35=0,$36=0,$37=0,$40=0,$41=0,$42=0,$43=0,$_sum1314=0,$44=0,$45=0,$46=0,$47=0;
 var $48=0,$50=0,$51=0,$53=0,$55=0,$56=0,$57=0,$58=0,$59=0,$60=0,$61=0,$62=0,$63=0,$64=0,$65=0,$66=0,$67=0,$68=0,$69=0,$70=0;
 var $71=0,$72=0,$73=0,$74=0,$75=0,$76=0,$77=0,$78=0,$79=0,$80=0,$81=0,$82=0,$83=0,$84=0,$85=0,$_sum4=0,$86=0,$87=0,$88=0,$89=0;
 var $90=0,$92=0,$93=0,$94=0,$96=0,$97=0,$98=0,$100=0,$101=0,$102=0,$105=0,$106=0,$107=0,$108=0,$109=0,$110=0,$111=0,$112=0,$_sum67=0,$113=0;
 var $114=0,$115=0,$116=0,$117=0,$118=0,$120=0,$121=0,$122=0,$123=0,$124=0,$125=0,$126=0,$127=0,$128=0,$130=0,$_sum9_pre=0,$_pre=0,$_sum10=0,$132=0,$133=0;
 var $134=0,$135=0,$136=0,$_pre_phi=0,$F4_0=0,$139=0,$140=0,$141=0,$143=0,$145=0,$146=0,$148=0,$149=0,$150=0,$151=0,$152=0,$153=0,$154=0,$155=0,$156=0;
 var $157=0,$158=0,$159=0,$160=0,$161=0,$162=0,$163=0,$164=0,$165=0,$166=0,$167=0,$168=0,$169=0,$170=0,$171=0,$172=0,$173=0,$174=0,$175=0,$176=0;
 var $rsize_0_i=0,$v_0_i=0,$t_0_i=0,$178=0,$179=0,$180=0,$182=0,$183=0,$184=0,$185=0,$186=0,$187=0,$188=0,$189=0,$190=0,$_rsize_0_i=0,$_v_0_i=0,$192=0,$193=0,$194=0;
 var $196=0,$197=0,$198=0,$200=0,$201=0,$202=0,$203=0,$204=0,$206=0,$207=0,$208=0,$209=0,$211=0,$212=0,$213=0,$215=0,$216=0,$217=0,$220=0,$221=0;
 var $222=0,$224=0,$225=0,$226=0,$RP_0_i=0,$R_0_i=0,$227=0,$228=0,$229=0,$231=0,$232=0,$233=0,$235=0,$236=0,$R_1_i=0,$240=0,$242=0,$243=0,$244=0,$245=0;
 var $246=0,$cond_i=0,$248=0,$249=0,$250=0,$251=0,$252=0,$254=0,$255=0,$256=0,$258=0,$259=0,$260=0,$263=0,$266=0,$268=0,$269=0,$270=0,$272=0,$273=0;
 var $274=0,$275=0,$277=0,$278=0,$279=0,$281=0,$282=0,$285=0,$286=0,$287=0,$289=0,$290=0,$291=0,$293=0,$294=0,$298=0,$300=0,$301=0,$302=0,$_sum4_i=0;
 var $303=0,$304=0,$305=0,$306=0,$308=0,$309=0,$310=0,$_sum_i41=0,$311=0,$312=0,$_sum1_i=0,$313=0,$314=0,$315=0,$316=0,$318=0,$319=0,$320=0,$321=0,$322=0;
 var $323=0,$324=0,$325=0,$326=0,$328=0,$_sum2_pre_i=0,$_pre_i=0,$_sum3_i=0,$330=0,$331=0,$332=0,$333=0,$334=0,$_pre_phi_i=0,$F1_0_i=0,$337=0,$338=0,$339=0,$342=0,$343=0;
 var $345=0,$347=0,$348=0,$349=0,$350=0,$352=0,$353=0,$354=0,$356=0,$358=0,$359=0,$360=0,$361=0,$362=0,$363=0,$364=0,$365=0,$366=0,$367=0,$368=0;
 var $369=0,$370=0,$371=0,$372=0,$373=0,$374=0,$375=0,$376=0,$377=0,$378=0,$379=0,$idx_0_i=0,$381=0,$382=0,$383=0,$385=0,$387=0,$388=0,$390=0,$391=0;
 var $rst_0_i=0,$sizebits_0_i=0,$t_0_i16=0,$rsize_0_i17=0,$v_0_i18=0,$393=0,$394=0,$395=0,$396=0,$397=0,$399=0,$rsize_1_i=0,$v_1_i=0,$401=0,$402=0,$403=0,$404=0,$405=0,$406=0,$407=0;
 var $or_cond21_i=0,$rst_1_i=0,$408=0,$409=0,$t_1_i=0,$rsize_2_i=0,$v_2_i=0,$410=0,$411=0,$or_cond_i=0,$413=0,$414=0,$415=0,$416=0,$417=0,$419=0,$420=0,$421=0,$422=0,$423=0;
 var $424=0,$425=0,$426=0,$427=0,$428=0,$429=0,$430=0,$431=0,$432=0,$433=0,$434=0,$435=0,$436=0,$437=0,$438=0,$439=0,$440=0,$441=0,$442=0,$443=0;
 var $t_2_ph_i=0,$444=0,$v_334_i=0,$rsize_333_i=0,$t_232_i=0,$445=0,$446=0,$447=0,$448=0,$449=0,$_rsize_3_i=0,$t_2_v_3_i=0,$450=0,$451=0,$452=0,$453=0,$454=0,$455=0,$v_3_lcssa_i=0,$rsize_3_lcssa_i=0;
 var $456=0,$458=0,$459=0,$460=0,$462=0,$463=0,$464=0,$466=0,$467=0,$468=0,$470=0,$471=0,$472=0,$473=0,$474=0,$476=0,$477=0,$478=0,$479=0,$481=0;
 var $482=0,$483=0,$485=0,$486=0,$487=0,$490=0,$491=0,$492=0,$494=0,$495=0,$496=0,$RP_0_i19=0,$R_0_i20=0,$497=0,$498=0,$499=0,$501=0,$502=0,$503=0,$505=0;
 var $506=0,$R_1_i22=0,$510=0,$512=0,$513=0,$514=0,$515=0,$516=0,$cond_i23=0,$518=0,$519=0,$520=0,$521=0,$522=0,$524=0,$525=0,$526=0,$528=0,$529=0,$530=0;
 var $533=0,$536=0,$538=0,$539=0,$540=0,$542=0,$543=0,$544=0,$545=0,$547=0,$548=0,$549=0,$551=0,$552=0,$555=0,$556=0,$557=0,$559=0,$560=0,$561=0;
 var $563=0,$564=0,$568=0,$570=0,$571=0,$572=0,$_sum19_i=0,$573=0,$574=0,$575=0,$576=0,$578=0,$579=0,$580=0,$_sum_i2540=0,$581=0,$582=0,$_sum1_i26=0,$583=0,$584=0;
 var $585=0,$586=0,$588=0,$589=0,$590=0,$591=0,$592=0,$593=0,$594=0,$596=0,$_sum15_pre_i=0,$_pre_i27=0,$_sum18_i=0,$598=0,$599=0,$600=0,$601=0,$602=0,$_pre_phi_i28=0,$F5_0_i=0;
 var $605=0,$_sum16_i=0,$606=0,$607=0,$_sum17_i=0,$608=0,$609=0,$611=0,$612=0,$613=0,$615=0,$617=0,$618=0,$619=0,$620=0,$621=0,$622=0,$623=0,$624=0,$625=0;
 var $626=0,$627=0,$628=0,$629=0,$630=0,$631=0,$632=0,$633=0,$634=0,$635=0,$636=0,$637=0,$638=0,$I7_0_i=0,$640=0,$_sum2_i=0,$641=0,$642=0,$_sum3_i29=0,$643=0;
 var $_sum4_i30=0,$644=0,$645=0,$646=0,$647=0,$648=0,$649=0,$650=0,$652=0,$653=0,$_sum5_i=0,$654=0,$655=0,$_sum6_i=0,$656=0,$657=0,$_sum7_i=0,$658=0,$659=0,$661=0;
 var $662=0,$664=0,$665=0,$667=0,$668=0,$669=0,$670=0,$671=0,$672=0,$674=0,$675=0,$676=0,$677=0,$678=0,$K12_029_i=0,$T_028_i=0,$680=0,$681=0,$682=0,$683=0;
 var $685=0,$686=0,$687=0,$_sum12_i=0,$689=0,$690=0,$_sum13_i=0,$691=0,$692=0,$_sum14_i=0,$693=0,$694=0,$T_0_lcssa_i=0,$696=0,$697=0,$698=0,$699=0,$700=0,$701=0,$702=0;
 var $or_cond26_i=0,$704=0,$_sum9_i=0,$705=0,$706=0,$_sum10_i=0,$707=0,$708=0,$_sum11_i=0,$709=0,$710=0,$712=0,$713=0,$nb_0=0,$714=0,$715=0,$717=0,$718=0,$719=0,$721=0;
 var $722=0,$723=0,$724=0,$_sum2=0,$725=0,$726=0,$727=0,$728=0,$729=0,$730=0,$732=0,$733=0,$734=0,$_sum1=0,$735=0,$736=0,$737=0,$738=0,$740=0,$741=0;
 var $743=0,$744=0,$746=0,$747=0,$748=0,$749=0,$750=0,$751=0,$_sum=0,$752=0,$753=0,$754=0,$755=0,$756=0,$757=0,$759=0,$760=0,$762=0,$763=0,$764=0;
 var $765=0,$767=0,$768=0,$769=0,$771=0,$772=0,$773=0,$774=0,$775=0,$776=0,$777=0,$779=0,$780=0,$782=0,$783=0,$784=0,$785=0,$or_cond1_i=0,$787=0,$788=0;
 var $789=0,$791=0,$792=0,$794=0,$sp_0_i_i=0,$796=0,$797=0,$798=0,$800=0,$801=0,$802=0,$803=0,$805=0,$806=0,$807=0,$808=0,$809=0,$810=0,$812=0,$813=0;
 var $814=0,$815=0,$816=0,$818=0,$819=0,$820=0,$821=0,$822=0,$ssize_0_i=0,$824=0,$825=0,$826=0,$827=0,$or_cond_i31=0,$829=0,$830=0,$832=0,$833=0,$or_cond2_i=0,$835=0;
 var $836=0,$838=0,$839=0,$840=0,$841=0,$843=0,$844=0,$845=0,$846=0,$847=0,$ssize_1_i=0,$br_0_i=0,$849=0,$br_030_i=0,$ssize_129_i=0,$850=0,$851=0,$852=0,$or_cond5_i=0,$853=0;
 var $or_cond4_i=0,$855=0,$856=0,$857=0,$858=0,$859=0,$860=0,$862=0,$863=0,$865=0,$866=0,$ssize_2_i=0,$868=0,$tsize_03141_i=0,$869=0,$870=0,$tsize_1_i=0,$872=0,$874=0,$875=0;
 var $876=0,$877=0,$or_cond3_i=0,$878=0,$or_cond6_i=0,$880=0,$881=0,$882=0,$883=0,$884=0,$_tsize_1_i=0,$tbase_245_i=0,$tsize_244_i=0,$885=0,$886=0,$887=0,$888=0,$891=0,$892=0,$894=0;
 var $895=0,$896=0,$or_cond8_i=0,$899=0,$i_02_i_i=0,$901=0,$902=0,$903=0,$_sum_i_i=0,$904=0,$_sum1_i_i=0,$905=0,$906=0,$907=0,$908=0,$909=0,$910=0,$911=0,$912=0,$914=0;
 var $915=0,$916=0,$917=0,$918=0,$919=0,$920=0,$_sum_i12_i=0,$921=0,$922=0,$_sum2_i_i=0,$923=0,$924=0,$925=0,$sp_073_i=0,$926=0,$927=0,$928=0,$929=0,$930=0,$931=0;
 var $933=0,$934=0,$935=0,$936=0,$937=0,$938=0,$939=0,$941=0,$942=0,$943=0,$or_cond47_i=0,$945=0,$946=0,$947=0,$948=0,$949=0,$950=0,$951=0,$952=0,$953=0;
 var $955=0,$956=0,$957=0,$958=0,$959=0,$960=0,$961=0,$_sum_i16_i=0,$962=0,$963=0,$_sum2_i17_i=0,$964=0,$965=0,$966=0,$967=0,$968=0,$970=0,$sp_166_i=0,$972=0,$973=0;
 var $974=0,$976=0,$977=0,$978=0,$979=0,$980=0,$981=0,$982=0,$984=0,$985=0,$986=0,$987=0,$988=0,$989=0,$990=0,$992=0,$993=0,$995=0,$996=0,$_sum102_i=0;
 var $997=0,$998=0,$999=0,$1000=0,$1002=0,$1003=0,$1005=0,$_sum103_i=0,$1006=0,$1007=0,$1008=0,$1009=0,$1010=0,$_sum_i19_i=0,$1011=0,$1012=0,$1013=0,$1014=0,$_sum1_i20_i=0,$1015=0;
 var $1016=0,$1017=0,$1018=0,$1020=0,$1021=0,$1022=0,$_sum46_i_i=0,$1023=0,$1024=0,$1026=0,$1027=0,$1029=0,$1030=0,$1031=0,$_sum44_i_i=0,$1032=0,$1033=0,$_sum45_i_i=0,$1034=0,$1035=0;
 var $_sum2_i21_i=0,$_sum104_i=0,$1037=0,$1038=0,$1039=0,$1040=0,$1041=0,$1043=0,$1044=0,$1045=0,$_sum3940_i_i=0,$_sum114_i=0,$1047=0,$1048=0,$1049=0,$_sum41_i_i=0,$_sum115_i=0,$1050=0,$1051=0,$1052=0;
 var $1053=0,$1054=0,$1055=0,$1056=0,$1058=0,$1059=0,$1060=0,$1062=0,$1063=0,$1064=0,$1065=0,$1067=0,$1068=0,$1069=0,$1070=0,$1072=0,$_pre62_i_i=0,$1074=0,$1075=0,$1076=0;
 var $1078=0,$1079=0,$1080=0,$_pre_phi63_i_i=0,$1081=0,$1083=0,$_sum34_i_i=0,$_sum105_i=0,$1084=0,$1085=0,$1086=0,$_sum5_i_i=0,$_sum106_i=0,$1087=0,$1088=0,$1089=0,$1090=0,$_sum3637_i_i=0,$_sum107_i=0,$1092=0;
 var $1093=0,$1094=0,$1095=0,$1096=0,$1097=0,$1099=0,$1100=0,$1101=0,$1103=0,$1104=0,$1105=0,$_sum67_i_i=0,$_sum112_i=0,$1108=0,$1109=0,$1110=0,$1111=0,$_sum113_i=0,$1113=0,$1114=0;
 var $1115=0,$1116=0,$RP_0_i_i=0,$R_0_i_i=0,$1117=0,$1118=0,$1119=0,$1121=0,$1122=0,$1123=0,$1125=0,$1126=0,$1127=0,$R_1_i_i=0,$1131=0,$_sum31_i_i=0,$_sum108_i=0,$1133=0,$1134=0,$1135=0;
 var $1136=0,$1137=0,$1138=0,$cond_i_i=0,$1140=0,$1141=0,$1142=0,$1143=0,$1144=0,$1146=0,$1147=0,$1148=0,$1150=0,$1151=0,$1152=0,$1155=0,$1158=0,$1160=0,$1161=0,$1162=0;
 var $1164=0,$_sum3233_i_i=0,$_sum109_i=0,$1165=0,$1166=0,$1167=0,$1168=0,$1170=0,$1171=0,$1172=0,$1174=0,$1175=0,$_sum110_i=0,$1178=0,$1179=0,$1180=0,$1181=0,$1183=0,$1184=0,$1185=0;
 var $1187=0,$1188=0,$_sum9_i_i=0,$_sum111_i=0,$1192=0,$1193=0,$1194=0,$qsize_0_i_i=0,$oldfirst_0_i_i=0,$1196=0,$1197=0,$1198=0,$1199=0,$_sum10_i_i=0,$1200=0,$1201=0,$_sum11_i_i=0,$1202=0,$1203=0,$1204=0;
 var $1205=0,$1207=0,$1208=0,$1209=0,$1210=0,$1211=0,$1212=0,$1213=0,$1215=0,$_sum27_pre_i_i=0,$_pre_i22_i=0,$_sum30_i_i=0,$1217=0,$1218=0,$1219=0,$1220=0,$1221=0,$_pre_phi_i23_i=0,$F4_0_i_i=0,$1224=0;
 var $_sum28_i_i=0,$1225=0,$1226=0,$_sum29_i_i=0,$1227=0,$1228=0,$1230=0,$1231=0,$1232=0,$1234=0,$1236=0,$1237=0,$1238=0,$1239=0,$1240=0,$1241=0,$1242=0,$1243=0,$1244=0,$1245=0;
 var $1246=0,$1247=0,$1248=0,$1249=0,$1250=0,$1251=0,$1252=0,$1253=0,$1254=0,$1255=0,$1256=0,$1257=0,$I7_0_i_i=0,$1259=0,$_sum12_i24_i=0,$1260=0,$1261=0,$_sum13_i_i=0,$1262=0,$_sum14_i_i=0;
 var $1263=0,$1264=0,$1265=0,$1266=0,$1267=0,$1268=0,$1269=0,$1271=0,$1272=0,$_sum15_i_i=0,$1273=0,$1274=0,$_sum16_i_i=0,$1275=0,$1276=0,$_sum17_i_i=0,$1277=0,$1278=0,$1280=0,$1281=0;
 var $1283=0,$1284=0,$1286=0,$1287=0,$1288=0,$1289=0,$1290=0,$1291=0,$1293=0,$1294=0,$1295=0,$1296=0,$1297=0,$K8_057_i_i=0,$T_056_i_i=0,$1299=0,$1300=0,$1301=0,$1302=0,$1304=0;
 var $1305=0,$1306=0,$_sum24_i_i=0,$1308=0,$1309=0,$_sum25_i_i=0,$1310=0,$1311=0,$_sum26_i_i=0,$1312=0,$1313=0,$T_0_lcssa_i26_i=0,$1315=0,$1316=0,$1317=0,$1318=0,$1319=0,$1320=0,$1321=0,$or_cond_i27_i=0;
 var $1323=0,$_sum21_i_i=0,$1324=0,$1325=0,$_sum22_i_i=0,$1326=0,$1327=0,$_sum23_i_i=0,$1328=0,$1329=0,$_sum1819_i_i=0,$1330=0,$1331=0,$sp_0_i_i_i=0,$1333=0,$1334=0,$1335=0,$1337=0,$1338=0,$1339=0;
 var $1340=0,$1342=0,$1343=0,$_sum_i13_i=0,$_sum1_i14_i=0,$1344=0,$1345=0,$1346=0,$1347=0,$1349=0,$1350=0,$1352=0,$_sum2_i15_i=0,$1353=0,$1354=0,$1355=0,$1356=0,$1357=0,$1358=0,$1359=0;
 var $1360=0,$1361=0,$1362=0,$1363=0,$1364=0,$1366=0,$1367=0,$1368=0,$1369=0,$1370=0,$1371=0,$1372=0,$_sum_i_i_i=0,$1373=0,$1374=0,$_sum2_i_i_i=0,$1375=0,$1376=0,$1377=0,$1378=0;
 var $1379=0,$1380=0,$1381=0,$1382=0,$1383=0,$1384=0,$1385=0,$1386=0,$1387=0,$1388=0,$1389=0,$1391=0,$1392=0,$1393=0,$1394=0,$_sum3_i_i=0,$1395=0,$1396=0,$1397=0,$1398=0;
 var $1399=0,$1400=0,$1401=0,$1402=0,$1403=0,$1405=0,$1406=0,$1407=0,$1408=0,$1409=0,$1410=0,$1411=0,$1413=0,$_sum11_pre_i_i=0,$_pre_i_i=0,$_sum12_i_i=0,$1415=0,$1416=0,$1417=0,$1418=0;
 var $1419=0,$_pre_phi_i_i=0,$F_0_i_i=0,$1422=0,$1423=0,$1424=0,$1426=0,$1427=0,$1428=0,$1430=0,$1432=0,$1433=0,$1434=0,$1435=0,$1436=0,$1437=0,$1438=0,$1439=0,$1440=0,$1441=0;
 var $1442=0,$1443=0,$1444=0,$1445=0,$1446=0,$1447=0,$1448=0,$1449=0,$1450=0,$1451=0,$1452=0,$1453=0,$I1_0_i_i=0,$1455=0,$1456=0,$I1_0_c_i_i=0,$1457=0,$1458=0,$1459=0,$1460=0;
 var $1461=0,$1462=0,$1464=0,$1465=0,$_c_i_i=0,$1466=0,$1467=0,$1469=0,$1470=0,$1472=0,$1473=0,$1475=0,$1476=0,$1477=0,$1478=0,$1479=0,$1480=0,$1482=0,$1483=0,$1484=0;
 var $1485=0,$1486=0,$K2_016_i_i=0,$T_015_i_i=0,$1488=0,$1489=0,$1490=0,$1491=0,$1493=0,$1494=0,$1495=0,$1497=0,$T_0_c8_i_i=0,$1498=0,$1499=0,$T_0_lcssa_i_i=0,$1501=0,$1502=0,$1503=0,$1504=0;
 var $1505=0,$1506=0,$1507=0,$or_cond_i_i=0,$1509=0,$1510=0,$_c7_i_i=0,$1511=0,$T_0_c_i_i=0,$1512=0,$1513=0,$1514=0,$1516=0,$1517=0,$1518=0,$1519=0,$1520=0,$1521=0,$_sum_i34=0,$1522=0;
 var $1523=0,$1524=0,$1525=0,$1526=0,$1527=0,$1528=0,$mem_0=0,label=0;

 $1=($bytes>>>0)<((245)>>>0);
 do {
  if ($1) {
   $3=($bytes>>>0)<((11)>>>0);
   if ($3) {
    $8=16;
   } else {
    $5=((($bytes)+(11))|0);
    $6=$5&-8;
    $8=$6;
   }

   $9=$8>>>3;
   $10=((HEAP32[((17856)>>2)])|0);
   $11=$10>>>($9>>>0);
   $12=$11&3;
   $13=($12|0)==0;
   if (!($13)) {
    $15=$11&1;
    $16=$15^1;
    $17=((($16)+($9))|0);
    $18=$17<<1;
    $19=((17896+($18<<2))|0);
    $20=$19;
    $_sum11=((($18)+(2))|0);
    $21=((17896+($_sum11<<2))|0);
    $22=((HEAP32[(($21)>>2)])|0);
    $23=(($22+8)|0);
    $24=((HEAP32[(($23)>>2)])|0);
    $25=($20|0)==($24|0);
    do {
     if ($25) {
      $27=1<<$17;
      $28=$27^-1;
      $29=$10&$28;
      HEAP32[((17856)>>2)]=$29;
     } else {
      $31=$24;
      $32=((HEAP32[((17872)>>2)])|0);
      $33=($31>>>0)<($32>>>0);
      if ($33) {
       _abort(); return ((0)|0);
       return ((0)|0);
      }
      $35=(($24+12)|0);
      $36=((HEAP32[(($35)>>2)])|0);
      $37=($36|0)==($22|0);
      if ($37) {
       HEAP32[(($35)>>2)]=$20;
       HEAP32[(($21)>>2)]=$24;
       break;
      } else {
       _abort(); return ((0)|0);
       return ((0)|0);
      }
     }
    } while(0);
    $40=$17<<3;
    $41=$40|3;
    $42=(($22+4)|0);
    HEAP32[(($42)>>2)]=$41;
    $43=$22;
    $_sum1314=$40|4;
    $44=(($43+$_sum1314)|0);
    $45=$44;
    $46=((HEAP32[(($45)>>2)])|0);
    $47=$46|1;
    HEAP32[(($45)>>2)]=$47;
    $48=$23;
    $mem_0=$48;

    return (($mem_0)|0);
   }
   $50=((HEAP32[((17864)>>2)])|0);
   $51=($8>>>0)>($50>>>0);
   if (!($51)) {
    $nb_0=$8;
    break;
   }
   $53=($11|0)==0;
   if (!($53)) {
    $55=$11<<$9;
    $56=2<<$9;
    $57=(((-$56))|0);
    $58=$56|$57;
    $59=$55&$58;
    $60=(((-$59))|0);
    $61=$59&$60;
    $62=((($61)-(1))|0);
    $63=$62>>>12;
    $64=$63&16;
    $65=$62>>>($64>>>0);
    $66=$65>>>5;
    $67=$66&8;
    $68=$67|$64;
    $69=$65>>>($67>>>0);
    $70=$69>>>2;
    $71=$70&4;
    $72=$68|$71;
    $73=$69>>>($71>>>0);
    $74=$73>>>1;
    $75=$74&2;
    $76=$72|$75;
    $77=$73>>>($75>>>0);
    $78=$77>>>1;
    $79=$78&1;
    $80=$76|$79;
    $81=$77>>>($79>>>0);
    $82=((($80)+($81))|0);
    $83=$82<<1;
    $84=((17896+($83<<2))|0);
    $85=$84;
    $_sum4=((($83)+(2))|0);
    $86=((17896+($_sum4<<2))|0);
    $87=((HEAP32[(($86)>>2)])|0);
    $88=(($87+8)|0);
    $89=((HEAP32[(($88)>>2)])|0);
    $90=($85|0)==($89|0);
    do {
     if ($90) {
      $92=1<<$82;
      $93=$92^-1;
      $94=$10&$93;
      HEAP32[((17856)>>2)]=$94;
     } else {
      $96=$89;
      $97=((HEAP32[((17872)>>2)])|0);
      $98=($96>>>0)<($97>>>0);
      if ($98) {
       _abort(); return ((0)|0);
       return ((0)|0);
      }
      $100=(($89+12)|0);
      $101=((HEAP32[(($100)>>2)])|0);
      $102=($101|0)==($87|0);
      if ($102) {
       HEAP32[(($100)>>2)]=$85;
       HEAP32[(($86)>>2)]=$89;
       break;
      } else {
       _abort(); return ((0)|0);
       return ((0)|0);
      }
     }
    } while(0);
    $105=$82<<3;
    $106=((($105)-($8))|0);
    $107=$8|3;
    $108=(($87+4)|0);
    HEAP32[(($108)>>2)]=$107;
    $109=$87;
    $110=(($109+$8)|0);
    $111=$110;
    $112=$106|1;
    $_sum67=$8|4;
    $113=(($109+$_sum67)|0);
    $114=$113;
    HEAP32[(($114)>>2)]=$112;
    $115=(($109+$105)|0);
    $116=$115;
    HEAP32[(($116)>>2)]=$106;
    $117=((HEAP32[((17864)>>2)])|0);
    $118=($117|0)==0;
    if (!($118)) {
     $120=((HEAP32[((17876)>>2)])|0);
     $121=$117>>>3;
     $122=$121<<1;
     $123=((17896+($122<<2))|0);
     $124=$123;
     $125=((HEAP32[((17856)>>2)])|0);
     $126=1<<$121;
     $127=$125&$126;
     $128=($127|0)==0;
     do {
      if ($128) {
       $130=$125|$126;
       HEAP32[((17856)>>2)]=$130;
       $_sum9_pre=((($122)+(2))|0);
       $_pre=((17896+($_sum9_pre<<2))|0);
       $F4_0=$124;$_pre_phi=$_pre;
      } else {
       $_sum10=((($122)+(2))|0);
       $132=((17896+($_sum10<<2))|0);
       $133=((HEAP32[(($132)>>2)])|0);
       $134=$133;
       $135=((HEAP32[((17872)>>2)])|0);
       $136=($134>>>0)<($135>>>0);
       if (!($136)) {
        $F4_0=$133;$_pre_phi=$132;
        break;
       }
       _abort(); return ((0)|0);
       return ((0)|0);
      }
     } while(0);


     HEAP32[(($_pre_phi)>>2)]=$120;
     $139=(($F4_0+12)|0);
     HEAP32[(($139)>>2)]=$120;
     $140=(($120+8)|0);
     HEAP32[(($140)>>2)]=$F4_0;
     $141=(($120+12)|0);
     HEAP32[(($141)>>2)]=$124;
    }
    HEAP32[((17864)>>2)]=$106;
    HEAP32[((17876)>>2)]=$111;
    $143=$88;
    $mem_0=$143;

    return (($mem_0)|0);
   }
   $145=((HEAP32[((17860)>>2)])|0);
   $146=($145|0)==0;
   if ($146) {
    $nb_0=$8;
    break;
   }
   $148=(((-$145))|0);
   $149=$145&$148;
   $150=((($149)-(1))|0);
   $151=$150>>>12;
   $152=$151&16;
   $153=$150>>>($152>>>0);
   $154=$153>>>5;
   $155=$154&8;
   $156=$155|$152;
   $157=$153>>>($155>>>0);
   $158=$157>>>2;
   $159=$158&4;
   $160=$156|$159;
   $161=$157>>>($159>>>0);
   $162=$161>>>1;
   $163=$162&2;
   $164=$160|$163;
   $165=$161>>>($163>>>0);
   $166=$165>>>1;
   $167=$166&1;
   $168=$164|$167;
   $169=$165>>>($167>>>0);
   $170=((($168)+($169))|0);
   $171=((18160+($170<<2))|0);
   $172=((HEAP32[(($171)>>2)])|0);
   $173=(($172+4)|0);
   $174=((HEAP32[(($173)>>2)])|0);
   $175=$174&-8;
   $176=((($175)-($8))|0);
   $t_0_i=$172;$v_0_i=$172;$rsize_0_i=$176;
   while(1) {



    $178=(($t_0_i+16)|0);
    $179=((HEAP32[(($178)>>2)])|0);
    $180=($179|0)==0;
    if ($180) {
     $182=(($t_0_i+20)|0);
     $183=((HEAP32[(($182)>>2)])|0);
     $184=($183|0)==0;
     if ($184) {
      break;
     } else {
      $185=$183;
     }
    } else {
     $185=$179;
    }

    $186=(($185+4)|0);
    $187=((HEAP32[(($186)>>2)])|0);
    $188=$187&-8;
    $189=((($188)-($8))|0);
    $190=($189>>>0)<($rsize_0_i>>>0);
    $_rsize_0_i=($190?$189:$rsize_0_i);
    $_v_0_i=($190?$185:$v_0_i);
    $t_0_i=$185;$v_0_i=$_v_0_i;$rsize_0_i=$_rsize_0_i;
   }
   $192=$v_0_i;
   $193=((HEAP32[((17872)>>2)])|0);
   $194=($192>>>0)<($193>>>0);
   if ($194) {
    _abort(); return ((0)|0);
    return ((0)|0);
   }
   $196=(($192+$8)|0);
   $197=$196;
   $198=($192>>>0)<($196>>>0);
   if (!($198)) {
    _abort(); return ((0)|0);
    return ((0)|0);
   }
   $200=(($v_0_i+24)|0);
   $201=((HEAP32[(($200)>>2)])|0);
   $202=(($v_0_i+12)|0);
   $203=((HEAP32[(($202)>>2)])|0);
   $204=($203|0)==($v_0_i|0);
   do {
    if ($204) {
     $220=(($v_0_i+20)|0);
     $221=((HEAP32[(($220)>>2)])|0);
     $222=($221|0)==0;
     if ($222) {
      $224=(($v_0_i+16)|0);
      $225=((HEAP32[(($224)>>2)])|0);
      $226=($225|0)==0;
      if ($226) {
       $R_1_i=0;
       break;
      } else {
       $R_0_i=$225;$RP_0_i=$224;
      }
     } else {
      $R_0_i=$221;$RP_0_i=$220;
     }
     while(1) {


      $227=(($R_0_i+20)|0);
      $228=((HEAP32[(($227)>>2)])|0);
      $229=($228|0)==0;
      if (!($229)) {
       $R_0_i=$228;$RP_0_i=$227;
       continue;
      }
      $231=(($R_0_i+16)|0);
      $232=((HEAP32[(($231)>>2)])|0);
      $233=($232|0)==0;
      if ($233) {
       break;
      } else {
       $R_0_i=$232;$RP_0_i=$231;
      }
     }
     $235=$RP_0_i;
     $236=($235>>>0)<($193>>>0);
     if ($236) {
      _abort(); return ((0)|0);
      return ((0)|0);
     } else {
      HEAP32[(($RP_0_i)>>2)]=0;
      $R_1_i=$R_0_i;
      break;
     }
    } else {
     $206=(($v_0_i+8)|0);
     $207=((HEAP32[(($206)>>2)])|0);
     $208=$207;
     $209=($208>>>0)<($193>>>0);
     if ($209) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $211=(($207+12)|0);
     $212=((HEAP32[(($211)>>2)])|0);
     $213=($212|0)==($v_0_i|0);
     if (!($213)) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $215=(($203+8)|0);
     $216=((HEAP32[(($215)>>2)])|0);
     $217=($216|0)==($v_0_i|0);
     if ($217) {
      HEAP32[(($211)>>2)]=$203;
      HEAP32[(($215)>>2)]=$207;
      $R_1_i=$203;
      break;
     } else {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
    }
   } while(0);

   $240=($201|0)==0;
   L78: do {
    if (!($240)) {
     $242=(($v_0_i+28)|0);
     $243=((HEAP32[(($242)>>2)])|0);
     $244=((18160+($243<<2))|0);
     $245=((HEAP32[(($244)>>2)])|0);
     $246=($v_0_i|0)==($245|0);
     do {
      if ($246) {
       HEAP32[(($244)>>2)]=$R_1_i;
       $cond_i=($R_1_i|0)==0;
       if (!($cond_i)) {
        break;
       }
       $248=((HEAP32[(($242)>>2)])|0);
       $249=1<<$248;
       $250=$249^-1;
       $251=((HEAP32[((17860)>>2)])|0);
       $252=$251&$250;
       HEAP32[((17860)>>2)]=$252;
       break L78;
      } else {
       $254=$201;
       $255=((HEAP32[((17872)>>2)])|0);
       $256=($254>>>0)<($255>>>0);
       if ($256) {
        _abort(); return ((0)|0);
        return ((0)|0);
       }
       $258=(($201+16)|0);
       $259=((HEAP32[(($258)>>2)])|0);
       $260=($259|0)==($v_0_i|0);
       if ($260) {
        HEAP32[(($258)>>2)]=$R_1_i;
       } else {
        $263=(($201+20)|0);
        HEAP32[(($263)>>2)]=$R_1_i;
       }
       $266=($R_1_i|0)==0;
       if ($266) {
        break L78;
       }
      }
     } while(0);
     $268=$R_1_i;
     $269=((HEAP32[((17872)>>2)])|0);
     $270=($268>>>0)<($269>>>0);
     if ($270) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $272=(($R_1_i+24)|0);
     HEAP32[(($272)>>2)]=$201;
     $273=(($v_0_i+16)|0);
     $274=((HEAP32[(($273)>>2)])|0);
     $275=($274|0)==0;
     do {
      if (!($275)) {
       $277=$274;
       $278=((HEAP32[((17872)>>2)])|0);
       $279=($277>>>0)<($278>>>0);
       if ($279) {
        _abort(); return ((0)|0);
        return ((0)|0);
       } else {
        $281=(($R_1_i+16)|0);
        HEAP32[(($281)>>2)]=$274;
        $282=(($274+24)|0);
        HEAP32[(($282)>>2)]=$R_1_i;
        break;
       }
      }
     } while(0);
     $285=(($v_0_i+20)|0);
     $286=((HEAP32[(($285)>>2)])|0);
     $287=($286|0)==0;
     if ($287) {
      break;
     }
     $289=$286;
     $290=((HEAP32[((17872)>>2)])|0);
     $291=($289>>>0)<($290>>>0);
     if ($291) {
      _abort(); return ((0)|0);
      return ((0)|0);
     } else {
      $293=(($R_1_i+20)|0);
      HEAP32[(($293)>>2)]=$286;
      $294=(($286+24)|0);
      HEAP32[(($294)>>2)]=$R_1_i;
      break;
     }
    }
   } while(0);
   $298=($rsize_0_i>>>0)<((16)>>>0);
   if ($298) {
    $300=((($rsize_0_i)+($8))|0);
    $301=$300|3;
    $302=(($v_0_i+4)|0);
    HEAP32[(($302)>>2)]=$301;
    $_sum4_i=((($300)+(4))|0);
    $303=(($192+$_sum4_i)|0);
    $304=$303;
    $305=((HEAP32[(($304)>>2)])|0);
    $306=$305|1;
    HEAP32[(($304)>>2)]=$306;
   } else {
    $308=$8|3;
    $309=(($v_0_i+4)|0);
    HEAP32[(($309)>>2)]=$308;
    $310=$rsize_0_i|1;
    $_sum_i41=$8|4;
    $311=(($192+$_sum_i41)|0);
    $312=$311;
    HEAP32[(($312)>>2)]=$310;
    $_sum1_i=((($rsize_0_i)+($8))|0);
    $313=(($192+$_sum1_i)|0);
    $314=$313;
    HEAP32[(($314)>>2)]=$rsize_0_i;
    $315=((HEAP32[((17864)>>2)])|0);
    $316=($315|0)==0;
    if (!($316)) {
     $318=((HEAP32[((17876)>>2)])|0);
     $319=$315>>>3;
     $320=$319<<1;
     $321=((17896+($320<<2))|0);
     $322=$321;
     $323=((HEAP32[((17856)>>2)])|0);
     $324=1<<$319;
     $325=$323&$324;
     $326=($325|0)==0;
     do {
      if ($326) {
       $328=$323|$324;
       HEAP32[((17856)>>2)]=$328;
       $_sum2_pre_i=((($320)+(2))|0);
       $_pre_i=((17896+($_sum2_pre_i<<2))|0);
       $F1_0_i=$322;$_pre_phi_i=$_pre_i;
      } else {
       $_sum3_i=((($320)+(2))|0);
       $330=((17896+($_sum3_i<<2))|0);
       $331=((HEAP32[(($330)>>2)])|0);
       $332=$331;
       $333=((HEAP32[((17872)>>2)])|0);
       $334=($332>>>0)<($333>>>0);
       if (!($334)) {
        $F1_0_i=$331;$_pre_phi_i=$330;
        break;
       }
       _abort(); return ((0)|0);
       return ((0)|0);
      }
     } while(0);


     HEAP32[(($_pre_phi_i)>>2)]=$318;
     $337=(($F1_0_i+12)|0);
     HEAP32[(($337)>>2)]=$318;
     $338=(($318+8)|0);
     HEAP32[(($338)>>2)]=$F1_0_i;
     $339=(($318+12)|0);
     HEAP32[(($339)>>2)]=$322;
    }
    HEAP32[((17864)>>2)]=$rsize_0_i;
    HEAP32[((17876)>>2)]=$197;
   }
   $342=(($v_0_i+8)|0);
   $343=$342;
   $mem_0=$343;

   return (($mem_0)|0);
  } else {
   $345=($bytes>>>0)>((4294967231)>>>0);
   if ($345) {
    $nb_0=-1;
    break;
   }
   $347=((($bytes)+(11))|0);
   $348=$347&-8;
   $349=((HEAP32[((17860)>>2)])|0);
   $350=($349|0)==0;
   if ($350) {
    $nb_0=$348;
    break;
   }
   $352=(((-$348))|0);
   $353=$347>>>8;
   $354=($353|0)==0;
   do {
    if ($354) {
     $idx_0_i=0;
    } else {
     $356=($348>>>0)>((16777215)>>>0);
     if ($356) {
      $idx_0_i=31;
      break;
     }
     $358=((($353)+(1048320))|0);
     $359=$358>>>16;
     $360=$359&8;
     $361=$353<<$360;
     $362=((($361)+(520192))|0);
     $363=$362>>>16;
     $364=$363&4;
     $365=$364|$360;
     $366=$361<<$364;
     $367=((($366)+(245760))|0);
     $368=$367>>>16;
     $369=$368&2;
     $370=$365|$369;
     $371=(((14)-($370))|0);
     $372=$366<<$369;
     $373=$372>>>15;
     $374=((($371)+($373))|0);
     $375=$374<<1;
     $376=((($374)+(7))|0);
     $377=$348>>>($376>>>0);
     $378=$377&1;
     $379=$378|$375;
     $idx_0_i=$379;
    }
   } while(0);

   $381=((18160+($idx_0_i<<2))|0);
   $382=((HEAP32[(($381)>>2)])|0);
   $383=($382|0)==0;
   L126: do {
    if ($383) {
     $v_2_i=0;$rsize_2_i=$352;$t_1_i=0;
    } else {
     $385=($idx_0_i|0)==31;
     if ($385) {
      $390=0;
     } else {
      $387=$idx_0_i>>>1;
      $388=(((25)-($387))|0);
      $390=$388;
     }

     $391=$348<<$390;
     $v_0_i18=0;$rsize_0_i17=$352;$t_0_i16=$382;$sizebits_0_i=$391;$rst_0_i=0;
     while(1) {





      $393=(($t_0_i16+4)|0);
      $394=((HEAP32[(($393)>>2)])|0);
      $395=$394&-8;
      $396=((($395)-($348))|0);
      $397=($396>>>0)<($rsize_0_i17>>>0);
      if ($397) {
       $399=($395|0)==($348|0);
       if ($399) {
        $v_2_i=$t_0_i16;$rsize_2_i=$396;$t_1_i=$t_0_i16;
        break L126;
       } else {
        $v_1_i=$t_0_i16;$rsize_1_i=$396;
       }
      } else {
       $v_1_i=$v_0_i18;$rsize_1_i=$rsize_0_i17;
      }


      $401=(($t_0_i16+20)|0);
      $402=((HEAP32[(($401)>>2)])|0);
      $403=$sizebits_0_i>>>31;
      $404=(($t_0_i16+16+($403<<2))|0);
      $405=((HEAP32[(($404)>>2)])|0);
      $406=($402|0)==0;
      $407=($402|0)==($405|0);
      $or_cond21_i=$406|$407;
      $rst_1_i=($or_cond21_i?$rst_0_i:$402);
      $408=($405|0)==0;
      $409=$sizebits_0_i<<1;
      if ($408) {
       $v_2_i=$v_1_i;$rsize_2_i=$rsize_1_i;$t_1_i=$rst_1_i;
       break;
      } else {
       $v_0_i18=$v_1_i;$rsize_0_i17=$rsize_1_i;$t_0_i16=$405;$sizebits_0_i=$409;$rst_0_i=$rst_1_i;
      }
     }
    }
   } while(0);



   $410=($t_1_i|0)==0;
   $411=($v_2_i|0)==0;
   $or_cond_i=$410&$411;
   if ($or_cond_i) {
    $413=2<<$idx_0_i;
    $414=(((-$413))|0);
    $415=$413|$414;
    $416=$349&$415;
    $417=($416|0)==0;
    if ($417) {
     $nb_0=$348;
     break;
    }
    $419=(((-$416))|0);
    $420=$416&$419;
    $421=((($420)-(1))|0);
    $422=$421>>>12;
    $423=$422&16;
    $424=$421>>>($423>>>0);
    $425=$424>>>5;
    $426=$425&8;
    $427=$426|$423;
    $428=$424>>>($426>>>0);
    $429=$428>>>2;
    $430=$429&4;
    $431=$427|$430;
    $432=$428>>>($430>>>0);
    $433=$432>>>1;
    $434=$433&2;
    $435=$431|$434;
    $436=$432>>>($434>>>0);
    $437=$436>>>1;
    $438=$437&1;
    $439=$435|$438;
    $440=$436>>>($438>>>0);
    $441=((($439)+($440))|0);
    $442=((18160+($441<<2))|0);
    $443=((HEAP32[(($442)>>2)])|0);
    $t_2_ph_i=$443;
   } else {
    $t_2_ph_i=$t_1_i;
   }

   $444=($t_2_ph_i|0)==0;
   if ($444) {
    $rsize_3_lcssa_i=$rsize_2_i;$v_3_lcssa_i=$v_2_i;
   } else {
    $t_232_i=$t_2_ph_i;$rsize_333_i=$rsize_2_i;$v_334_i=$v_2_i;
    while(1) {



     $445=(($t_232_i+4)|0);
     $446=((HEAP32[(($445)>>2)])|0);
     $447=$446&-8;
     $448=((($447)-($348))|0);
     $449=($448>>>0)<($rsize_333_i>>>0);
     $_rsize_3_i=($449?$448:$rsize_333_i);
     $t_2_v_3_i=($449?$t_232_i:$v_334_i);
     $450=(($t_232_i+16)|0);
     $451=((HEAP32[(($450)>>2)])|0);
     $452=($451|0)==0;
     if (!($452)) {
      $t_232_i=$451;$rsize_333_i=$_rsize_3_i;$v_334_i=$t_2_v_3_i;
      continue;
     }
     $453=(($t_232_i+20)|0);
     $454=((HEAP32[(($453)>>2)])|0);
     $455=($454|0)==0;
     if ($455) {
      $rsize_3_lcssa_i=$_rsize_3_i;$v_3_lcssa_i=$t_2_v_3_i;
      break;
     } else {
      $t_232_i=$454;$rsize_333_i=$_rsize_3_i;$v_334_i=$t_2_v_3_i;
     }
    }
   }


   $456=($v_3_lcssa_i|0)==0;
   if ($456) {
    $nb_0=$348;
    break;
   }
   $458=((HEAP32[((17864)>>2)])|0);
   $459=((($458)-($348))|0);
   $460=($rsize_3_lcssa_i>>>0)<($459>>>0);
   if (!($460)) {
    $nb_0=$348;
    break;
   }
   $462=$v_3_lcssa_i;
   $463=((HEAP32[((17872)>>2)])|0);
   $464=($462>>>0)<($463>>>0);
   if ($464) {
    _abort(); return ((0)|0);
    return ((0)|0);
   }
   $466=(($462+$348)|0);
   $467=$466;
   $468=($462>>>0)<($466>>>0);
   if (!($468)) {
    _abort(); return ((0)|0);
    return ((0)|0);
   }
   $470=(($v_3_lcssa_i+24)|0);
   $471=((HEAP32[(($470)>>2)])|0);
   $472=(($v_3_lcssa_i+12)|0);
   $473=((HEAP32[(($472)>>2)])|0);
   $474=($473|0)==($v_3_lcssa_i|0);
   do {
    if ($474) {
     $490=(($v_3_lcssa_i+20)|0);
     $491=((HEAP32[(($490)>>2)])|0);
     $492=($491|0)==0;
     if ($492) {
      $494=(($v_3_lcssa_i+16)|0);
      $495=((HEAP32[(($494)>>2)])|0);
      $496=($495|0)==0;
      if ($496) {
       $R_1_i22=0;
       break;
      } else {
       $R_0_i20=$495;$RP_0_i19=$494;
      }
     } else {
      $R_0_i20=$491;$RP_0_i19=$490;
     }
     while(1) {


      $497=(($R_0_i20+20)|0);
      $498=((HEAP32[(($497)>>2)])|0);
      $499=($498|0)==0;
      if (!($499)) {
       $R_0_i20=$498;$RP_0_i19=$497;
       continue;
      }
      $501=(($R_0_i20+16)|0);
      $502=((HEAP32[(($501)>>2)])|0);
      $503=($502|0)==0;
      if ($503) {
       break;
      } else {
       $R_0_i20=$502;$RP_0_i19=$501;
      }
     }
     $505=$RP_0_i19;
     $506=($505>>>0)<($463>>>0);
     if ($506) {
      _abort(); return ((0)|0);
      return ((0)|0);
     } else {
      HEAP32[(($RP_0_i19)>>2)]=0;
      $R_1_i22=$R_0_i20;
      break;
     }
    } else {
     $476=(($v_3_lcssa_i+8)|0);
     $477=((HEAP32[(($476)>>2)])|0);
     $478=$477;
     $479=($478>>>0)<($463>>>0);
     if ($479) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $481=(($477+12)|0);
     $482=((HEAP32[(($481)>>2)])|0);
     $483=($482|0)==($v_3_lcssa_i|0);
     if (!($483)) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $485=(($473+8)|0);
     $486=((HEAP32[(($485)>>2)])|0);
     $487=($486|0)==($v_3_lcssa_i|0);
     if ($487) {
      HEAP32[(($481)>>2)]=$473;
      HEAP32[(($485)>>2)]=$477;
      $R_1_i22=$473;
      break;
     } else {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
    }
   } while(0);

   $510=($471|0)==0;
   L176: do {
    if (!($510)) {
     $512=(($v_3_lcssa_i+28)|0);
     $513=((HEAP32[(($512)>>2)])|0);
     $514=((18160+($513<<2))|0);
     $515=((HEAP32[(($514)>>2)])|0);
     $516=($v_3_lcssa_i|0)==($515|0);
     do {
      if ($516) {
       HEAP32[(($514)>>2)]=$R_1_i22;
       $cond_i23=($R_1_i22|0)==0;
       if (!($cond_i23)) {
        break;
       }
       $518=((HEAP32[(($512)>>2)])|0);
       $519=1<<$518;
       $520=$519^-1;
       $521=((HEAP32[((17860)>>2)])|0);
       $522=$521&$520;
       HEAP32[((17860)>>2)]=$522;
       break L176;
      } else {
       $524=$471;
       $525=((HEAP32[((17872)>>2)])|0);
       $526=($524>>>0)<($525>>>0);
       if ($526) {
        _abort(); return ((0)|0);
        return ((0)|0);
       }
       $528=(($471+16)|0);
       $529=((HEAP32[(($528)>>2)])|0);
       $530=($529|0)==($v_3_lcssa_i|0);
       if ($530) {
        HEAP32[(($528)>>2)]=$R_1_i22;
       } else {
        $533=(($471+20)|0);
        HEAP32[(($533)>>2)]=$R_1_i22;
       }
       $536=($R_1_i22|0)==0;
       if ($536) {
        break L176;
       }
      }
     } while(0);
     $538=$R_1_i22;
     $539=((HEAP32[((17872)>>2)])|0);
     $540=($538>>>0)<($539>>>0);
     if ($540) {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
     $542=(($R_1_i22+24)|0);
     HEAP32[(($542)>>2)]=$471;
     $543=(($v_3_lcssa_i+16)|0);
     $544=((HEAP32[(($543)>>2)])|0);
     $545=($544|0)==0;
     do {
      if (!($545)) {
       $547=$544;
       $548=((HEAP32[((17872)>>2)])|0);
       $549=($547>>>0)<($548>>>0);
       if ($549) {
        _abort(); return ((0)|0);
        return ((0)|0);
       } else {
        $551=(($R_1_i22+16)|0);
        HEAP32[(($551)>>2)]=$544;
        $552=(($544+24)|0);
        HEAP32[(($552)>>2)]=$R_1_i22;
        break;
       }
      }
     } while(0);
     $555=(($v_3_lcssa_i+20)|0);
     $556=((HEAP32[(($555)>>2)])|0);
     $557=($556|0)==0;
     if ($557) {
      break;
     }
     $559=$556;
     $560=((HEAP32[((17872)>>2)])|0);
     $561=($559>>>0)<($560>>>0);
     if ($561) {
      _abort(); return ((0)|0);
      return ((0)|0);
     } else {
      $563=(($R_1_i22+20)|0);
      HEAP32[(($563)>>2)]=$556;
      $564=(($556+24)|0);
      HEAP32[(($564)>>2)]=$R_1_i22;
      break;
     }
    }
   } while(0);
   $568=($rsize_3_lcssa_i>>>0)<((16)>>>0);
   L204: do {
    if ($568) {
     $570=((($rsize_3_lcssa_i)+($348))|0);
     $571=$570|3;
     $572=(($v_3_lcssa_i+4)|0);
     HEAP32[(($572)>>2)]=$571;
     $_sum19_i=((($570)+(4))|0);
     $573=(($462+$_sum19_i)|0);
     $574=$573;
     $575=((HEAP32[(($574)>>2)])|0);
     $576=$575|1;
     HEAP32[(($574)>>2)]=$576;
    } else {
     $578=$348|3;
     $579=(($v_3_lcssa_i+4)|0);
     HEAP32[(($579)>>2)]=$578;
     $580=$rsize_3_lcssa_i|1;
     $_sum_i2540=$348|4;
     $581=(($462+$_sum_i2540)|0);
     $582=$581;
     HEAP32[(($582)>>2)]=$580;
     $_sum1_i26=((($rsize_3_lcssa_i)+($348))|0);
     $583=(($462+$_sum1_i26)|0);
     $584=$583;
     HEAP32[(($584)>>2)]=$rsize_3_lcssa_i;
     $585=$rsize_3_lcssa_i>>>3;
     $586=($rsize_3_lcssa_i>>>0)<((256)>>>0);
     if ($586) {
      $588=$585<<1;
      $589=((17896+($588<<2))|0);
      $590=$589;
      $591=((HEAP32[((17856)>>2)])|0);
      $592=1<<$585;
      $593=$591&$592;
      $594=($593|0)==0;
      do {
       if ($594) {
        $596=$591|$592;
        HEAP32[((17856)>>2)]=$596;
        $_sum15_pre_i=((($588)+(2))|0);
        $_pre_i27=((17896+($_sum15_pre_i<<2))|0);
        $F5_0_i=$590;$_pre_phi_i28=$_pre_i27;
       } else {
        $_sum18_i=((($588)+(2))|0);
        $598=((17896+($_sum18_i<<2))|0);
        $599=((HEAP32[(($598)>>2)])|0);
        $600=$599;
        $601=((HEAP32[((17872)>>2)])|0);
        $602=($600>>>0)<($601>>>0);
        if (!($602)) {
         $F5_0_i=$599;$_pre_phi_i28=$598;
         break;
        }
        _abort(); return ((0)|0);
        return ((0)|0);
       }
      } while(0);


      HEAP32[(($_pre_phi_i28)>>2)]=$467;
      $605=(($F5_0_i+12)|0);
      HEAP32[(($605)>>2)]=$467;
      $_sum16_i=((($348)+(8))|0);
      $606=(($462+$_sum16_i)|0);
      $607=$606;
      HEAP32[(($607)>>2)]=$F5_0_i;
      $_sum17_i=((($348)+(12))|0);
      $608=(($462+$_sum17_i)|0);
      $609=$608;
      HEAP32[(($609)>>2)]=$590;
      break;
     }
     $611=$466;
     $612=$rsize_3_lcssa_i>>>8;
     $613=($612|0)==0;
     do {
      if ($613) {
       $I7_0_i=0;
      } else {
       $615=($rsize_3_lcssa_i>>>0)>((16777215)>>>0);
       if ($615) {
        $I7_0_i=31;
        break;
       }
       $617=((($612)+(1048320))|0);
       $618=$617>>>16;
       $619=$618&8;
       $620=$612<<$619;
       $621=((($620)+(520192))|0);
       $622=$621>>>16;
       $623=$622&4;
       $624=$623|$619;
       $625=$620<<$623;
       $626=((($625)+(245760))|0);
       $627=$626>>>16;
       $628=$627&2;
       $629=$624|$628;
       $630=(((14)-($629))|0);
       $631=$625<<$628;
       $632=$631>>>15;
       $633=((($630)+($632))|0);
       $634=$633<<1;
       $635=((($633)+(7))|0);
       $636=$rsize_3_lcssa_i>>>($635>>>0);
       $637=$636&1;
       $638=$637|$634;
       $I7_0_i=$638;
      }
     } while(0);

     $640=((18160+($I7_0_i<<2))|0);
     $_sum2_i=((($348)+(28))|0);
     $641=(($462+$_sum2_i)|0);
     $642=$641;
     HEAP32[(($642)>>2)]=$I7_0_i;
     $_sum3_i29=((($348)+(16))|0);
     $643=(($462+$_sum3_i29)|0);
     $_sum4_i30=((($348)+(20))|0);
     $644=(($462+$_sum4_i30)|0);
     $645=$644;
     HEAP32[(($645)>>2)]=0;
     $646=$643;
     HEAP32[(($646)>>2)]=0;
     $647=((HEAP32[((17860)>>2)])|0);
     $648=1<<$I7_0_i;
     $649=$647&$648;
     $650=($649|0)==0;
     if ($650) {
      $652=$647|$648;
      HEAP32[((17860)>>2)]=$652;
      HEAP32[(($640)>>2)]=$611;
      $653=$640;
      $_sum5_i=((($348)+(24))|0);
      $654=(($462+$_sum5_i)|0);
      $655=$654;
      HEAP32[(($655)>>2)]=$653;
      $_sum6_i=((($348)+(12))|0);
      $656=(($462+$_sum6_i)|0);
      $657=$656;
      HEAP32[(($657)>>2)]=$611;
      $_sum7_i=((($348)+(8))|0);
      $658=(($462+$_sum7_i)|0);
      $659=$658;
      HEAP32[(($659)>>2)]=$611;
      break;
     }
     $661=((HEAP32[(($640)>>2)])|0);
     $662=($I7_0_i|0)==31;
     if ($662) {
      $667=0;
     } else {
      $664=$I7_0_i>>>1;
      $665=(((25)-($664))|0);
      $667=$665;
     }

     $668=(($661+4)|0);
     $669=((HEAP32[(($668)>>2)])|0);
     $670=$669&-8;
     $671=($670|0)==($rsize_3_lcssa_i|0);
     L225: do {
      if ($671) {
       $T_0_lcssa_i=$661;
      } else {
       $672=$rsize_3_lcssa_i<<$667;
       $T_028_i=$661;$K12_029_i=$672;
       while(1) {


        $680=$K12_029_i>>>31;
        $681=(($T_028_i+16+($680<<2))|0);
        $682=((HEAP32[(($681)>>2)])|0);
        $683=($682|0)==0;
        if ($683) {
         break;
        }
        $674=$K12_029_i<<1;
        $675=(($682+4)|0);
        $676=((HEAP32[(($675)>>2)])|0);
        $677=$676&-8;
        $678=($677|0)==($rsize_3_lcssa_i|0);
        if ($678) {
         $T_0_lcssa_i=$682;
         break L225;
        } else {
         $T_028_i=$682;$K12_029_i=$674;
        }
       }
       $685=$681;
       $686=((HEAP32[((17872)>>2)])|0);
       $687=($685>>>0)<($686>>>0);
       if ($687) {
        _abort(); return ((0)|0);
        return ((0)|0);
       } else {
        HEAP32[(($681)>>2)]=$611;
        $_sum12_i=((($348)+(24))|0);
        $689=(($462+$_sum12_i)|0);
        $690=$689;
        HEAP32[(($690)>>2)]=$T_028_i;
        $_sum13_i=((($348)+(12))|0);
        $691=(($462+$_sum13_i)|0);
        $692=$691;
        HEAP32[(($692)>>2)]=$611;
        $_sum14_i=((($348)+(8))|0);
        $693=(($462+$_sum14_i)|0);
        $694=$693;
        HEAP32[(($694)>>2)]=$611;
        break L204;
       }
      }
     } while(0);

     $696=(($T_0_lcssa_i+8)|0);
     $697=((HEAP32[(($696)>>2)])|0);
     $698=$T_0_lcssa_i;
     $699=((HEAP32[((17872)>>2)])|0);
     $700=($698>>>0)>=($699>>>0);
     $701=$697;
     $702=($701>>>0)>=($699>>>0);
     $or_cond26_i=$700&$702;
     if ($or_cond26_i) {
      $704=(($697+12)|0);
      HEAP32[(($704)>>2)]=$611;
      HEAP32[(($696)>>2)]=$611;
      $_sum9_i=((($348)+(8))|0);
      $705=(($462+$_sum9_i)|0);
      $706=$705;
      HEAP32[(($706)>>2)]=$697;
      $_sum10_i=((($348)+(12))|0);
      $707=(($462+$_sum10_i)|0);
      $708=$707;
      HEAP32[(($708)>>2)]=$T_0_lcssa_i;
      $_sum11_i=((($348)+(24))|0);
      $709=(($462+$_sum11_i)|0);
      $710=$709;
      HEAP32[(($710)>>2)]=0;
      break;
     } else {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
    }
   } while(0);
   $712=(($v_3_lcssa_i+8)|0);
   $713=$712;
   $mem_0=$713;

   return (($mem_0)|0);
  }
 } while(0);

 $714=((HEAP32[((17864)>>2)])|0);
 $715=($714>>>0)<($nb_0>>>0);
 if (!($715)) {
  $717=((($714)-($nb_0))|0);
  $718=((HEAP32[((17876)>>2)])|0);
  $719=($717>>>0)>((15)>>>0);
  if ($719) {
   $721=$718;
   $722=(($721+$nb_0)|0);
   $723=$722;
   HEAP32[((17876)>>2)]=$723;
   HEAP32[((17864)>>2)]=$717;
   $724=$717|1;
   $_sum2=((($nb_0)+(4))|0);
   $725=(($721+$_sum2)|0);
   $726=$725;
   HEAP32[(($726)>>2)]=$724;
   $727=(($721+$714)|0);
   $728=$727;
   HEAP32[(($728)>>2)]=$717;
   $729=$nb_0|3;
   $730=(($718+4)|0);
   HEAP32[(($730)>>2)]=$729;
  } else {
   HEAP32[((17864)>>2)]=0;
   HEAP32[((17876)>>2)]=0;
   $732=$714|3;
   $733=(($718+4)|0);
   HEAP32[(($733)>>2)]=$732;
   $734=$718;
   $_sum1=((($714)+(4))|0);
   $735=(($734+$_sum1)|0);
   $736=$735;
   $737=((HEAP32[(($736)>>2)])|0);
   $738=$737|1;
   HEAP32[(($736)>>2)]=$738;
  }
  $740=(($718+8)|0);
  $741=$740;
  $mem_0=$741;

  return (($mem_0)|0);
 }
 $743=((HEAP32[((17868)>>2)])|0);
 $744=($743>>>0)>($nb_0>>>0);
 if ($744) {
  $746=((($743)-($nb_0))|0);
  HEAP32[((17868)>>2)]=$746;
  $747=((HEAP32[((17880)>>2)])|0);
  $748=$747;
  $749=(($748+$nb_0)|0);
  $750=$749;
  HEAP32[((17880)>>2)]=$750;
  $751=$746|1;
  $_sum=((($nb_0)+(4))|0);
  $752=(($748+$_sum)|0);
  $753=$752;
  HEAP32[(($753)>>2)]=$751;
  $754=$nb_0|3;
  $755=(($747+4)|0);
  HEAP32[(($755)>>2)]=$754;
  $756=(($747+8)|0);
  $757=$756;
  $mem_0=$757;

  return (($mem_0)|0);
 }
 $759=((HEAP32[((17832)>>2)])|0);
 $760=($759|0)==0;
 do {
  if ($760) {
   $762=((_sysconf(((30)|0)))|0);
   $763=((($762)-(1))|0);
   $764=$763&$762;
   $765=($764|0)==0;
   if ($765) {
    HEAP32[((17840)>>2)]=$762;
    HEAP32[((17836)>>2)]=$762;
    HEAP32[((17844)>>2)]=-1;
    HEAP32[((17848)>>2)]=-1;
    HEAP32[((17852)>>2)]=0;
    HEAP32[((18300)>>2)]=0;
    $767=((_time(((0)|0)))|0);
    $768=$767&-16;
    $769=$768^1431655768;
    HEAP32[((17832)>>2)]=$769;
    break;
   } else {
    _abort(); return ((0)|0);
    return ((0)|0);
   }
  }
 } while(0);
 $771=((($nb_0)+(48))|0);
 $772=((HEAP32[((17840)>>2)])|0);
 $773=((($nb_0)+(47))|0);
 $774=((($772)+($773))|0);
 $775=(((-$772))|0);
 $776=$774&$775;
 $777=($776>>>0)>($nb_0>>>0);
 if (!($777)) {
  $mem_0=0;

  return (($mem_0)|0);
 }
 $779=((HEAP32[((18296)>>2)])|0);
 $780=($779|0)==0;
 do {
  if (!($780)) {
   $782=((HEAP32[((18288)>>2)])|0);
   $783=((($782)+($776))|0);
   $784=($783>>>0)<=($782>>>0);
   $785=($783>>>0)>($779>>>0);
   $or_cond1_i=$784|$785;
   if ($or_cond1_i) {
    $mem_0=0;
   } else {
    break;
   }

   return (($mem_0)|0);
  }
 } while(0);
 $787=((HEAP32[((18300)>>2)])|0);
 $788=$787&4;
 $789=($788|0)==0;
 L266: do {
  if ($789) {
   $791=((HEAP32[((17880)>>2)])|0);
   $792=($791|0)==0;
   L268: do {
    if ($792) {
     label = 181;
    } else {
     $794=$791;
     $sp_0_i_i=18304;
     while(1) {

      $796=(($sp_0_i_i)|0);
      $797=((HEAP32[(($796)>>2)])|0);
      $798=($797>>>0)>($794>>>0);
      if (!($798)) {
       $800=(($sp_0_i_i+4)|0);
       $801=((HEAP32[(($800)>>2)])|0);
       $802=(($797+$801)|0);
       $803=($802>>>0)>($794>>>0);
       if ($803) {
        break;
       }
      }
      $805=(($sp_0_i_i+8)|0);
      $806=((HEAP32[(($805)>>2)])|0);
      $807=($806|0)==0;
      if ($807) {
       label = 181;
       break L268;
      } else {
       $sp_0_i_i=$806;
      }
     }
     $808=($sp_0_i_i|0)==0;
     if ($808) {
      label = 181;
      break;
     }
     $838=((HEAP32[((17868)>>2)])|0);
     $839=((($774)-($838))|0);
     $840=$839&$775;
     $841=($840>>>0)<((2147483647)>>>0);
     if (!($841)) {
      $tsize_03141_i=0;
      break;
     }
     $843=((_sbrk((($840)|0)))|0);
     $844=((HEAP32[(($796)>>2)])|0);
     $845=((HEAP32[(($800)>>2)])|0);
     $846=(($844+$845)|0);
     $847=($843|0)==($846|0);
     if ($847) {
      $br_0_i=$843;$ssize_1_i=$840;
      label = 190;
     } else {
      $ssize_129_i=$840;$br_030_i=$843;
      label = 191;
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $809=((_sbrk(((0)|0)))|0);
     $810=($809|0)==-1;
     if ($810) {
      $tsize_03141_i=0;
      break;
     }
     $812=$809;
     $813=((HEAP32[((17836)>>2)])|0);
     $814=((($813)-(1))|0);
     $815=$814&$812;
     $816=($815|0)==0;
     if ($816) {
      $ssize_0_i=$776;
     } else {
      $818=((($814)+($812))|0);
      $819=(((-$813))|0);
      $820=$818&$819;
      $821=((($776)-($812))|0);
      $822=((($821)+($820))|0);
      $ssize_0_i=$822;
     }

     $824=((HEAP32[((18288)>>2)])|0);
     $825=((($824)+($ssize_0_i))|0);
     $826=($ssize_0_i>>>0)>($nb_0>>>0);
     $827=($ssize_0_i>>>0)<((2147483647)>>>0);
     $or_cond_i31=$826&$827;
     if (!($or_cond_i31)) {
      $tsize_03141_i=0;
      break;
     }
     $829=((HEAP32[((18296)>>2)])|0);
     $830=($829|0)==0;
     if (!($830)) {
      $832=($825>>>0)<=($824>>>0);
      $833=($825>>>0)>($829>>>0);
      $or_cond2_i=$832|$833;
      if ($or_cond2_i) {
       $tsize_03141_i=0;
       break;
      }
     }
     $835=((_sbrk((($ssize_0_i)|0)))|0);
     $836=($835|0)==($809|0);
     if ($836) {
      $br_0_i=$809;$ssize_1_i=$ssize_0_i;
      label = 190;
     } else {
      $ssize_129_i=$ssize_0_i;$br_030_i=$835;
      label = 191;
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {


     $849=($br_0_i|0)==-1;
     if ($849) {
      $tsize_03141_i=$ssize_1_i;
     } else {
      $tsize_244_i=$ssize_1_i;$tbase_245_i=$br_0_i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {


     $850=(((-$ssize_129_i))|0);
     $851=($br_030_i|0)!=-1;
     $852=($ssize_129_i>>>0)<((2147483647)>>>0);
     $or_cond5_i=$851&$852;
     $853=($771>>>0)>($ssize_129_i>>>0);
     $or_cond4_i=$or_cond5_i&$853;
     do {
      if ($or_cond4_i) {
       $855=((HEAP32[((17840)>>2)])|0);
       $856=((($773)-($ssize_129_i))|0);
       $857=((($856)+($855))|0);
       $858=(((-$855))|0);
       $859=$857&$858;
       $860=($859>>>0)<((2147483647)>>>0);
       if (!($860)) {
        $ssize_2_i=$ssize_129_i;
        break;
       }
       $862=((_sbrk((($859)|0)))|0);
       $863=($862|0)==-1;
       if ($863) {
        $866=((_sbrk((($850)|0)))|0);
        $tsize_03141_i=0;
        break L288;
       } else {
        $865=((($859)+($ssize_129_i))|0);
        $ssize_2_i=$865;
        break;
       }
      } else {
       $ssize_2_i=$ssize_129_i;
      }
     } while(0);

     $868=($br_030_i|0)==-1;
     if ($868) {
      $tsize_03141_i=0;
     } else {
      $tsize_244_i=$ssize_2_i;$tbase_245_i=$br_030_i;
      label = 201;
      break L266;
     }
    }
   } while(0);

   $869=((HEAP32[((18300)>>2)])|0);
   $870=$869|4;
   HEAP32[((18300)>>2)]=$870;
   $tsize_1_i=$tsize_03141_i;
   label = 198;
  } else {
   $tsize_1_i=0;
   label = 198;
  }
 } while(0);
 do {
  if ((label|0) == 198) {

   $872=($776>>>0)<((2147483647)>>>0);
   if (!($872)) {
    break;
   }
   $874=((_sbrk((($776)|0)))|0);
   $875=((_sbrk(((0)|0)))|0);
   $876=($874|0)!=-1;
   $877=($875|0)!=-1;
   $or_cond3_i=$876&$877;
   $878=($874>>>0)<($875>>>0);
   $or_cond6_i=$or_cond3_i&$878;
   if (!($or_cond6_i)) {
    break;
   }
   $880=$875;
   $881=$874;
   $882=((($880)-($881))|0);
   $883=((($nb_0)+(40))|0);
   $884=($882>>>0)>($883>>>0);
   $_tsize_1_i=($884?$882:$tsize_1_i);
   if ($884) {
    $tsize_244_i=$_tsize_1_i;$tbase_245_i=$874;
    label = 201;
   }
  }
 } while(0);
 do {
  if ((label|0) == 201) {


   $885=((HEAP32[((18288)>>2)])|0);
   $886=((($885)+($tsize_244_i))|0);
   HEAP32[((18288)>>2)]=$886;
   $887=((HEAP32[((18292)>>2)])|0);
   $888=($886>>>0)>($887>>>0);
   if ($888) {
    HEAP32[((18292)>>2)]=$886;
   }
   $891=((HEAP32[((17880)>>2)])|0);
   $892=($891|0)==0;
   L308: do {
    if ($892) {
     $894=((HEAP32[((17872)>>2)])|0);
     $895=($894|0)==0;
     $896=($tbase_245_i>>>0)<($894>>>0);
     $or_cond8_i=$895|$896;
     if ($or_cond8_i) {
      HEAP32[((17872)>>2)]=$tbase_245_i;
     }
     HEAP32[((18304)>>2)]=$tbase_245_i;
     HEAP32[((18308)>>2)]=$tsize_244_i;
     HEAP32[((18316)>>2)]=0;
     $899=((HEAP32[((17832)>>2)])|0);
     HEAP32[((17892)>>2)]=$899;
     HEAP32[((17888)>>2)]=-1;
     $i_02_i_i=0;
     while(1) {

      $901=$i_02_i_i<<1;
      $902=((17896+($901<<2))|0);
      $903=$902;
      $_sum_i_i=((($901)+(3))|0);
      $904=((17896+($_sum_i_i<<2))|0);
      HEAP32[(($904)>>2)]=$903;
      $_sum1_i_i=((($901)+(2))|0);
      $905=((17896+($_sum1_i_i<<2))|0);
      HEAP32[(($905)>>2)]=$903;
      $906=((($i_02_i_i)+(1))|0);
      $907=($906>>>0)<((32)>>>0);
      if ($907) {
       $i_02_i_i=$906;
      } else {
       break;
      }
     }
     $908=((($tsize_244_i)-(40))|0);
     $909=(($tbase_245_i+8)|0);
     $910=$909;
     $911=$910&7;
     $912=($911|0)==0;
     if ($912) {
      $916=0;
     } else {
      $914=(((-$910))|0);
      $915=$914&7;
      $916=$915;
     }

     $917=(($tbase_245_i+$916)|0);
     $918=$917;
     $919=((($908)-($916))|0);
     HEAP32[((17880)>>2)]=$918;
     HEAP32[((17868)>>2)]=$919;
     $920=$919|1;
     $_sum_i12_i=((($916)+(4))|0);
     $921=(($tbase_245_i+$_sum_i12_i)|0);
     $922=$921;
     HEAP32[(($922)>>2)]=$920;
     $_sum2_i_i=((($tsize_244_i)-(36))|0);
     $923=(($tbase_245_i+$_sum2_i_i)|0);
     $924=$923;
     HEAP32[(($924)>>2)]=40;
     $925=((HEAP32[((17848)>>2)])|0);
     HEAP32[((17884)>>2)]=$925;
    } else {
     $sp_073_i=18304;
     while(1) {

      $926=(($sp_073_i)|0);
      $927=((HEAP32[(($926)>>2)])|0);
      $928=(($sp_073_i+4)|0);
      $929=((HEAP32[(($928)>>2)])|0);
      $930=(($927+$929)|0);
      $931=($tbase_245_i|0)==($930|0);
      if ($931) {
       label = 213;
       break;
      }
      $933=(($sp_073_i+8)|0);
      $934=((HEAP32[(($933)>>2)])|0);
      $935=($934|0)==0;
      if ($935) {
       break;
      } else {
       $sp_073_i=$934;
      }
     }
     do {
      if ((label|0) == 213) {
       $936=(($sp_073_i+12)|0);
       $937=((HEAP32[(($936)>>2)])|0);
       $938=$937&8;
       $939=($938|0)==0;
       if (!($939)) {
        break;
       }
       $941=$891;
       $942=($941>>>0)>=($927>>>0);
       $943=($941>>>0)<($tbase_245_i>>>0);
       $or_cond47_i=$942&$943;
       if (!($or_cond47_i)) {
        break;
       }
       $945=((($929)+($tsize_244_i))|0);
       HEAP32[(($928)>>2)]=$945;
       $946=((HEAP32[((17880)>>2)])|0);
       $947=((HEAP32[((17868)>>2)])|0);
       $948=((($947)+($tsize_244_i))|0);
       $949=$946;
       $950=(($946+8)|0);
       $951=$950;
       $952=$951&7;
       $953=($952|0)==0;
       if ($953) {
        $957=0;
       } else {
        $955=(((-$951))|0);
        $956=$955&7;
        $957=$956;
       }

       $958=(($949+$957)|0);
       $959=$958;
       $960=((($948)-($957))|0);
       HEAP32[((17880)>>2)]=$959;
       HEAP32[((17868)>>2)]=$960;
       $961=$960|1;
       $_sum_i16_i=((($957)+(4))|0);
       $962=(($949+$_sum_i16_i)|0);
       $963=$962;
       HEAP32[(($963)>>2)]=$961;
       $_sum2_i17_i=((($948)+(4))|0);
       $964=(($949+$_sum2_i17_i)|0);
       $965=$964;
       HEAP32[(($965)>>2)]=40;
       $966=((HEAP32[((17848)>>2)])|0);
       HEAP32[((17884)>>2)]=$966;
       break L308;
      }
     } while(0);
     $967=((HEAP32[((17872)>>2)])|0);
     $968=($tbase_245_i>>>0)<($967>>>0);
     if ($968) {
      HEAP32[((17872)>>2)]=$tbase_245_i;
     }
     $970=(($tbase_245_i+$tsize_244_i)|0);
     $sp_166_i=18304;
     while(1) {

      $972=(($sp_166_i)|0);
      $973=((HEAP32[(($972)>>2)])|0);
      $974=($973|0)==($970|0);
      if ($974) {
       label = 223;
       break;
      }
      $976=(($sp_166_i+8)|0);
      $977=((HEAP32[(($976)>>2)])|0);
      $978=($977|0)==0;
      if ($978) {
       break;
      } else {
       $sp_166_i=$977;
      }
     }
     do {
      if ((label|0) == 223) {
       $979=(($sp_166_i+12)|0);
       $980=((HEAP32[(($979)>>2)])|0);
       $981=$980&8;
       $982=($981|0)==0;
       if (!($982)) {
        break;
       }
       HEAP32[(($972)>>2)]=$tbase_245_i;
       $984=(($sp_166_i+4)|0);
       $985=((HEAP32[(($984)>>2)])|0);
       $986=((($985)+($tsize_244_i))|0);
       HEAP32[(($984)>>2)]=$986;
       $987=(($tbase_245_i+8)|0);
       $988=$987;
       $989=$988&7;
       $990=($989|0)==0;
       if ($990) {
        $995=0;
       } else {
        $992=(((-$988))|0);
        $993=$992&7;
        $995=$993;
       }

       $996=(($tbase_245_i+$995)|0);
       $_sum102_i=((($tsize_244_i)+(8))|0);
       $997=(($tbase_245_i+$_sum102_i)|0);
       $998=$997;
       $999=$998&7;
       $1000=($999|0)==0;
       if ($1000) {
        $1005=0;
       } else {
        $1002=(((-$998))|0);
        $1003=$1002&7;
        $1005=$1003;
       }

       $_sum103_i=((($1005)+($tsize_244_i))|0);
       $1006=(($tbase_245_i+$_sum103_i)|0);
       $1007=$1006;
       $1008=$1006;
       $1009=$996;
       $1010=((($1008)-($1009))|0);
       $_sum_i19_i=((($995)+($nb_0))|0);
       $1011=(($tbase_245_i+$_sum_i19_i)|0);
       $1012=$1011;
       $1013=((($1010)-($nb_0))|0);
       $1014=$nb_0|3;
       $_sum1_i20_i=((($995)+(4))|0);
       $1015=(($tbase_245_i+$_sum1_i20_i)|0);
       $1016=$1015;
       HEAP32[(($1016)>>2)]=$1014;
       $1017=((HEAP32[((17880)>>2)])|0);
       $1018=($1007|0)==($1017|0);
       L345: do {
        if ($1018) {
         $1020=((HEAP32[((17868)>>2)])|0);
         $1021=((($1020)+($1013))|0);
         HEAP32[((17868)>>2)]=$1021;
         HEAP32[((17880)>>2)]=$1012;
         $1022=$1021|1;
         $_sum46_i_i=((($_sum_i19_i)+(4))|0);
         $1023=(($tbase_245_i+$_sum46_i_i)|0);
         $1024=$1023;
         HEAP32[(($1024)>>2)]=$1022;
        } else {
         $1026=((HEAP32[((17876)>>2)])|0);
         $1027=($1007|0)==($1026|0);
         if ($1027) {
          $1029=((HEAP32[((17864)>>2)])|0);
          $1030=((($1029)+($1013))|0);
          HEAP32[((17864)>>2)]=$1030;
          HEAP32[((17876)>>2)]=$1012;
          $1031=$1030|1;
          $_sum44_i_i=((($_sum_i19_i)+(4))|0);
          $1032=(($tbase_245_i+$_sum44_i_i)|0);
          $1033=$1032;
          HEAP32[(($1033)>>2)]=$1031;
          $_sum45_i_i=((($1030)+($_sum_i19_i))|0);
          $1034=(($tbase_245_i+$_sum45_i_i)|0);
          $1035=$1034;
          HEAP32[(($1035)>>2)]=$1030;
          break;
         }
         $_sum2_i21_i=((($tsize_244_i)+(4))|0);
         $_sum104_i=((($_sum2_i21_i)+($1005))|0);
         $1037=(($tbase_245_i+$_sum104_i)|0);
         $1038=$1037;
         $1039=((HEAP32[(($1038)>>2)])|0);
         $1040=$1039&3;
         $1041=($1040|0)==1;
         if ($1041) {
          $1043=$1039&-8;
          $1044=$1039>>>3;
          $1045=($1039>>>0)<((256)>>>0);
          L353: do {
           if ($1045) {
            $_sum3940_i_i=$1005|8;
            $_sum114_i=((($_sum3940_i_i)+($tsize_244_i))|0);
            $1047=(($tbase_245_i+$_sum114_i)|0);
            $1048=$1047;
            $1049=((HEAP32[(($1048)>>2)])|0);
            $_sum41_i_i=((($tsize_244_i)+(12))|0);
            $_sum115_i=((($_sum41_i_i)+($1005))|0);
            $1050=(($tbase_245_i+$_sum115_i)|0);
            $1051=$1050;
            $1052=((HEAP32[(($1051)>>2)])|0);
            $1053=$1044<<1;
            $1054=((17896+($1053<<2))|0);
            $1055=$1054;
            $1056=($1049|0)==($1055|0);
            do {
             if (!($1056)) {
              $1058=$1049;
              $1059=((HEAP32[((17872)>>2)])|0);
              $1060=($1058>>>0)<($1059>>>0);
              if ($1060) {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
              $1062=(($1049+12)|0);
              $1063=((HEAP32[(($1062)>>2)])|0);
              $1064=($1063|0)==($1007|0);
              if ($1064) {
               break;
              }
              _abort(); return ((0)|0);
              return ((0)|0);
             }
            } while(0);
            $1065=($1052|0)==($1049|0);
            if ($1065) {
             $1067=1<<$1044;
             $1068=$1067^-1;
             $1069=((HEAP32[((17856)>>2)])|0);
             $1070=$1069&$1068;
             HEAP32[((17856)>>2)]=$1070;
             break;
            }
            $1072=($1052|0)==($1055|0);
            do {
             if ($1072) {
              $_pre62_i_i=(($1052+8)|0);
              $_pre_phi63_i_i=$_pre62_i_i;
             } else {
              $1074=$1052;
              $1075=((HEAP32[((17872)>>2)])|0);
              $1076=($1074>>>0)<($1075>>>0);
              if ($1076) {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
              $1078=(($1052+8)|0);
              $1079=((HEAP32[(($1078)>>2)])|0);
              $1080=($1079|0)==($1007|0);
              if ($1080) {
               $_pre_phi63_i_i=$1078;
               break;
              }
              _abort(); return ((0)|0);
              return ((0)|0);
             }
            } while(0);

            $1081=(($1049+12)|0);
            HEAP32[(($1081)>>2)]=$1052;
            HEAP32[(($_pre_phi63_i_i)>>2)]=$1049;
           } else {
            $1083=$1006;
            $_sum34_i_i=$1005|24;
            $_sum105_i=((($_sum34_i_i)+($tsize_244_i))|0);
            $1084=(($tbase_245_i+$_sum105_i)|0);
            $1085=$1084;
            $1086=((HEAP32[(($1085)>>2)])|0);
            $_sum5_i_i=((($tsize_244_i)+(12))|0);
            $_sum106_i=((($_sum5_i_i)+($1005))|0);
            $1087=(($tbase_245_i+$_sum106_i)|0);
            $1088=$1087;
            $1089=((HEAP32[(($1088)>>2)])|0);
            $1090=($1089|0)==($1083|0);
            do {
             if ($1090) {
              $_sum67_i_i=$1005|16;
              $_sum112_i=((($_sum2_i21_i)+($_sum67_i_i))|0);
              $1108=(($tbase_245_i+$_sum112_i)|0);
              $1109=$1108;
              $1110=((HEAP32[(($1109)>>2)])|0);
              $1111=($1110|0)==0;
              if ($1111) {
               $_sum113_i=((($_sum67_i_i)+($tsize_244_i))|0);
               $1113=(($tbase_245_i+$_sum113_i)|0);
               $1114=$1113;
               $1115=((HEAP32[(($1114)>>2)])|0);
               $1116=($1115|0)==0;
               if ($1116) {
                $R_1_i_i=0;
                break;
               } else {
                $R_0_i_i=$1115;$RP_0_i_i=$1114;
               }
              } else {
               $R_0_i_i=$1110;$RP_0_i_i=$1109;
              }
              while(1) {


               $1117=(($R_0_i_i+20)|0);
               $1118=((HEAP32[(($1117)>>2)])|0);
               $1119=($1118|0)==0;
               if (!($1119)) {
                $R_0_i_i=$1118;$RP_0_i_i=$1117;
                continue;
               }
               $1121=(($R_0_i_i+16)|0);
               $1122=((HEAP32[(($1121)>>2)])|0);
               $1123=($1122|0)==0;
               if ($1123) {
                break;
               } else {
                $R_0_i_i=$1122;$RP_0_i_i=$1121;
               }
              }
              $1125=$RP_0_i_i;
              $1126=((HEAP32[((17872)>>2)])|0);
              $1127=($1125>>>0)<($1126>>>0);
              if ($1127) {
               _abort(); return ((0)|0);
               return ((0)|0);
              } else {
               HEAP32[(($RP_0_i_i)>>2)]=0;
               $R_1_i_i=$R_0_i_i;
               break;
              }
             } else {
              $_sum3637_i_i=$1005|8;
              $_sum107_i=((($_sum3637_i_i)+($tsize_244_i))|0);
              $1092=(($tbase_245_i+$_sum107_i)|0);
              $1093=$1092;
              $1094=((HEAP32[(($1093)>>2)])|0);
              $1095=$1094;
              $1096=((HEAP32[((17872)>>2)])|0);
              $1097=($1095>>>0)<($1096>>>0);
              if ($1097) {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
              $1099=(($1094+12)|0);
              $1100=((HEAP32[(($1099)>>2)])|0);
              $1101=($1100|0)==($1083|0);
              if (!($1101)) {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
              $1103=(($1089+8)|0);
              $1104=((HEAP32[(($1103)>>2)])|0);
              $1105=($1104|0)==($1083|0);
              if ($1105) {
               HEAP32[(($1099)>>2)]=$1089;
               HEAP32[(($1103)>>2)]=$1094;
               $R_1_i_i=$1089;
               break;
              } else {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
             }
            } while(0);

            $1131=($1086|0)==0;
            if ($1131) {
             break;
            }
            $_sum31_i_i=((($tsize_244_i)+(28))|0);
            $_sum108_i=((($_sum31_i_i)+($1005))|0);
            $1133=(($tbase_245_i+$_sum108_i)|0);
            $1134=$1133;
            $1135=((HEAP32[(($1134)>>2)])|0);
            $1136=((18160+($1135<<2))|0);
            $1137=((HEAP32[(($1136)>>2)])|0);
            $1138=($1083|0)==($1137|0);
            do {
             if ($1138) {
              HEAP32[(($1136)>>2)]=$R_1_i_i;
              $cond_i_i=($R_1_i_i|0)==0;
              if (!($cond_i_i)) {
               break;
              }
              $1140=((HEAP32[(($1134)>>2)])|0);
              $1141=1<<$1140;
              $1142=$1141^-1;
              $1143=((HEAP32[((17860)>>2)])|0);
              $1144=$1143&$1142;
              HEAP32[((17860)>>2)]=$1144;
              break L353;
             } else {
              $1146=$1086;
              $1147=((HEAP32[((17872)>>2)])|0);
              $1148=($1146>>>0)<($1147>>>0);
              if ($1148) {
               _abort(); return ((0)|0);
               return ((0)|0);
              }
              $1150=(($1086+16)|0);
              $1151=((HEAP32[(($1150)>>2)])|0);
              $1152=($1151|0)==($1083|0);
              if ($1152) {
               HEAP32[(($1150)>>2)]=$R_1_i_i;
              } else {
               $1155=(($1086+20)|0);
               HEAP32[(($1155)>>2)]=$R_1_i_i;
              }
              $1158=($R_1_i_i|0)==0;
              if ($1158) {
               break L353;
              }
             }
            } while(0);
            $1160=$R_1_i_i;
            $1161=((HEAP32[((17872)>>2)])|0);
            $1162=($1160>>>0)<($1161>>>0);
            if ($1162) {
             _abort(); return ((0)|0);
             return ((0)|0);
            }
            $1164=(($R_1_i_i+24)|0);
            HEAP32[(($1164)>>2)]=$1086;
            $_sum3233_i_i=$1005|16;
            $_sum109_i=((($_sum3233_i_i)+($tsize_244_i))|0);
            $1165=(($tbase_245_i+$_sum109_i)|0);
            $1166=$1165;
            $1167=((HEAP32[(($1166)>>2)])|0);
            $1168=($1167|0)==0;
            do {
             if (!($1168)) {
              $1170=$1167;
              $1171=((HEAP32[((17872)>>2)])|0);
              $1172=($1170>>>0)<($1171>>>0);
              if ($1172) {
               _abort(); return ((0)|0);
               return ((0)|0);
              } else {
               $1174=(($R_1_i_i+16)|0);
               HEAP32[(($1174)>>2)]=$1167;
               $1175=(($1167+24)|0);
               HEAP32[(($1175)>>2)]=$R_1_i_i;
               break;
              }
             }
            } while(0);
            $_sum110_i=((($_sum2_i21_i)+($_sum3233_i_i))|0);
            $1178=(($tbase_245_i+$_sum110_i)|0);
            $1179=$1178;
            $1180=((HEAP32[(($1179)>>2)])|0);
            $1181=($1180|0)==0;
            if ($1181) {
             break;
            }
            $1183=$1180;
            $1184=((HEAP32[((17872)>>2)])|0);
            $1185=($1183>>>0)<($1184>>>0);
            if ($1185) {
             _abort(); return ((0)|0);
             return ((0)|0);
            } else {
             $1187=(($R_1_i_i+20)|0);
             HEAP32[(($1187)>>2)]=$1180;
             $1188=(($1180+24)|0);
             HEAP32[(($1188)>>2)]=$R_1_i_i;
             break;
            }
           }
          } while(0);
          $_sum9_i_i=$1043|$1005;
          $_sum111_i=((($_sum9_i_i)+($tsize_244_i))|0);
          $1192=(($tbase_245_i+$_sum111_i)|0);
          $1193=$1192;
          $1194=((($1043)+($1013))|0);
          $oldfirst_0_i_i=$1193;$qsize_0_i_i=$1194;
         } else {
          $oldfirst_0_i_i=$1007;$qsize_0_i_i=$1013;
         }


         $1196=(($oldfirst_0_i_i+4)|0);
         $1197=((HEAP32[(($1196)>>2)])|0);
         $1198=$1197&-2;
         HEAP32[(($1196)>>2)]=$1198;
         $1199=$qsize_0_i_i|1;
         $_sum10_i_i=((($_sum_i19_i)+(4))|0);
         $1200=(($tbase_245_i+$_sum10_i_i)|0);
         $1201=$1200;
         HEAP32[(($1201)>>2)]=$1199;
         $_sum11_i_i=((($qsize_0_i_i)+($_sum_i19_i))|0);
         $1202=(($tbase_245_i+$_sum11_i_i)|0);
         $1203=$1202;
         HEAP32[(($1203)>>2)]=$qsize_0_i_i;
         $1204=$qsize_0_i_i>>>3;
         $1205=($qsize_0_i_i>>>0)<((256)>>>0);
         if ($1205) {
          $1207=$1204<<1;
          $1208=((17896+($1207<<2))|0);
          $1209=$1208;
          $1210=((HEAP32[((17856)>>2)])|0);
          $1211=1<<$1204;
          $1212=$1210&$1211;
          $1213=($1212|0)==0;
          do {
           if ($1213) {
            $1215=$1210|$1211;
            HEAP32[((17856)>>2)]=$1215;
            $_sum27_pre_i_i=((($1207)+(2))|0);
            $_pre_i22_i=((17896+($_sum27_pre_i_i<<2))|0);
            $F4_0_i_i=$1209;$_pre_phi_i23_i=$_pre_i22_i;
           } else {
            $_sum30_i_i=((($1207)+(2))|0);
            $1217=((17896+($_sum30_i_i<<2))|0);
            $1218=((HEAP32[(($1217)>>2)])|0);
            $1219=$1218;
            $1220=((HEAP32[((17872)>>2)])|0);
            $1221=($1219>>>0)<($1220>>>0);
            if (!($1221)) {
             $F4_0_i_i=$1218;$_pre_phi_i23_i=$1217;
             break;
            }
            _abort(); return ((0)|0);
            return ((0)|0);
           }
          } while(0);


          HEAP32[(($_pre_phi_i23_i)>>2)]=$1012;
          $1224=(($F4_0_i_i+12)|0);
          HEAP32[(($1224)>>2)]=$1012;
          $_sum28_i_i=((($_sum_i19_i)+(8))|0);
          $1225=(($tbase_245_i+$_sum28_i_i)|0);
          $1226=$1225;
          HEAP32[(($1226)>>2)]=$F4_0_i_i;
          $_sum29_i_i=((($_sum_i19_i)+(12))|0);
          $1227=(($tbase_245_i+$_sum29_i_i)|0);
          $1228=$1227;
          HEAP32[(($1228)>>2)]=$1209;
          break;
         }
         $1230=$1011;
         $1231=$qsize_0_i_i>>>8;
         $1232=($1231|0)==0;
         do {
          if ($1232) {
           $I7_0_i_i=0;
          } else {
           $1234=($qsize_0_i_i>>>0)>((16777215)>>>0);
           if ($1234) {
            $I7_0_i_i=31;
            break;
           }
           $1236=((($1231)+(1048320))|0);
           $1237=$1236>>>16;
           $1238=$1237&8;
           $1239=$1231<<$1238;
           $1240=((($1239)+(520192))|0);
           $1241=$1240>>>16;
           $1242=$1241&4;
           $1243=$1242|$1238;
           $1244=$1239<<$1242;
           $1245=((($1244)+(245760))|0);
           $1246=$1245>>>16;
           $1247=$1246&2;
           $1248=$1243|$1247;
           $1249=(((14)-($1248))|0);
           $1250=$1244<<$1247;
           $1251=$1250>>>15;
           $1252=((($1249)+($1251))|0);
           $1253=$1252<<1;
           $1254=((($1252)+(7))|0);
           $1255=$qsize_0_i_i>>>($1254>>>0);
           $1256=$1255&1;
           $1257=$1256|$1253;
           $I7_0_i_i=$1257;
          }
         } while(0);

         $1259=((18160+($I7_0_i_i<<2))|0);
         $_sum12_i24_i=((($_sum_i19_i)+(28))|0);
         $1260=(($tbase_245_i+$_sum12_i24_i)|0);
         $1261=$1260;
         HEAP32[(($1261)>>2)]=$I7_0_i_i;
         $_sum13_i_i=((($_sum_i19_i)+(16))|0);
         $1262=(($tbase_245_i+$_sum13_i_i)|0);
         $_sum14_i_i=((($_sum_i19_i)+(20))|0);
         $1263=(($tbase_245_i+$_sum14_i_i)|0);
         $1264=$1263;
         HEAP32[(($1264)>>2)]=0;
         $1265=$1262;
         HEAP32[(($1265)>>2)]=0;
         $1266=((HEAP32[((17860)>>2)])|0);
         $1267=1<<$I7_0_i_i;
         $1268=$1266&$1267;
         $1269=($1268|0)==0;
         if ($1269) {
          $1271=$1266|$1267;
          HEAP32[((17860)>>2)]=$1271;
          HEAP32[(($1259)>>2)]=$1230;
          $1272=$1259;
          $_sum15_i_i=((($_sum_i19_i)+(24))|0);
          $1273=(($tbase_245_i+$_sum15_i_i)|0);
          $1274=$1273;
          HEAP32[(($1274)>>2)]=$1272;
          $_sum16_i_i=((($_sum_i19_i)+(12))|0);
          $1275=(($tbase_245_i+$_sum16_i_i)|0);
          $1276=$1275;
          HEAP32[(($1276)>>2)]=$1230;
          $_sum17_i_i=((($_sum_i19_i)+(8))|0);
          $1277=(($tbase_245_i+$_sum17_i_i)|0);
          $1278=$1277;
          HEAP32[(($1278)>>2)]=$1230;
          break;
         }
         $1280=((HEAP32[(($1259)>>2)])|0);
         $1281=($I7_0_i_i|0)==31;
         if ($1281) {
          $1286=0;
         } else {
          $1283=$I7_0_i_i>>>1;
          $1284=(((25)-($1283))|0);
          $1286=$1284;
         }

         $1287=(($1280+4)|0);
         $1288=((HEAP32[(($1287)>>2)])|0);
         $1289=$1288&-8;
         $1290=($1289|0)==($qsize_0_i_i|0);
         L442: do {
          if ($1290) {
           $T_0_lcssa_i26_i=$1280;
          } else {
           $1291=$qsize_0_i_i<<$1286;
           $T_056_i_i=$1280;$K8_057_i_i=$1291;
           while(1) {


            $1299=$K8_057_i_i>>>31;
            $1300=(($T_056_i_i+16+($1299<<2))|0);
            $1301=((HEAP32[(($1300)>>2)])|0);
            $1302=($1301|0)==0;
            if ($1302) {
             break;
            }
            $1293=$K8_057_i_i<<1;
            $1294=(($1301+4)|0);
            $1295=((HEAP32[(($1294)>>2)])|0);
            $1296=$1295&-8;
            $1297=($1296|0)==($qsize_0_i_i|0);
            if ($1297) {
             $T_0_lcssa_i26_i=$1301;
             break L442;
            } else {
             $T_056_i_i=$1301;$K8_057_i_i=$1293;
            }
           }
           $1304=$1300;
           $1305=((HEAP32[((17872)>>2)])|0);
           $1306=($1304>>>0)<($1305>>>0);
           if ($1306) {
            _abort(); return ((0)|0);
            return ((0)|0);
           } else {
            HEAP32[(($1300)>>2)]=$1230;
            $_sum24_i_i=((($_sum_i19_i)+(24))|0);
            $1308=(($tbase_245_i+$_sum24_i_i)|0);
            $1309=$1308;
            HEAP32[(($1309)>>2)]=$T_056_i_i;
            $_sum25_i_i=((($_sum_i19_i)+(12))|0);
            $1310=(($tbase_245_i+$_sum25_i_i)|0);
            $1311=$1310;
            HEAP32[(($1311)>>2)]=$1230;
            $_sum26_i_i=((($_sum_i19_i)+(8))|0);
            $1312=(($tbase_245_i+$_sum26_i_i)|0);
            $1313=$1312;
            HEAP32[(($1313)>>2)]=$1230;
            break L345;
           }
          }
         } while(0);

         $1315=(($T_0_lcssa_i26_i+8)|0);
         $1316=((HEAP32[(($1315)>>2)])|0);
         $1317=$T_0_lcssa_i26_i;
         $1318=((HEAP32[((17872)>>2)])|0);
         $1319=($1317>>>0)>=($1318>>>0);
         $1320=$1316;
         $1321=($1320>>>0)>=($1318>>>0);
         $or_cond_i27_i=$1319&$1321;
         if ($or_cond_i27_i) {
          $1323=(($1316+12)|0);
          HEAP32[(($1323)>>2)]=$1230;
          HEAP32[(($1315)>>2)]=$1230;
          $_sum21_i_i=((($_sum_i19_i)+(8))|0);
          $1324=(($tbase_245_i+$_sum21_i_i)|0);
          $1325=$1324;
          HEAP32[(($1325)>>2)]=$1316;
          $_sum22_i_i=((($_sum_i19_i)+(12))|0);
          $1326=(($tbase_245_i+$_sum22_i_i)|0);
          $1327=$1326;
          HEAP32[(($1327)>>2)]=$T_0_lcssa_i26_i;
          $_sum23_i_i=((($_sum_i19_i)+(24))|0);
          $1328=(($tbase_245_i+$_sum23_i_i)|0);
          $1329=$1328;
          HEAP32[(($1329)>>2)]=0;
          break;
         } else {
          _abort(); return ((0)|0);
          return ((0)|0);
         }
        }
       } while(0);
       $_sum1819_i_i=$995|8;
       $1330=(($tbase_245_i+$_sum1819_i_i)|0);
       $mem_0=$1330;

       return (($mem_0)|0);
      }
     } while(0);
     $1331=$891;
     $sp_0_i_i_i=18304;
     while(1) {

      $1333=(($sp_0_i_i_i)|0);
      $1334=((HEAP32[(($1333)>>2)])|0);
      $1335=($1334>>>0)>($1331>>>0);
      if (!($1335)) {
       $1337=(($sp_0_i_i_i+4)|0);
       $1338=((HEAP32[(($1337)>>2)])|0);
       $1339=(($1334+$1338)|0);
       $1340=($1339>>>0)>($1331>>>0);
       if ($1340) {
        break;
       }
      }
      $1342=(($sp_0_i_i_i+8)|0);
      $1343=((HEAP32[(($1342)>>2)])|0);
      $sp_0_i_i_i=$1343;
     }
     $_sum_i13_i=((($1338)-(47))|0);
     $_sum1_i14_i=((($1338)-(39))|0);
     $1344=(($1334+$_sum1_i14_i)|0);
     $1345=$1344;
     $1346=$1345&7;
     $1347=($1346|0)==0;
     if ($1347) {
      $1352=0;
     } else {
      $1349=(((-$1345))|0);
      $1350=$1349&7;
      $1352=$1350;
     }

     $_sum2_i15_i=((($_sum_i13_i)+($1352))|0);
     $1353=(($1334+$_sum2_i15_i)|0);
     $1354=(($891+16)|0);
     $1355=$1354;
     $1356=($1353>>>0)<($1355>>>0);
     $1357=($1356?$1331:$1353);
     $1358=(($1357+8)|0);
     $1359=$1358;
     $1360=((($tsize_244_i)-(40))|0);
     $1361=(($tbase_245_i+8)|0);
     $1362=$1361;
     $1363=$1362&7;
     $1364=($1363|0)==0;
     if ($1364) {
      $1368=0;
     } else {
      $1366=(((-$1362))|0);
      $1367=$1366&7;
      $1368=$1367;
     }

     $1369=(($tbase_245_i+$1368)|0);
     $1370=$1369;
     $1371=((($1360)-($1368))|0);
     HEAP32[((17880)>>2)]=$1370;
     HEAP32[((17868)>>2)]=$1371;
     $1372=$1371|1;
     $_sum_i_i_i=((($1368)+(4))|0);
     $1373=(($tbase_245_i+$_sum_i_i_i)|0);
     $1374=$1373;
     HEAP32[(($1374)>>2)]=$1372;
     $_sum2_i_i_i=((($tsize_244_i)-(36))|0);
     $1375=(($tbase_245_i+$_sum2_i_i_i)|0);
     $1376=$1375;
     HEAP32[(($1376)>>2)]=40;
     $1377=((HEAP32[((17848)>>2)])|0);
     HEAP32[((17884)>>2)]=$1377;
     $1378=(($1357+4)|0);
     $1379=$1378;
     HEAP32[(($1379)>>2)]=27;
     HEAP32[(($1358)>>2)]=((HEAP32[((18304)>>2)])|0);HEAP32[((($1358)+(4))>>2)]=((HEAP32[((18308)>>2)])|0);HEAP32[((($1358)+(8))>>2)]=((HEAP32[((18312)>>2)])|0);HEAP32[((($1358)+(12))>>2)]=((HEAP32[((18316)>>2)])|0);
     HEAP32[((18304)>>2)]=$tbase_245_i;
     HEAP32[((18308)>>2)]=$tsize_244_i;
     HEAP32[((18316)>>2)]=0;
     HEAP32[((18312)>>2)]=$1359;
     $1380=(($1357+28)|0);
     $1381=$1380;
     HEAP32[(($1381)>>2)]=7;
     $1382=(($1357+32)|0);
     $1383=($1382>>>0)<($1339>>>0);
     if ($1383) {
      $1384=$1381;
      while(1) {

       $1385=(($1384+4)|0);
       HEAP32[(($1385)>>2)]=7;
       $1386=(($1384+8)|0);
       $1387=$1386;
       $1388=($1387>>>0)<($1339>>>0);
       if ($1388) {
        $1384=$1385;
       } else {
        break;
       }
      }
     }
     $1389=($1357|0)==($1331|0);
     if ($1389) {
      break;
     }
     $1391=$1357;
     $1392=$891;
     $1393=((($1391)-($1392))|0);
     $1394=(($1331+$1393)|0);
     $_sum3_i_i=((($1393)+(4))|0);
     $1395=(($1331+$_sum3_i_i)|0);
     $1396=$1395;
     $1397=((HEAP32[(($1396)>>2)])|0);
     $1398=$1397&-2;
     HEAP32[(($1396)>>2)]=$1398;
     $1399=$1393|1;
     $1400=(($891+4)|0);
     HEAP32[(($1400)>>2)]=$1399;
     $1401=$1394;
     HEAP32[(($1401)>>2)]=$1393;
     $1402=$1393>>>3;
     $1403=($1393>>>0)<((256)>>>0);
     if ($1403) {
      $1405=$1402<<1;
      $1406=((17896+($1405<<2))|0);
      $1407=$1406;
      $1408=((HEAP32[((17856)>>2)])|0);
      $1409=1<<$1402;
      $1410=$1408&$1409;
      $1411=($1410|0)==0;
      do {
       if ($1411) {
        $1413=$1408|$1409;
        HEAP32[((17856)>>2)]=$1413;
        $_sum11_pre_i_i=((($1405)+(2))|0);
        $_pre_i_i=((17896+($_sum11_pre_i_i<<2))|0);
        $F_0_i_i=$1407;$_pre_phi_i_i=$_pre_i_i;
       } else {
        $_sum12_i_i=((($1405)+(2))|0);
        $1415=((17896+($_sum12_i_i<<2))|0);
        $1416=((HEAP32[(($1415)>>2)])|0);
        $1417=$1416;
        $1418=((HEAP32[((17872)>>2)])|0);
        $1419=($1417>>>0)<($1418>>>0);
        if (!($1419)) {
         $F_0_i_i=$1416;$_pre_phi_i_i=$1415;
         break;
        }
        _abort(); return ((0)|0);
        return ((0)|0);
       }
      } while(0);


      HEAP32[(($_pre_phi_i_i)>>2)]=$891;
      $1422=(($F_0_i_i+12)|0);
      HEAP32[(($1422)>>2)]=$891;
      $1423=(($891+8)|0);
      HEAP32[(($1423)>>2)]=$F_0_i_i;
      $1424=(($891+12)|0);
      HEAP32[(($1424)>>2)]=$1407;
      break;
     }
     $1426=$891;
     $1427=$1393>>>8;
     $1428=($1427|0)==0;
     do {
      if ($1428) {
       $I1_0_i_i=0;
      } else {
       $1430=($1393>>>0)>((16777215)>>>0);
       if ($1430) {
        $I1_0_i_i=31;
        break;
       }
       $1432=((($1427)+(1048320))|0);
       $1433=$1432>>>16;
       $1434=$1433&8;
       $1435=$1427<<$1434;
       $1436=((($1435)+(520192))|0);
       $1437=$1436>>>16;
       $1438=$1437&4;
       $1439=$1438|$1434;
       $1440=$1435<<$1438;
       $1441=((($1440)+(245760))|0);
       $1442=$1441>>>16;
       $1443=$1442&2;
       $1444=$1439|$1443;
       $1445=(((14)-($1444))|0);
       $1446=$1440<<$1443;
       $1447=$1446>>>15;
       $1448=((($1445)+($1447))|0);
       $1449=$1448<<1;
       $1450=((($1448)+(7))|0);
       $1451=$1393>>>($1450>>>0);
       $1452=$1451&1;
       $1453=$1452|$1449;
       $I1_0_i_i=$1453;
      }
     } while(0);

     $1455=((18160+($I1_0_i_i<<2))|0);
     $1456=(($891+28)|0);
     $I1_0_c_i_i=$I1_0_i_i;
     HEAP32[(($1456)>>2)]=$I1_0_c_i_i;
     $1457=(($891+20)|0);
     HEAP32[(($1457)>>2)]=0;
     $1458=(($891+16)|0);
     HEAP32[(($1458)>>2)]=0;
     $1459=((HEAP32[((17860)>>2)])|0);
     $1460=1<<$I1_0_i_i;
     $1461=$1459&$1460;
     $1462=($1461|0)==0;
     if ($1462) {
      $1464=$1459|$1460;
      HEAP32[((17860)>>2)]=$1464;
      HEAP32[(($1455)>>2)]=$1426;
      $1465=(($891+24)|0);
      $_c_i_i=$1455;
      HEAP32[(($1465)>>2)]=$_c_i_i;
      $1466=(($891+12)|0);
      HEAP32[(($1466)>>2)]=$891;
      $1467=(($891+8)|0);
      HEAP32[(($1467)>>2)]=$891;
      break;
     }
     $1469=((HEAP32[(($1455)>>2)])|0);
     $1470=($I1_0_i_i|0)==31;
     if ($1470) {
      $1475=0;
     } else {
      $1472=$I1_0_i_i>>>1;
      $1473=(((25)-($1472))|0);
      $1475=$1473;
     }

     $1476=(($1469+4)|0);
     $1477=((HEAP32[(($1476)>>2)])|0);
     $1478=$1477&-8;
     $1479=($1478|0)==($1393|0);
     L493: do {
      if ($1479) {
       $T_0_lcssa_i_i=$1469;
      } else {
       $1480=$1393<<$1475;
       $T_015_i_i=$1469;$K2_016_i_i=$1480;
       while(1) {


        $1488=$K2_016_i_i>>>31;
        $1489=(($T_015_i_i+16+($1488<<2))|0);
        $1490=((HEAP32[(($1489)>>2)])|0);
        $1491=($1490|0)==0;
        if ($1491) {
         break;
        }
        $1482=$K2_016_i_i<<1;
        $1483=(($1490+4)|0);
        $1484=((HEAP32[(($1483)>>2)])|0);
        $1485=$1484&-8;
        $1486=($1485|0)==($1393|0);
        if ($1486) {
         $T_0_lcssa_i_i=$1490;
         break L493;
        } else {
         $T_015_i_i=$1490;$K2_016_i_i=$1482;
        }
       }
       $1493=$1489;
       $1494=((HEAP32[((17872)>>2)])|0);
       $1495=($1493>>>0)<($1494>>>0);
       if ($1495) {
        _abort(); return ((0)|0);
        return ((0)|0);
       } else {
        HEAP32[(($1489)>>2)]=$1426;
        $1497=(($891+24)|0);
        $T_0_c8_i_i=$T_015_i_i;
        HEAP32[(($1497)>>2)]=$T_0_c8_i_i;
        $1498=(($891+12)|0);
        HEAP32[(($1498)>>2)]=$891;
        $1499=(($891+8)|0);
        HEAP32[(($1499)>>2)]=$891;
        break L308;
       }
      }
     } while(0);

     $1501=(($T_0_lcssa_i_i+8)|0);
     $1502=((HEAP32[(($1501)>>2)])|0);
     $1503=$T_0_lcssa_i_i;
     $1504=((HEAP32[((17872)>>2)])|0);
     $1505=($1503>>>0)>=($1504>>>0);
     $1506=$1502;
     $1507=($1506>>>0)>=($1504>>>0);
     $or_cond_i_i=$1505&$1507;
     if ($or_cond_i_i) {
      $1509=(($1502+12)|0);
      HEAP32[(($1509)>>2)]=$1426;
      HEAP32[(($1501)>>2)]=$1426;
      $1510=(($891+8)|0);
      $_c7_i_i=$1502;
      HEAP32[(($1510)>>2)]=$_c7_i_i;
      $1511=(($891+12)|0);
      $T_0_c_i_i=$T_0_lcssa_i_i;
      HEAP32[(($1511)>>2)]=$T_0_c_i_i;
      $1512=(($891+24)|0);
      HEAP32[(($1512)>>2)]=0;
      break;
     } else {
      _abort(); return ((0)|0);
      return ((0)|0);
     }
    }
   } while(0);
   $1513=((HEAP32[((17868)>>2)])|0);
   $1514=($1513>>>0)>($nb_0>>>0);
   if (!($1514)) {
    break;
   }
   $1516=((($1513)-($nb_0))|0);
   HEAP32[((17868)>>2)]=$1516;
   $1517=((HEAP32[((17880)>>2)])|0);
   $1518=$1517;
   $1519=(($1518+$nb_0)|0);
   $1520=$1519;
   HEAP32[((17880)>>2)]=$1520;
   $1521=$1516|1;
   $_sum_i34=((($nb_0)+(4))|0);
   $1522=(($1518+$_sum_i34)|0);
   $1523=$1522;
   HEAP32[(($1523)>>2)]=$1521;
   $1524=$nb_0|3;
   $1525=(($1517+4)|0);
   HEAP32[(($1525)>>2)]=$1524;
   $1526=(($1517+8)|0);
   $1527=$1526;
   $mem_0=$1527;

   return (($mem_0)|0);
  }
 } while(0);
 $1528=((___errno_location())|0);
 HEAP32[(($1528)>>2)]=12;
 $mem_0=0;

 return (($mem_0)|0);
}


function _free($mem){
 $mem=($mem)|0;
 var $1=0,$3=0,$4=0,$5=0,$6=0,$8=0,$9=0,$10=0,$11=0,$12=0,$14=0,$_sum=0,$15=0,$16=0,$17=0,$18=0,$20=0,$21=0,$22=0,$_sum3=0;
 var $24=0,$25=0,$26=0,$27=0,$29=0,$30=0,$32=0,$33=0,$_sum47=0,$35=0,$36=0,$37=0,$_sum48=0,$38=0,$39=0,$40=0,$41=0,$42=0,$43=0,$44=0;
 var $46=0,$47=0,$49=0,$50=0,$51=0,$52=0,$54=0,$55=0,$56=0,$57=0,$59=0,$_pre82=0,$61=0,$62=0,$64=0,$65=0,$66=0,$_pre_phi83=0,$67=0,$69=0;
 var $_sum37=0,$70=0,$71=0,$72=0,$_sum38=0,$73=0,$74=0,$75=0,$76=0,$_sum44=0,$78=0,$79=0,$80=0,$81=0,$82=0,$84=0,$85=0,$86=0,$88=0,$89=0;
 var $90=0,$_sum40=0,$93=0,$94=0,$95=0,$96=0,$_sum39=0,$98=0,$99=0,$100=0,$101=0,$RP_0=0,$R_0=0,$102=0,$103=0,$104=0,$106=0,$107=0,$108=0,$110=0;
 var $111=0,$R_1=0,$115=0,$_sum41=0,$117=0,$118=0,$119=0,$120=0,$121=0,$122=0,$cond=0,$124=0,$125=0,$126=0,$127=0,$128=0,$130=0,$131=0,$132=0,$134=0;
 var $135=0,$136=0,$139=0,$142=0,$144=0,$145=0,$146=0,$148=0,$_sum42=0,$149=0,$150=0,$151=0,$152=0,$154=0,$155=0,$156=0,$158=0,$159=0,$_sum43=0,$162=0;
 var $163=0,$164=0,$165=0,$167=0,$168=0,$169=0,$171=0,$172=0,$_sum4=0,$176=0,$177=0,$178=0,$179=0,$180=0,$182=0,$183=0,$184=0,$_sum35=0,$185=0,$186=0;
 var $187=0,$psize_0=0,$p_0=0,$189=0,$190=0,$_sum34=0,$192=0,$193=0,$194=0,$195=0,$phitmp=0,$197=0,$198=0,$200=0,$201=0,$203=0,$204=0,$205=0,$206=0,$207=0;
 var $208=0,$211=0,$212=0,$214=0,$215=0,$216=0,$217=0,$218=0,$219=0,$221=0,$222=0,$223=0,$224=0,$226=0,$227=0,$228=0,$_sum2829=0,$229=0,$230=0,$231=0;
 var $232=0,$233=0,$234=0,$235=0,$237=0,$238=0,$239=0,$241=0,$242=0,$243=0,$244=0,$246=0,$247=0,$248=0,$249=0,$251=0,$_pre80=0,$253=0,$254=0,$255=0;
 var $257=0,$258=0,$259=0,$_pre_phi81=0,$260=0,$262=0,$_sum6=0,$263=0,$264=0,$265=0,$_sum78=0,$266=0,$267=0,$268=0,$269=0,$271=0,$272=0,$273=0,$274=0,$275=0;
 var $276=0,$278=0,$279=0,$280=0,$282=0,$283=0,$284=0,$_sum10=0,$287=0,$288=0,$289=0,$290=0,$_sum9=0,$292=0,$293=0,$294=0,$295=0,$RP9_0=0,$R7_0=0,$296=0;
 var $297=0,$298=0,$300=0,$301=0,$302=0,$304=0,$305=0,$306=0,$R7_1=0,$310=0,$_sum21=0,$312=0,$313=0,$314=0,$315=0,$316=0,$317=0,$cond69=0,$319=0,$320=0;
 var $321=0,$322=0,$323=0,$325=0,$326=0,$327=0,$329=0,$330=0,$331=0,$334=0,$337=0,$339=0,$340=0,$341=0,$343=0,$_sum22=0,$344=0,$345=0,$346=0,$347=0;
 var $349=0,$350=0,$351=0,$353=0,$354=0,$_sum23=0,$357=0,$358=0,$359=0,$360=0,$362=0,$363=0,$364=0,$366=0,$367=0,$371=0,$372=0,$373=0,$374=0,$375=0;
 var $376=0,$379=0,$380=0,$381=0,$382=0,$383=0,$psize_1=0,$385=0,$386=0,$388=0,$389=0,$390=0,$391=0,$392=0,$393=0,$394=0,$396=0,$_sum19_pre=0,$_pre=0,$_sum20=0;
 var $398=0,$399=0,$400=0,$401=0,$402=0,$_pre_phi=0,$F16_0=0,$405=0,$406=0,$407=0,$409=0,$410=0,$411=0,$413=0,$415=0,$416=0,$417=0,$418=0,$419=0,$420=0;
 var $421=0,$422=0,$423=0,$424=0,$425=0,$426=0,$427=0,$428=0,$429=0,$430=0,$431=0,$432=0,$433=0,$434=0,$435=0,$436=0,$I18_0=0,$438=0,$439=0,$I18_0_c=0;
 var $440=0,$441=0,$442=0,$443=0,$444=0,$445=0,$447=0,$448=0,$_c=0,$449=0,$450=0,$452=0,$453=0,$455=0,$456=0,$458=0,$459=0,$460=0,$461=0,$462=0;
 var $463=0,$465=0,$466=0,$467=0,$468=0,$469=0,$K19_073=0,$T_072=0,$471=0,$472=0,$473=0,$474=0,$476=0,$477=0,$478=0,$480=0,$T_0_c16=0,$481=0,$482=0,$T_0_lcssa=0;
 var $484=0,$485=0,$486=0,$487=0,$488=0,$489=0,$490=0,$or_cond=0,$492=0,$493=0,$_c15=0,$494=0,$T_0_c=0,$495=0,$497=0,$498=0,$499=0,$sp_0_in_i=0,$sp_0_i=0,$500=0;
 var $501=0,label=0;

 $1=($mem|0)==0;
 if ($1) {
  return;
 }
 $3=((($mem)-(8))|0);
 $4=$3;
 $5=((HEAP32[((17872)>>2)])|0);
 $6=($3>>>0)<($5>>>0);
 if ($6) {
  _abort();

 }
 $8=((($mem)-(4))|0);
 $9=$8;
 $10=((HEAP32[(($9)>>2)])|0);
 $11=$10&3;
 $12=($11|0)==1;
 if ($12) {
  _abort();

 }
 $14=$10&-8;
 $_sum=((($14)-(8))|0);
 $15=(($mem+$_sum)|0);
 $16=$15;
 $17=$10&1;
 $18=($17|0)==0;
 L10: do {
  if ($18) {
   $20=$3;
   $21=((HEAP32[(($20)>>2)])|0);
   $22=($11|0)==0;
   if ($22) {
    return;
   }
   $_sum3=(((-8)-($21))|0);
   $24=(($mem+$_sum3)|0);
   $25=$24;
   $26=((($21)+($14))|0);
   $27=($24>>>0)<($5>>>0);
   if ($27) {
    _abort();

   }
   $29=((HEAP32[((17876)>>2)])|0);
   $30=($25|0)==($29|0);
   if ($30) {
    $_sum4=((($14)-(4))|0);
    $176=(($mem+$_sum4)|0);
    $177=$176;
    $178=((HEAP32[(($177)>>2)])|0);
    $179=$178&3;
    $180=($179|0)==3;
    if (!($180)) {
     $p_0=$25;$psize_0=$26;
     break;
    }
    HEAP32[((17864)>>2)]=$26;
    $182=((HEAP32[(($177)>>2)])|0);
    $183=$182&-2;
    HEAP32[(($177)>>2)]=$183;
    $184=$26|1;
    $_sum35=((($_sum3)+(4))|0);
    $185=(($mem+$_sum35)|0);
    $186=$185;
    HEAP32[(($186)>>2)]=$184;
    $187=$15;
    HEAP32[(($187)>>2)]=$26;
    return;
   }
   $32=$21>>>3;
   $33=($21>>>0)<((256)>>>0);
   if ($33) {
    $_sum47=((($_sum3)+(8))|0);
    $35=(($mem+$_sum47)|0);
    $36=$35;
    $37=((HEAP32[(($36)>>2)])|0);
    $_sum48=((($_sum3)+(12))|0);
    $38=(($mem+$_sum48)|0);
    $39=$38;
    $40=((HEAP32[(($39)>>2)])|0);
    $41=$32<<1;
    $42=((17896+($41<<2))|0);
    $43=$42;
    $44=($37|0)==($43|0);
    do {
     if (!($44)) {
      $46=$37;
      $47=($46>>>0)<($5>>>0);
      if ($47) {
       _abort();

      }
      $49=(($37+12)|0);
      $50=((HEAP32[(($49)>>2)])|0);
      $51=($50|0)==($25|0);
      if ($51) {
       break;
      }
      _abort();

     }
    } while(0);
    $52=($40|0)==($37|0);
    if ($52) {
     $54=1<<$32;
     $55=$54^-1;
     $56=((HEAP32[((17856)>>2)])|0);
     $57=$56&$55;
     HEAP32[((17856)>>2)]=$57;
     $p_0=$25;$psize_0=$26;
     break;
    }
    $59=($40|0)==($43|0);
    do {
     if ($59) {
      $_pre82=(($40+8)|0);
      $_pre_phi83=$_pre82;
     } else {
      $61=$40;
      $62=($61>>>0)<($5>>>0);
      if ($62) {
       _abort();

      }
      $64=(($40+8)|0);
      $65=((HEAP32[(($64)>>2)])|0);
      $66=($65|0)==($25|0);
      if ($66) {
       $_pre_phi83=$64;
       break;
      }
      _abort();

     }
    } while(0);

    $67=(($37+12)|0);
    HEAP32[(($67)>>2)]=$40;
    HEAP32[(($_pre_phi83)>>2)]=$37;
    $p_0=$25;$psize_0=$26;
    break;
   }
   $69=$24;
   $_sum37=((($_sum3)+(24))|0);
   $70=(($mem+$_sum37)|0);
   $71=$70;
   $72=((HEAP32[(($71)>>2)])|0);
   $_sum38=((($_sum3)+(12))|0);
   $73=(($mem+$_sum38)|0);
   $74=$73;
   $75=((HEAP32[(($74)>>2)])|0);
   $76=($75|0)==($69|0);
   do {
    if ($76) {
     $_sum40=((($_sum3)+(20))|0);
     $93=(($mem+$_sum40)|0);
     $94=$93;
     $95=((HEAP32[(($94)>>2)])|0);
     $96=($95|0)==0;
     if ($96) {
      $_sum39=((($_sum3)+(16))|0);
      $98=(($mem+$_sum39)|0);
      $99=$98;
      $100=((HEAP32[(($99)>>2)])|0);
      $101=($100|0)==0;
      if ($101) {
       $R_1=0;
       break;
      } else {
       $R_0=$100;$RP_0=$99;
      }
     } else {
      $R_0=$95;$RP_0=$94;
     }
     while(1) {


      $102=(($R_0+20)|0);
      $103=((HEAP32[(($102)>>2)])|0);
      $104=($103|0)==0;
      if (!($104)) {
       $R_0=$103;$RP_0=$102;
       continue;
      }
      $106=(($R_0+16)|0);
      $107=((HEAP32[(($106)>>2)])|0);
      $108=($107|0)==0;
      if ($108) {
       break;
      } else {
       $R_0=$107;$RP_0=$106;
      }
     }
     $110=$RP_0;
     $111=($110>>>0)<($5>>>0);
     if ($111) {
      _abort();

     } else {
      HEAP32[(($RP_0)>>2)]=0;
      $R_1=$R_0;
      break;
     }
    } else {
     $_sum44=((($_sum3)+(8))|0);
     $78=(($mem+$_sum44)|0);
     $79=$78;
     $80=((HEAP32[(($79)>>2)])|0);
     $81=$80;
     $82=($81>>>0)<($5>>>0);
     if ($82) {
      _abort();

     }
     $84=(($80+12)|0);
     $85=((HEAP32[(($84)>>2)])|0);
     $86=($85|0)==($69|0);
     if (!($86)) {
      _abort();

     }
     $88=(($75+8)|0);
     $89=((HEAP32[(($88)>>2)])|0);
     $90=($89|0)==($69|0);
     if ($90) {
      HEAP32[(($84)>>2)]=$75;
      HEAP32[(($88)>>2)]=$80;
      $R_1=$75;
      break;
     } else {
      _abort();

     }
    }
   } while(0);

   $115=($72|0)==0;
   if ($115) {
    $p_0=$25;$psize_0=$26;
    break;
   }
   $_sum41=((($_sum3)+(28))|0);
   $117=(($mem+$_sum41)|0);
   $118=$117;
   $119=((HEAP32[(($118)>>2)])|0);
   $120=((18160+($119<<2))|0);
   $121=((HEAP32[(($120)>>2)])|0);
   $122=($69|0)==($121|0);
   do {
    if ($122) {
     HEAP32[(($120)>>2)]=$R_1;
     $cond=($R_1|0)==0;
     if (!($cond)) {
      break;
     }
     $124=((HEAP32[(($118)>>2)])|0);
     $125=1<<$124;
     $126=$125^-1;
     $127=((HEAP32[((17860)>>2)])|0);
     $128=$127&$126;
     HEAP32[((17860)>>2)]=$128;
     $p_0=$25;$psize_0=$26;
     break L10;
    } else {
     $130=$72;
     $131=((HEAP32[((17872)>>2)])|0);
     $132=($130>>>0)<($131>>>0);
     if ($132) {
      _abort();

     }
     $134=(($72+16)|0);
     $135=((HEAP32[(($134)>>2)])|0);
     $136=($135|0)==($69|0);
     if ($136) {
      HEAP32[(($134)>>2)]=$R_1;
     } else {
      $139=(($72+20)|0);
      HEAP32[(($139)>>2)]=$R_1;
     }
     $142=($R_1|0)==0;
     if ($142) {
      $p_0=$25;$psize_0=$26;
      break L10;
     }
    }
   } while(0);
   $144=$R_1;
   $145=((HEAP32[((17872)>>2)])|0);
   $146=($144>>>0)<($145>>>0);
   if ($146) {
    _abort();

   }
   $148=(($R_1+24)|0);
   HEAP32[(($148)>>2)]=$72;
   $_sum42=((($_sum3)+(16))|0);
   $149=(($mem+$_sum42)|0);
   $150=$149;
   $151=((HEAP32[(($150)>>2)])|0);
   $152=($151|0)==0;
   do {
    if (!($152)) {
     $154=$151;
     $155=((HEAP32[((17872)>>2)])|0);
     $156=($154>>>0)<($155>>>0);
     if ($156) {
      _abort();

     } else {
      $158=(($R_1+16)|0);
      HEAP32[(($158)>>2)]=$151;
      $159=(($151+24)|0);
      HEAP32[(($159)>>2)]=$R_1;
      break;
     }
    }
   } while(0);
   $_sum43=((($_sum3)+(20))|0);
   $162=(($mem+$_sum43)|0);
   $163=$162;
   $164=((HEAP32[(($163)>>2)])|0);
   $165=($164|0)==0;
   if ($165) {
    $p_0=$25;$psize_0=$26;
    break;
   }
   $167=$164;
   $168=((HEAP32[((17872)>>2)])|0);
   $169=($167>>>0)<($168>>>0);
   if ($169) {
    _abort();

   } else {
    $171=(($R_1+20)|0);
    HEAP32[(($171)>>2)]=$164;
    $172=(($164+24)|0);
    HEAP32[(($172)>>2)]=$R_1;
    $p_0=$25;$psize_0=$26;
    break;
   }
  } else {
   $p_0=$4;$psize_0=$14;
  }
 } while(0);


 $189=$p_0;
 $190=($189>>>0)<($15>>>0);
 if (!($190)) {
  _abort();

 }
 $_sum34=((($14)-(4))|0);
 $192=(($mem+$_sum34)|0);
 $193=$192;
 $194=((HEAP32[(($193)>>2)])|0);
 $195=$194&1;
 $phitmp=($195|0)==0;
 if ($phitmp) {
  _abort();

 }
 $197=$194&2;
 $198=($197|0)==0;
 do {
  if ($198) {
   $200=((HEAP32[((17880)>>2)])|0);
   $201=($16|0)==($200|0);
   if ($201) {
    $203=((HEAP32[((17868)>>2)])|0);
    $204=((($203)+($psize_0))|0);
    HEAP32[((17868)>>2)]=$204;
    HEAP32[((17880)>>2)]=$p_0;
    $205=$204|1;
    $206=(($p_0+4)|0);
    HEAP32[(($206)>>2)]=$205;
    $207=((HEAP32[((17876)>>2)])|0);
    $208=($p_0|0)==($207|0);
    if (!($208)) {
     return;
    }
    HEAP32[((17876)>>2)]=0;
    HEAP32[((17864)>>2)]=0;
    return;
   }
   $211=((HEAP32[((17876)>>2)])|0);
   $212=($16|0)==($211|0);
   if ($212) {
    $214=((HEAP32[((17864)>>2)])|0);
    $215=((($214)+($psize_0))|0);
    HEAP32[((17864)>>2)]=$215;
    HEAP32[((17876)>>2)]=$p_0;
    $216=$215|1;
    $217=(($p_0+4)|0);
    HEAP32[(($217)>>2)]=$216;
    $218=(($189+$215)|0);
    $219=$218;
    HEAP32[(($219)>>2)]=$215;
    return;
   }
   $221=$194&-8;
   $222=((($221)+($psize_0))|0);
   $223=$194>>>3;
   $224=($194>>>0)<((256)>>>0);
   L112: do {
    if ($224) {
     $226=(($mem+$14)|0);
     $227=$226;
     $228=((HEAP32[(($227)>>2)])|0);
     $_sum2829=$14|4;
     $229=(($mem+$_sum2829)|0);
     $230=$229;
     $231=((HEAP32[(($230)>>2)])|0);
     $232=$223<<1;
     $233=((17896+($232<<2))|0);
     $234=$233;
     $235=($228|0)==($234|0);
     do {
      if (!($235)) {
       $237=$228;
       $238=((HEAP32[((17872)>>2)])|0);
       $239=($237>>>0)<($238>>>0);
       if ($239) {
        _abort();

       }
       $241=(($228+12)|0);
       $242=((HEAP32[(($241)>>2)])|0);
       $243=($242|0)==($16|0);
       if ($243) {
        break;
       }
       _abort();

      }
     } while(0);
     $244=($231|0)==($228|0);
     if ($244) {
      $246=1<<$223;
      $247=$246^-1;
      $248=((HEAP32[((17856)>>2)])|0);
      $249=$248&$247;
      HEAP32[((17856)>>2)]=$249;
      break;
     }
     $251=($231|0)==($234|0);
     do {
      if ($251) {
       $_pre80=(($231+8)|0);
       $_pre_phi81=$_pre80;
      } else {
       $253=$231;
       $254=((HEAP32[((17872)>>2)])|0);
       $255=($253>>>0)<($254>>>0);
       if ($255) {
        _abort();

       }
       $257=(($231+8)|0);
       $258=((HEAP32[(($257)>>2)])|0);
       $259=($258|0)==($16|0);
       if ($259) {
        $_pre_phi81=$257;
        break;
       }
       _abort();

      }
     } while(0);

     $260=(($228+12)|0);
     HEAP32[(($260)>>2)]=$231;
     HEAP32[(($_pre_phi81)>>2)]=$228;
    } else {
     $262=$15;
     $_sum6=((($14)+(16))|0);
     $263=(($mem+$_sum6)|0);
     $264=$263;
     $265=((HEAP32[(($264)>>2)])|0);
     $_sum78=$14|4;
     $266=(($mem+$_sum78)|0);
     $267=$266;
     $268=((HEAP32[(($267)>>2)])|0);
     $269=($268|0)==($262|0);
     do {
      if ($269) {
       $_sum10=((($14)+(12))|0);
       $287=(($mem+$_sum10)|0);
       $288=$287;
       $289=((HEAP32[(($288)>>2)])|0);
       $290=($289|0)==0;
       if ($290) {
        $_sum9=((($14)+(8))|0);
        $292=(($mem+$_sum9)|0);
        $293=$292;
        $294=((HEAP32[(($293)>>2)])|0);
        $295=($294|0)==0;
        if ($295) {
         $R7_1=0;
         break;
        } else {
         $R7_0=$294;$RP9_0=$293;
        }
       } else {
        $R7_0=$289;$RP9_0=$288;
       }
       while(1) {


        $296=(($R7_0+20)|0);
        $297=((HEAP32[(($296)>>2)])|0);
        $298=($297|0)==0;
        if (!($298)) {
         $R7_0=$297;$RP9_0=$296;
         continue;
        }
        $300=(($R7_0+16)|0);
        $301=((HEAP32[(($300)>>2)])|0);
        $302=($301|0)==0;
        if ($302) {
         break;
        } else {
         $R7_0=$301;$RP9_0=$300;
        }
       }
       $304=$RP9_0;
       $305=((HEAP32[((17872)>>2)])|0);
       $306=($304>>>0)<($305>>>0);
       if ($306) {
        _abort();

       } else {
        HEAP32[(($RP9_0)>>2)]=0;
        $R7_1=$R7_0;
        break;
       }
      } else {
       $271=(($mem+$14)|0);
       $272=$271;
       $273=((HEAP32[(($272)>>2)])|0);
       $274=$273;
       $275=((HEAP32[((17872)>>2)])|0);
       $276=($274>>>0)<($275>>>0);
       if ($276) {
        _abort();

       }
       $278=(($273+12)|0);
       $279=((HEAP32[(($278)>>2)])|0);
       $280=($279|0)==($262|0);
       if (!($280)) {
        _abort();

       }
       $282=(($268+8)|0);
       $283=((HEAP32[(($282)>>2)])|0);
       $284=($283|0)==($262|0);
       if ($284) {
        HEAP32[(($278)>>2)]=$268;
        HEAP32[(($282)>>2)]=$273;
        $R7_1=$268;
        break;
       } else {
        _abort();

       }
      }
     } while(0);

     $310=($265|0)==0;
     if ($310) {
      break;
     }
     $_sum21=((($14)+(20))|0);
     $312=(($mem+$_sum21)|0);
     $313=$312;
     $314=((HEAP32[(($313)>>2)])|0);
     $315=((18160+($314<<2))|0);
     $316=((HEAP32[(($315)>>2)])|0);
     $317=($262|0)==($316|0);
     do {
      if ($317) {
       HEAP32[(($315)>>2)]=$R7_1;
       $cond69=($R7_1|0)==0;
       if (!($cond69)) {
        break;
       }
       $319=((HEAP32[(($313)>>2)])|0);
       $320=1<<$319;
       $321=$320^-1;
       $322=((HEAP32[((17860)>>2)])|0);
       $323=$322&$321;
       HEAP32[((17860)>>2)]=$323;
       break L112;
      } else {
       $325=$265;
       $326=((HEAP32[((17872)>>2)])|0);
       $327=($325>>>0)<($326>>>0);
       if ($327) {
        _abort();

       }
       $329=(($265+16)|0);
       $330=((HEAP32[(($329)>>2)])|0);
       $331=($330|0)==($262|0);
       if ($331) {
        HEAP32[(($329)>>2)]=$R7_1;
       } else {
        $334=(($265+20)|0);
        HEAP32[(($334)>>2)]=$R7_1;
       }
       $337=($R7_1|0)==0;
       if ($337) {
        break L112;
       }
      }
     } while(0);
     $339=$R7_1;
     $340=((HEAP32[((17872)>>2)])|0);
     $341=($339>>>0)<($340>>>0);
     if ($341) {
      _abort();

     }
     $343=(($R7_1+24)|0);
     HEAP32[(($343)>>2)]=$265;
     $_sum22=((($14)+(8))|0);
     $344=(($mem+$_sum22)|0);
     $345=$344;
     $346=((HEAP32[(($345)>>2)])|0);
     $347=($346|0)==0;
     do {
      if (!($347)) {
       $349=$346;
       $350=((HEAP32[((17872)>>2)])|0);
       $351=($349>>>0)<($350>>>0);
       if ($351) {
        _abort();

       } else {
        $353=(($R7_1+16)|0);
        HEAP32[(($353)>>2)]=$346;
        $354=(($346+24)|0);
        HEAP32[(($354)>>2)]=$R7_1;
        break;
       }
      }
     } while(0);
     $_sum23=((($14)+(12))|0);
     $357=(($mem+$_sum23)|0);
     $358=$357;
     $359=((HEAP32[(($358)>>2)])|0);
     $360=($359|0)==0;
     if ($360) {
      break;
     }
     $362=$359;
     $363=((HEAP32[((17872)>>2)])|0);
     $364=($362>>>0)<($363>>>0);
     if ($364) {
      _abort();

     } else {
      $366=(($R7_1+20)|0);
      HEAP32[(($366)>>2)]=$359;
      $367=(($359+24)|0);
      HEAP32[(($367)>>2)]=$R7_1;
      break;
     }
    }
   } while(0);
   $371=$222|1;
   $372=(($p_0+4)|0);
   HEAP32[(($372)>>2)]=$371;
   $373=(($189+$222)|0);
   $374=$373;
   HEAP32[(($374)>>2)]=$222;
   $375=((HEAP32[((17876)>>2)])|0);
   $376=($p_0|0)==($375|0);
   if (!($376)) {
    $psize_1=$222;
    break;
   }
   HEAP32[((17864)>>2)]=$222;
   return;
  } else {
   $379=$194&-2;
   HEAP32[(($193)>>2)]=$379;
   $380=$psize_0|1;
   $381=(($p_0+4)|0);
   HEAP32[(($381)>>2)]=$380;
   $382=(($189+$psize_0)|0);
   $383=$382;
   HEAP32[(($383)>>2)]=$psize_0;
   $psize_1=$psize_0;
  }
 } while(0);

 $385=$psize_1>>>3;
 $386=($psize_1>>>0)<((256)>>>0);
 if ($386) {
  $388=$385<<1;
  $389=((17896+($388<<2))|0);
  $390=$389;
  $391=((HEAP32[((17856)>>2)])|0);
  $392=1<<$385;
  $393=$391&$392;
  $394=($393|0)==0;
  do {
   if ($394) {
    $396=$391|$392;
    HEAP32[((17856)>>2)]=$396;
    $_sum19_pre=((($388)+(2))|0);
    $_pre=((17896+($_sum19_pre<<2))|0);
    $F16_0=$390;$_pre_phi=$_pre;
   } else {
    $_sum20=((($388)+(2))|0);
    $398=((17896+($_sum20<<2))|0);
    $399=((HEAP32[(($398)>>2)])|0);
    $400=$399;
    $401=((HEAP32[((17872)>>2)])|0);
    $402=($400>>>0)<($401>>>0);
    if (!($402)) {
     $F16_0=$399;$_pre_phi=$398;
     break;
    }
    _abort();

   }
  } while(0);


  HEAP32[(($_pre_phi)>>2)]=$p_0;
  $405=(($F16_0+12)|0);
  HEAP32[(($405)>>2)]=$p_0;
  $406=(($p_0+8)|0);
  HEAP32[(($406)>>2)]=$F16_0;
  $407=(($p_0+12)|0);
  HEAP32[(($407)>>2)]=$390;
  return;
 }
 $409=$p_0;
 $410=$psize_1>>>8;
 $411=($410|0)==0;
 do {
  if ($411) {
   $I18_0=0;
  } else {
   $413=($psize_1>>>0)>((16777215)>>>0);
   if ($413) {
    $I18_0=31;
    break;
   }
   $415=((($410)+(1048320))|0);
   $416=$415>>>16;
   $417=$416&8;
   $418=$410<<$417;
   $419=((($418)+(520192))|0);
   $420=$419>>>16;
   $421=$420&4;
   $422=$421|$417;
   $423=$418<<$421;
   $424=((($423)+(245760))|0);
   $425=$424>>>16;
   $426=$425&2;
   $427=$422|$426;
   $428=(((14)-($427))|0);
   $429=$423<<$426;
   $430=$429>>>15;
   $431=((($428)+($430))|0);
   $432=$431<<1;
   $433=((($431)+(7))|0);
   $434=$psize_1>>>($433>>>0);
   $435=$434&1;
   $436=$435|$432;
   $I18_0=$436;
  }
 } while(0);

 $438=((18160+($I18_0<<2))|0);
 $439=(($p_0+28)|0);
 $I18_0_c=$I18_0;
 HEAP32[(($439)>>2)]=$I18_0_c;
 $440=(($p_0+20)|0);
 HEAP32[(($440)>>2)]=0;
 $441=(($p_0+16)|0);
 HEAP32[(($441)>>2)]=0;
 $442=((HEAP32[((17860)>>2)])|0);
 $443=1<<$I18_0;
 $444=$442&$443;
 $445=($444|0)==0;
 L199: do {
  if ($445) {
   $447=$442|$443;
   HEAP32[((17860)>>2)]=$447;
   HEAP32[(($438)>>2)]=$409;
   $448=(($p_0+24)|0);
   $_c=$438;
   HEAP32[(($448)>>2)]=$_c;
   $449=(($p_0+12)|0);
   HEAP32[(($449)>>2)]=$p_0;
   $450=(($p_0+8)|0);
   HEAP32[(($450)>>2)]=$p_0;
  } else {
   $452=((HEAP32[(($438)>>2)])|0);
   $453=($I18_0|0)==31;
   if ($453) {
    $458=0;
   } else {
    $455=$I18_0>>>1;
    $456=(((25)-($455))|0);
    $458=$456;
   }

   $459=(($452+4)|0);
   $460=((HEAP32[(($459)>>2)])|0);
   $461=$460&-8;
   $462=($461|0)==($psize_1|0);
   L205: do {
    if ($462) {
     $T_0_lcssa=$452;
    } else {
     $463=$psize_1<<$458;
     $T_072=$452;$K19_073=$463;
     while(1) {


      $471=$K19_073>>>31;
      $472=(($T_072+16+($471<<2))|0);
      $473=((HEAP32[(($472)>>2)])|0);
      $474=($473|0)==0;
      if ($474) {
       break;
      }
      $465=$K19_073<<1;
      $466=(($473+4)|0);
      $467=((HEAP32[(($466)>>2)])|0);
      $468=$467&-8;
      $469=($468|0)==($psize_1|0);
      if ($469) {
       $T_0_lcssa=$473;
       break L205;
      } else {
       $T_072=$473;$K19_073=$465;
      }
     }
     $476=$472;
     $477=((HEAP32[((17872)>>2)])|0);
     $478=($476>>>0)<($477>>>0);
     if ($478) {
      _abort();

     } else {
      HEAP32[(($472)>>2)]=$409;
      $480=(($p_0+24)|0);
      $T_0_c16=$T_072;
      HEAP32[(($480)>>2)]=$T_0_c16;
      $481=(($p_0+12)|0);
      HEAP32[(($481)>>2)]=$p_0;
      $482=(($p_0+8)|0);
      HEAP32[(($482)>>2)]=$p_0;
      break L199;
     }
    }
   } while(0);

   $484=(($T_0_lcssa+8)|0);
   $485=((HEAP32[(($484)>>2)])|0);
   $486=$T_0_lcssa;
   $487=((HEAP32[((17872)>>2)])|0);
   $488=($486>>>0)>=($487>>>0);
   $489=$485;
   $490=($489>>>0)>=($487>>>0);
   $or_cond=$488&$490;
   if ($or_cond) {
    $492=(($485+12)|0);
    HEAP32[(($492)>>2)]=$409;
    HEAP32[(($484)>>2)]=$409;
    $493=(($p_0+8)|0);
    $_c15=$485;
    HEAP32[(($493)>>2)]=$_c15;
    $494=(($p_0+12)|0);
    $T_0_c=$T_0_lcssa;
    HEAP32[(($494)>>2)]=$T_0_c;
    $495=(($p_0+24)|0);
    HEAP32[(($495)>>2)]=0;
    break;
   } else {
    _abort();

   }
  }
 } while(0);
 $497=((HEAP32[((17888)>>2)])|0);
 $498=((($497)-(1))|0);
 HEAP32[((17888)>>2)]=$498;
 $499=($498|0)==0;
 if ($499) {
  $sp_0_in_i=18312;
 } else {
  return;
 }
 while(1) {

  $sp_0_i=((HEAP32[(($sp_0_in_i)>>2)])|0);
  $500=($sp_0_i|0)==0;
  $501=(($sp_0_i+8)|0);
  if ($500) {
   break;
  } else {
   $sp_0_in_i=$501;
  }
 }
 HEAP32[((17888)>>2)]=-1;
 return;
}


function _calloc($n_elements,$elem_size){
 $n_elements=($n_elements)|0;
 $elem_size=($elem_size)|0;
 var $1=0,$3=0,$4=0,$5=0,$7=0,$8=0,$_=0,$req_0=0,$10=0,$11=0,$13=0,$14=0,$15=0,$16=0,$17=0,label=0;

 $1=($n_elements|0)==0;
 do {
  if ($1) {
   $req_0=0;
  } else {
   $3=(Math_imul($elem_size,$n_elements)|0);
   $4=$elem_size|$n_elements;
   $5=($4>>>0)>((65535)>>>0);
   if (!($5)) {
    $req_0=$3;
    break;
   }
   $7=(((($3>>>0))/(($n_elements>>>0)))&-1);
   $8=($7|0)==($elem_size|0);
   $_=($8?$3:-1);
   $req_0=$_;
  }
 } while(0);

 $10=((_malloc($req_0))|0);
 $11=($10|0)==0;
 if ($11) {
  return (($10)|0);
 }
 $13=((($10)-(4))|0);
 $14=$13;
 $15=((HEAP32[(($14)>>2)])|0);
 $16=$15&3;
 $17=($16|0)==0;
 if ($17) {
  return (($10)|0);
 }
 _memset((((($10)|0))|0), ((((0)|0))|0), (((($req_0)|0))|0))|0;
 return (($10)|0);
}


function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[(curr)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[(ptr)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[(ptr)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[(dest)]=((HEAP8[(src)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[(dest)]=((HEAP8[(src)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}


// EMSCRIPTEN_END_FUNCS

  
  function dynCall_ii(index,a1) {
    index = index|0;
    a1=a1|0;
    return FUNCTION_TABLE_ii[index&1](a1|0)|0;
  }


  function dynCall_v(index) {
    index = index|0;
    
    FUNCTION_TABLE_v[index&1]();
  }


  function dynCall_iii(index,a1,a2) {
    index = index|0;
    a1=a1|0; a2=a2|0;
    return FUNCTION_TABLE_iii[index&1](a1|0,a2|0)|0;
  }


  function dynCall_vi(index,a1) {
    index = index|0;
    a1=a1|0;
    FUNCTION_TABLE_vi[index&1](a1|0);
  }

function b0(p0) { p0 = p0|0; abort(0); return 0 }
  function b1() { ; abort(1);  }
  function b2(p0,p1) { p0 = p0|0;p1 = p1|0; abort(2); return 0 }
  function b3(p0) { p0 = p0|0; abort(3);  }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_ii = [b0,b0];
  
  var FUNCTION_TABLE_v = [b1,b1];
  
  var FUNCTION_TABLE_iii = [b2,b2];
  
  var FUNCTION_TABLE_vi = [b3,b3];
  

  return { _strlen: _strlen, _free: _free, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _marching_cubes: _marching_cubes, _calloc: _calloc, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, setTempRet1: setTempRet1, setTempRet2: setTempRet2, setTempRet3: setTempRet3, setTempRet4: setTempRet4, setTempRet5: setTempRet5, setTempRet6: setTempRet6, setTempRet7: setTempRet7, setTempRet8: setTempRet8, setTempRet9: setTempRet9, dynCall_ii: dynCall_ii, dynCall_v: dynCall_v, dynCall_iii: dynCall_iii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_ii": invoke_ii, "invoke_v": invoke_v, "invoke_iii": invoke_iii, "invoke_vi": invoke_vi, "_sysconf": _sysconf, "_pwrite": _pwrite, "_sbrk": _sbrk, "_floorf": _floorf, "_clock": _clock, "___setErrNo": ___setErrNo, "_fwrite": _fwrite, "__reallyNegative": __reallyNegative, "__formatString": __formatString, "_send": _send, "_write": _write, "_abort": _abort, "_fprintf": _fprintf, "_floor": _floor, "_printf": _printf, "___errno_location": ___errno_location, "_fflush": _fflush, "_time": _time, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity }, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _marching_cubes = Module["_marching_cubes"] = asm["_marching_cubes"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];

Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };

// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    ensureInitRuntime();

    preMain();

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371

  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}

run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



