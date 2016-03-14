'use strict';

/**
 * @ngdoc service
 * @name cubeApp.keyboardService
 * @description
 * # keyboardService
 * Service in the cubeApp.
 */
angular.module('cubeApp')
  .service('keyboardService', function () {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var srv = {
      INACTIVE: 0,
      HELD: 1,
      PRESSED: 2,
      RELEASED: 3
    };

    var codetokeymap = {
      //general
      "3": "cancel",
      "8": "backspace",
      "9": "tab",
      "12": "clear",
      "13": "enter",
      "16": "shift",
      "17": "ctrl",
      "18": "alt",
      "19": "pause",
      "20": "capslock",
      "27": "escape",
      "32": "space",
      "33": "pageup",
      "34": "pagedown",
      "35": "end",
      "36": "home",
      "37": "left",
      "38": "up",
      "39": "right",
      "40": "down",
      "41": "select",
      "42": "printscreen",
      "43": "execute",
      "44": "snapshot",
      "45": "insert",
      "46": "delete",
      "47": "help",
      "91": "leftsuper",
      "92": "rightsuper",
      "145": "scrolllock",
      "186": "semicolon",
      "187": "equal",
      "188": "comma",
      "189": "dash",
      "190": "period",
      "191": "slash",
      "192": "graveaccent",
      "219": "openbracket",
      "220": "backslash",
      "221": "closebracket",
      "222": "apostrophe",

      //0-9
      "48": "zero",
      "49": "one",
      "50": "two",
      "51": "three",
      "52": "four",
      "53": "five",
      "54": "six",
      "55": "seven",
      "56": "eight",
      "57": "nine",

      //numpad
      "96": "numzero",
      "97": "numone",
      "98": "numtwo",
      "99": "numthree",
      "100": "numfour",
      "101": "numfive",
      "102": "numsix",
      "103": "numseven",
      "104": "numeight",
      "105": "numnine",
      "106": "nummultiply",
      "107": "numadd",
      "108": "numenter",
      "109": "numsubtract",
      "110": "numdecimal",
      "111": "numdevide",
      "144": "numlock",

      //function keys
      "112": "f1",
      "113": "f2",
      "114": "f3",
      "115": "f4",
      "116": "f5",
      "117": "f6",
      "118": "f7",
      "119": "f8",
      "120": "f9",
      "121": "f10",
      "122": "f11",
      "123": "f12"
    };
    //a-z and A-Z
    for (var aI = 65; aI <= 90; aI += 1) {
      codetokeymap[aI] = String.fromCharCode(aI + 32);
    }

    var keytocodemap = {};
    for(var code in codetokeymap){
        keytocodemap[codetokeymap[code]] = code;
    }

    var leftStickX;
    var leftStickY;
    var rightStickX;
    var rightStickY;

    var pressed_keys;
    var held_keys;
    var pressed_keys_buffer = [];
    var held_keys_buffer = [];
    var released_keys = [];
    var released_keys_buffer = [];

    var debugText;

    srv.pollInput = function() {
      pressed_keys = pressed_keys_buffer;
      pressed_keys_buffer = [];
      held_keys = held_keys_buffer.slice(0);
      released_keys = released_keys_buffer;
      released_keys_buffer = [];
    }

    function button(n, state) {
        return buttons_state[n] === state;
    }


    Array.prototype.removeIf = function(condition) {
      for (var i = 0; i < this.length; i++) {
        if (condition(this[i])) {
          this.splice(i, 1);
          i--;
        }
      }
      return this;
    };

    Array.prototype.removeItem = function(item) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] === item) {
          this.splice(i, 1);
          i--;
        }
      }
      return this;
    };

    Array.prototype.contains = function(element) {
      return this.indexOf(element) > -1;
    }


    function handleKeyDown(e) {
      
      if(!e){ var e = window.event; }

      switch(e.keyCode) {
        case 37: case 39: case 38:  case 40: // Arrow keys
        case 32: e.preventDefault(); break; // Space
        default: break; // do not block other keys
      }

      var key_name = codetokeymap[e.keyCode];
      if (!held_keys_buffer.contains(key_name)) {
        pressed_keys_buffer.push(key_name);
        held_keys_buffer.push(key_name);
      }
    }

    function handleKeyUp(e) {
      if(!e){ var e = window.event; }
      var key_name = codetokeymap[e.keyCode];
      held_keys_buffer.removeItem(key_name);
      released_keys_buffer.push(key_name);
    }
    
    srv.key = function (key_name, state) {
      
      if (state === srv.PRESSED) {
          return pressed_keys.contains(key_name);
      } else if (state === srv.HELD) {
          return held_keys.contains(key_name);
      } else if (state == srv.RELEASED) {
          return released_keys.contains(key_name);
      }
      return false;
    }

    function init() {
      document.addEventListener('keydown', handleKeyDown, false);
      document.addEventListener('keyup', handleKeyUp, false);
    };
    init();

    return srv;

  });
