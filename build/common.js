/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aaron Trent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ****/
"use strict";
/**
 * Created by novacrazy on 1/18/2015.
 */
var path = require( 'path' );
var ScriptorCommon;
(function(ScriptorCommon) {
    function isAbsolutePath(filepath) {
        if( typeof path.isAbsolute === 'function' ) {
            return path.isAbsolute( filepath );
        }
        else {
            //just a little cheat for older node versions
            return path.normalize( filepath ) === path.resolve( filepath );
        }
    }

    ScriptorCommon.isAbsolutePath = isAbsolutePath;
    function isAbsoluteOrRelative(filepath) {
        return filepath.charAt( 0 ) === '.' || isAbsolutePath( filepath );
    }

    ScriptorCommon.isAbsoluteOrRelative = isAbsoluteOrRelative;
    //Helper function to bind a function to an object AND retain any attached values
    //Also bounds a variable number of arguments to the function, which is neat.
    //The 'to' arguments is in ...args
    function bind(func) {
        var args = [];
        for( var _a = 1; _a < arguments.length; _a++ ) {
            args[_a - 1] = arguments[_a];
        }
        var res = Function.prototype.bind.apply( func, args );
        //This assumes sub-functions can handle their own scopes
        //or are closures that take that into account
        for( var i in func ) {
            if( func.hasOwnProperty( i ) ) {
                res[i] = func[i];
            }
        }
        return res;
    }

    ScriptorCommon.bind = bind;
    function parseDefine(id, deps, factory) {
        //This argument parsing code is taken from amdefine
        if( Array.isArray( id ) ) {
            factory = deps;
            deps = id;
            id = void 0;
        }
        else if( typeof id !== 'string' ) {
            factory = id;
            id = deps = void 0;
        }
        if( deps !== void 0 && !Array.isArray( deps ) ) {
            factory = deps;
            deps = void 0;
        }
        if( deps === void 0 ) {
            deps = ScriptorCommon.default_dependencies;
        }
        else {
            deps = deps.concat( ScriptorCommon.default_dependencies );
        }
        return [id, deps, factory];
    }

    ScriptorCommon.parseDefine = parseDefine;
    function normalizeError(id, type, err) {
        if( err === void 0 ) {
            err = {};
        }
        if( Array.isArray( err.requireModules )
            && !Array.isArray( id )
            && err.requireModules.indexOf( id ) === -1 ) {
            err.requireModules.push( id );
        }
        else {
            err.requireModules = Array.isArray( id ) ? id : [id];
        }
        err.requireType = err.requireType || type;
        err.message = (err.message || '') + ' - ' + id;
        return err;
    }

    ScriptorCommon.normalizeError = normalizeError;
    function removeFromParent(script) {
        var parent = script.parent;
        if( parent !== void 0 && parent !== null ) {
            for( var _i in parent.children ) {
                //Find which child is this._script, delete it and remove the (now undefined) reference
                if( parent.children.hasOwnProperty( _i ) && parent.children[_i] === script ) {
                    delete parent.children[_i];
                    parent.children.splice( _i, 1 );
                    break;
                }
            }
        }
    }

    ScriptorCommon.removeFromParent = removeFromParent;
    function stripBOM(content) {
        // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
        // because the buffer-to-string conversion in `fs.readFileSync()`
        // translates it to FEFF, the UTF-16 BOM.
        if( Buffer.isBuffer( content ) && content.length >= 2
            && (content[0] === 0xFE && content[1] === 0xFF) ) {
            content = content.slice( 2 );
        }
        else if( typeof content === 'string' && content.charCodeAt( 0 ) === 0xFEFF ) {
            content = content.slice( 1 );
        }
        return content;
    }

    ScriptorCommon.stripBOM = stripBOM;
    ScriptorCommon.AMD_Header =
        new Buffer( "if(typeof define !== 'function' && typeof module.define === 'function') {var define = module.define;}" );
    function injectAMD(content, encoding) {
        if( encoding === void 0 ) {
            encoding = 'utf-8';
        }
        if( Buffer.isBuffer( content ) ) {
            return Buffer.concat( [ScriptorCommon.AMD_Header, content] );
        }
        else if( typeof content === 'string' ) {
            return ScriptorCommon.AMD_Header.toString( encoding ) + content;
        }
        else {
            return content;
        }
    }

    ScriptorCommon.injectAMD = injectAMD;
    function injectAMDAndStripBOM(content) {
        return injectAMD( stripBOM( content ) );
    }

    ScriptorCommon.injectAMDAndStripBOM = injectAMDAndStripBOM;
    function shallowCloneObject(obj) {
        var newObj = Object.create( null );
        for( var it in obj ) {
            if( obj.hasOwnProperty( it ) ) {
                newObj[it] = obj[it];
            }
        }
        return newObj;
    }

    ScriptorCommon.shallowCloneObject = shallowCloneObject;
    ScriptorCommon.default_max_recursion = 9;
    //These *could* be changed is someone really wanted to, but there isn't a reason for it
    ScriptorCommon.default_dependencies = ['require', 'exports', 'module', 'imports'];
})( ScriptorCommon || (ScriptorCommon = {}) );
module.exports = ScriptorCommon;
