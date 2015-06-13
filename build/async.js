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
 * Created by novacrazy on 12/25/2014.
 */
var __extends = this.__extends || function(d, b) {
        for( var p in b ) {
            if( b.hasOwnProperty( p ) ) {
                d[p] = b[p];
            }
        }
        function __() {
            this.constructor = d;
        }

        __.prototype = b.prototype;
        d.prototype = new __();
    };
var fs = require( 'fs' );
var util = require( 'util' );
var assert = require( 'assert' );
var url = require( 'url' );
var path = require( 'path' );
var events = require( 'events' );
var Base = require( './base' );
var Module = require( './Module' );
var Common = require( './common' );
var MapAdapter = require( './map' );
var Promise = require( 'bluebird' );
var _ = require( 'lodash' );
var readFile = Promise.promisify( fs.readFile );
var posix_path = path.posix;
function isThenable(obj) {
    return (obj !== void 0 && obj !== null) && (obj instanceof Promise || typeof obj.then === 'function');
}
function tryPromise(value) {
    if( isThenable( value ) ) {
        return value;
    }
    else {
        return Promise.resolve( value );
    }
}
//Taken from tj/co
function isGenerator(obj) {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}
//Taken from tj/co
function isGeneratorFunction(obj) {
    if( !obj.constructor ) {
        return false;
    }
    else if( 'GeneratorFunction' === obj.constructor.name ||
             'GeneratorFunction' === obj.constructor.displayName ) {
        return true;
    }
    else {
        return isGenerator( obj.constructor.prototype );
    }
}
function makeCoroutine(fn) {
    return Promise.coroutine( fn );
}
function makeEventPromise(emitter, resolve_event, reject_event) {
    return new Promise( function(resolve, reject) {
        var resolve_handler = function(reject_handler) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            emitter.removeListener( reject_event, reject_handler );
            resolve.apply( void 0, args );
        };
        var reject_handler = function(resolve_handler) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            emitter.removeListener( resolve_event, resolve_handler );
            reject.apply( void 0, args );
        };
        emitter.once( resolve_event, resolve_handler.bind( null, reject_handler ) );
        emitter.once( reject_event, reject_handler.bind( null, resolve_handler ) );
    } );
}
var Scriptor;
(function(Scriptor) {
    Scriptor.this_module = module;
    Scriptor.common = Common;
    Scriptor.default_dependencies = Common.default_dependencies;
    Scriptor.default_max_recursion = Common.default_max_recursion;
    Scriptor.default_extensions = {
        '.js':   function(module, filename) {
            return readFile( filename ).then( Common.stripBOM ).then( function(content) {
                module._compile( Common.injectAMD( content, null ).toString( 'utf-8' ), filename );
                return content;
            } );
        },
        '.json': function(module, filename) {
            return readFile( filename ).then( Common.stripBOM ).then( function(content) {
                try {
                    module.exports = JSON.parse( content.toString( 'utf-8' ) );
                }
                catch( err ) {
                    err.message = filename + ': ' + err.message;
                    throw err;
                }
                return content;
            } );
        }
    };
    Scriptor.extensions = {};
    Scriptor.extensions_enabled = false;
    Scriptor.promisifyCache = MapAdapter.createMap();
    Scriptor.scriptCache = MapAdapter.createMap();
    function installCustomExtensions(enable) {
        if( enable === void 0 ) {
            enable = true;
        }
        if( enable ) {
            for( var it in Scriptor.default_extensions ) {
                if( Scriptor.default_extensions.hasOwnProperty( it ) ) {
                    if( !Scriptor.extensions.hasOwnProperty( it ) ) {
                        Scriptor.extensions[it] = Scriptor.default_extensions[it];
                    }
                }
            }
        }
        Scriptor.extensions_enabled = enable;
    }

    Scriptor.installCustomExtensions = installCustomExtensions;
    function disableCustomExtensions() {
        installCustomExtensions( false );
    }

    Scriptor.disableCustomExtensions = disableCustomExtensions;
    function closeCachedScripts(permemant) {
        if( permemant === void 0 ) {
            permemant = true;
        }
        Scriptor.scriptCache.forEach( function(script) {
            script.close( permemant );
        } );
    }

    Scriptor.closeCachedScripts = closeCachedScripts;
    //Basically, ScriptBase is an abstraction to allow better 'multiple' inheritance
    //Since single inheritance is the only thing supported, a mixin has to be put into the chain, rather than,
    //well, mixed in. So ScriptBase just handles the most basic Script functions
    var ScriptBase = (function(_super) {
        __extends( ScriptBase, _super );
        function ScriptBase(parent) {
            _super.call( this );
            this._recursion = 0;
            this._maxRecursion = Scriptor.default_max_recursion;
            this._debounceMaxWait = Common.default_debounceMaxWait;
            this._textMode = false;
            this.imports = {};
            this._script = (new Module.Module( null, parent ));
        }

        Object.defineProperty( ScriptBase.prototype, "watched", {
            get:          function() {
                return this._watcher !== void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        //Wrap it before you tap it.
        //No, but really, it's important to protect against errors in a generic way
        ScriptBase.prototype._callWrapper = function(func, this_arg, args) {
            var _this = this;
            if( this_arg === void 0 ) {
                this_arg = this;
            }
            if( args === void 0 ) {
                args = [];
            }
            //Just in case, always use recursion protection
            if( this._recursion > this._maxRecursion ) {
                return Promise.reject( new RangeError( util.format( 'Script recursion limit reached at %d for script %s',
                    this._recursion, this.filename ) ) );
            }
            else {
                return new Promise( function(resolve, reject) {
                    _this._recursion++;
                    resolve( func.apply( this_arg, args ) );
                } ).catch( SyntaxError, function(e) {
                        _this.unload();
                        return Promise.reject( e );
                    } ).finally( function() {
                        _this._recursion--;
                    } );
            }
        };
        //Abstract method
        ScriptBase.prototype.do_load = function() {
            return Promise.resolve( void 0 );
        };
        Object.defineProperty( ScriptBase.prototype, "id", {
            get:          function() {
                return this._script.id;
            },
            set:          function(value) {
                this._script.id = value;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "children", {
            get:          function() {
                return this._script.children;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "parent", {
            get:          function() {
                return this._script.parent;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "loaded", {
            get:          function() {
                return this._script.loaded;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "filename", {
            //Only allow getting the filename, setting should be done through .load
            get:          function() {
                return this._script.filename;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "manager", {
            get:          function() {
                return null;
            },
            enumerable:   true,
            configurable: true
        } );
        ScriptBase.prototype.isManaged = function() {
            return this.manager !== null && this.manager !== void 0;
        };
        Object.defineProperty( ScriptBase.prototype, "baseUrl", {
            //Based on the RequireJS 'standard' for relative locations
            //For SourceScripts, just set the filename to something relative
            get:          function() {
                return path.dirname( this.filename );
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "maxRecursion", {
            get:          function() {
                return this._maxRecursion;
            },
            set:          function(value) {
                //JSHint doesn't like bitwise operators
                this._maxRecursion = Math.floor( value );
                assert( !isNaN( this._maxRecursion ), 'maxRecursion must be set to a number' );
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "debounceMaxWait", {
            get:          function() {
                return this._debounceMaxWait;
            },
            set:          function(time) {
                this._debounceMaxWait = Math.floor( time );
                assert( !isNaN( this._debounceMaxWait ), 'debounceMaxWait must be set to a number' );
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ScriptBase.prototype, "textMode", {
            get:          function() {
                return this._textMode;
            },
            set:          function(value) {
                this._textMode = !!value;
            },
            enumerable:   true,
            configurable: true
        } );
        ScriptBase.prototype.unload = function() {
            var was_loaded = this.loaded;
            this.emit( 'unload' );
            this._script.loaded = false;
            this._script.exports = {};
            return was_loaded;
        };
        ScriptBase.prototype.reload = function() {
            var _this = this;
            var was_loaded = this.loaded;
            //Force it to reload and recompile the script.
            this._callWrapper( this.do_load ).then( function() {
                //If a Reference depends on this script, then it should be updated when it reloads
                //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
                _this.emit( 'change', 'change', _this.filename );
            } );
            return was_loaded;
        };
        //Abstract method
        ScriptBase.prototype.unwatch = function() {
            return false;
        };
        ScriptBase.prototype.close = function(permanent) {
            if( permanent === void 0 ) {
                permanent = true;
            }
            this.unload();
            this.unwatch();
            this.emit( 'close', permanent );
            if( permanent ) {
                //Remove _script from parent
                Common.removeFromParent( this._script );
                //Remove _script from current object
                return delete this._script;
            }
            else {
                this._script.filename = null;
            }
        };
        ScriptBase.prototype.include = function(filename) {
            throw new Error( 'Cannot include script "' + filename + '"from an unmanaged script' );
        };
        return ScriptBase;
    })( Base.EventPropagator );
    var AMDScript = (function(_super) {
        __extends( AMDScript, _super );
        function AMDScript(parent) {
            _super.call( this, parent );
            this._defineCache = MapAdapter.createMap();
            this._loadCache = MapAdapter.createMap();
            this._config = Common.normalizeConfig( null );
            this._dependencies = [];
            this._init();
        }

        AMDScript.prototype._init = function() {
            var _this = this;
            var require = this._require.bind( this );
            var define = this._define.bind( this );
            require.toUrl = function(filepath) {
                if( filepath === void 0 ) {
                    filepath = _this.filename;
                }
                assert.strictEqual( typeof filepath, 'string', 'require.toUrl takes a string as filepath' );
                if( filepath.charAt( 0 ) === '.' ) {
                    //Use the url.resolve instead of path.resolve, even though they usually do the same thing
                    return url.resolve( _this.baseUrl, filepath );
                }
                else {
                    return filepath;
                }
            };
            require.defined = function(id) {
                return _this._loadCache.has( posix_path.normalize( id ) );
            };
            require.specified = function(id) {
                return _this._defineCache.has( posix_path.normalize( id ) );
            };
            require.undef = function(id) {
                id = posix_path.normalize( id );
                _this._loadCache.delete( id );
                _this._defineCache.delete( id );
                return _this;
            };
            //This is not an anonymous so stack traces make a bit more sense
            require.onError = function onErrorDefault(err) {
                throw err; //default error
            };
            //This is almost exactly like the normal require.resolve, but it's relative to this.baseUrl
            require.resolve = function(id) {
                var relative = path.resolve( _this.baseUrl, id );
                return Module.Module._resolveFilename( relative, _this._script );
            };
            define.require = require;
            define.amd = {
                jQuery: false
            };
            require.define = define;
            this.require = require;
            this.define = define;
        };
        Object.defineProperty( AMDScript.prototype, "pending", {
            get:          function() {
                return this._pending;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( AMDScript.prototype, "loading", {
            get:          function() {
                return this._loading;
            },
            enumerable:   true,
            configurable: true
        } );
        AMDScript.prototype._runFactory = function(id, deps, factory) {
            var _this = this;
            if( id !== void 0 ) {
                this._loadCache.delete( id ); //clear before running. Will remained cleared in the event of error
            }
            if( typeof factory === 'function' ) {
                if( isGeneratorFunction( factory ) ) {
                    factory = makeCoroutine( factory );
                }
                return this._require( deps ).then( function(resolvedDeps) {
                    return factory.apply( _this._script.exports, resolvedDeps );
                } );
            }
            else {
                //On the off chance the function factory is a promise, run it through again if need be
                return tryPromise( factory ).then( function(resolvedFactory) {
                    if( typeof factory === 'function' ) {
                        return _this._runFactory( id, deps, resolvedFactory );
                    }
                    else {
                        return resolvedFactory;
                    }
                } );
            }
        };
        //Implementation, and holy crap is it huge
        AMDScript.prototype._require = function(id, cb, errcb) {
            var _this = this;
            var normalize = path.resolve.bind( null, this.baseUrl );
            var result;
            if( Array.isArray( id ) ) {
                //We know it's an array, so just cast it to one to appease TypeScript
                var ids = id;
                console.log( "requires: [%s]", ids );
                result = Promise.map( ids, function(id) {
                    return _this._require( id );
                } );
            }
            else {
                assert.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );
                console.log( "require: %s", id );
                //Plugins ARE supported, but they have to work like a normal module
                if( id.indexOf( '!' ) !== -1 ) {
                    //modules to be loaded through an AMD loader transform
                    var parts = id.split( '!', 2 );
                    var plugin_resolver;
                    var plugin_id = parts[0];
                    if( plugin_id === 'include' ) {
                        plugin_resolver = Promise.resolve( {
                            normalize: function(id, defaultNormalize) {
                                return defaultNormalize( id );
                            },
                            load:      function(id, require, _onLoad, config) {
                                try {
                                    var script = _this.include( id );
                                    script.textMode = false;
                                    _onLoad( script );
                                }
                                catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        } );
                    }
                    else if( plugin_id === 'promisify' ) {
                        plugin_resolver = Promise.resolve( {
                            load: function(id, require, _onLoad, config) {
                                var resolver;
                                if( Scriptor.promisifyCache.has( id ) ) {
                                    resolver = Promise.resolve( Scriptor.promisifyCache.get( id ) );
                                }
                                else {
                                    resolver = _this._require( id ).then( function(obj) {
                                        if( typeof obj === 'function' ) {
                                            return Promise.promisify( obj );
                                        }
                                        else if( typeof obj === 'object' ) {
                                            var newObj = Common.shallowCloneObject( obj );
                                            return Promise.promisifyAll( newObj );
                                        }
                                        else {
                                            return null;
                                        }
                                    } ).then( function(obj) {
                                        Scriptor.promisifyCache.set( id, obj );
                                        return obj;
                                    } );
                                }
                                resolver.then( _onLoad );
                            }
                        } );
                    }
                    else if( plugin_id === 'text' ) {
                        plugin_resolver = Promise.resolve( {
                            normalize: function(id, defaultNormalize) {
                                return defaultNormalize( id );
                            },
                            load:      function(id, require, _onLoad, config) {
                                try {
                                    var script = _this.include( id );
                                    script.textMode = true;
                                    _onLoad( script );
                                }
                                catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        } );
                    }
                    else {
                        plugin_resolver = this._require( plugin_id );
                    }
                    result = plugin_resolver.then( function(plugin) {
                        assert( plugin !== void 0 && plugin !== null, 'Invalid AMD plugin: ' + plugin_id );
                        assert.strictEqual( typeof plugin.load, 'function', '.load function on AMD plugin not found' );
                        id = parts[1];
                        if( typeof plugin.normalize === 'function' ) {
                            id = plugin.normalize( id, normalize );
                        }
                        else if( id.charAt( 0 ) === '.' ) {
                            id = normalize( id );
                        }
                        return new Promise( function(resolve, reject) {
                            if( _this._loadCache.has( id ) ) {
                                resolve( _this._loadCache.get( id ) );
                            }
                            else {
                                var onLoad = function(value) {
                                    _this._loadCache.set( id, value );
                                    resolve( value );
                                };
                                onLoad.fromText = function(text) {
                                    //Exploit Scriptor as much as possible
                                    Scriptor.compile( text ).exports().then( onLoad, onLoad.error );
                                };
                                onLoad.error = function(err) {
                                    reject( Common.normalizeError( id, 'scripterror', err ) );
                                };
                                //Since onload is a closure, it 'this' is implicitly bound with TypeScript
                                plugin.load( id, _this.require, onLoad, _this._config );
                            }
                        } );
                    } );
                }
                else if( Common.isAbsoluteOrRelative( id ) ) {
                    //Exploit Scriptor as much as possible for relative and absolute paths
                    id = Module.Module._resolveFilename( normalize( id ), this.parent );
                    var script;
                    if( this.isManaged() ) {
                        script = this.include( id );
                        script.textMode = false;
                    }
                    else {
                        script = Scriptor.load( id, this.watched, this._script );
                        this._addPropagationHandler( script, 'change', function() {
                            _this.unload();
                            _this.emit( 'change', _this.filename );
                        } );
                        script.propagateEvents( this._propagateEvents );
                        script.maxRecursion = this.maxRecursion;
                    }
                    result = script.exports();
                }
                else {
                    if( id === 'require' ) {
                        result = this.require;
                    }
                    else if( id === 'exports' ) {
                        result = this._script.exports;
                    }
                    else if( id === 'module' ) {
                        result = this._script;
                    }
                    else if( id === 'imports' ) {
                        result = Object.freeze( this.imports );
                    }
                    else if( id === 'Promise' ) {
                        return Promise;
                    }
                    else if( id === 'Scriptor' ) {
                        return Scriptor;
                    }
                    else if( this._loadCache.has( id ) ) {
                        result = this._loadCache.get( id );
                    }
                    else if( this._defineCache.has( id ) ) {
                        var args = this._defineCache.get( id );
                        result = this._runFactory( args[0], args[1], args[2] ).then( function(exported) {
                            _this._loadCache.set( id, exported );
                            return exported;
                        } );
                    }
                    else if( this._config.paths.hasOwnProperty( id ) ) {
                        var filepath = this._config.paths[id];
                        if( filepath.charAt( 0 ) === '.' ) {
                            filepath = path.resolve( this.baseUrl, filepath );
                        }
                        return this.require( filepath );
                    }
                    else {
                        //In a closure so the try-catch block doesn't prevent optimization of the rest of the function
                        result = new Promise( function(resolve, reject) {
                            try {
                                //Normal module loading akin to the real 'require' function
                                resolve( _this._script.require( id ) );
                            }
                            catch( err ) {
                                reject( Common.normalizeError( id, 'nodefine', err ) );
                            }
                        } );
                    }
                }
            }
            if( !isThenable( result ) ) {
                result = Promise.resolve( result );
            }
            if( typeof cb === 'function' ) {
                result.then( function(resolvedResult) {
                    if( Array.isArray( resolvedResult ) ) {
                        cb.apply( null, resolvedResult );
                    }
                    else {
                        cb.call( null, resolvedResult );
                    }
                }, typeof errcb === 'function' ? errcb : this.require['onError'] );
            }
            return result;
        };
        AMDScript.prototype._define = function() {
            var _this = this;
            var define_args = Common.parseDefine.apply( null, arguments );
            var id = define_args[0];
            if( id !== void 0 ) {
                assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );
                this._defineCache.set( id, define_args );
            }
            else {
                this._dependencies = define_args[1];
                this._pending = true;
                this._runFactory.apply( this, define_args ).then( function(result) {
                    //To match AMDefine, don't export the result unless there is one.
                    //Null is allowed, since it would have to have been returned explicitly.
                    if( result !== void 0 ) {
                        _this._script.exports = result;
                    }
                    _this._pending = false;
                    _this.emit( 'exports', _this._script.exports );
                } ).catch( function(err) {
                    _this._pending = false;
                    _this.emit( 'exports_error', err );
                } );
            }
        };
        Object.defineProperty( AMDScript.prototype, "dependencies", {
            get:          function() {
                return this._dependencies;
            },
            enumerable:   true,
            configurable: true
        } );
        AMDScript.prototype.config = function(config) {
            if( config !== void 0 && config !== null ) {
                this._config = Common.normalizeConfig( config );
            }
            return this._config;
        };
        AMDScript.prototype.unload = function() {
            var res = _super.prototype.unload.call( this );
            //unload also clears defines and requires
            this._defineCache.clear();
            this._loadCache.clear();
            if( this.pending ) {
                //this.emit( 'exports_error', new Error( 'cancelled ' + this.filename ) );
                this._pending = false;
            }
            if( this.loading ) {
                //this.emit( 'loading_error', new Error( 'cancelled ' + this.filename ) );
                this._loading = false;
            }
            return res;
        };
        return AMDScript;
    })( ScriptBase );
    var Script = (function(_super) {
        __extends( Script, _super );
        function Script(filename, parent) {
            if( parent === void 0 || parent === null ) {
                if( filename instanceof Module.Module ) {
                    parent = filename;
                    filename = null;
                }
                else {
                    parent = Scriptor.this_module;
                }
            }
            _super.call( this, parent );
            //Explicit comparisons to appease JSHint
            if( filename !== void 0 && filename !== null ) {
                this.load( filename );
            }
        }

        Script.prototype.do_setup = function() {
            var _this = this;
            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );
            this._script.define = Common.bind( this.define, this );
            this._script.include = this.include.bind( this );
            this._script.on = this._script.addListener = this._script.once = function(event, cb) {
                assert.equal( event, 'unload', 'modules can only listen for the unload event' );
                return _this.once( event, cb );
            };
        };
        //Should ALWAYS be called within a _callWrapper
        Script.prototype.do_load = function() {
            var _this = this;
            assert.notEqual( this.filename, null, 'Cannot load a script without a filename' );
            if( !this.loading ) {
                this.unload();
                if( !this.textMode ) {
                    this.do_setup();
                    var ext = path.extname( this.filename ) || '.js';
                    //Use custom extension if available
                    if( Scriptor.extensions_enabled && Scriptor.extensions.hasOwnProperty( ext ) ) {
                        this._script.paths = Module.Module._nodeModulePaths( path.dirname( this.filename ) );
                        this._loading = true;
                        return tryPromise( Scriptor.extensions[ext]( this._script,
                            this.filename ) ).then( function(src) {
                            _this._source = src;
                            _this._script.loaded = true;
                            _this._loading = false;
                            _this.emit( 'loaded', _this._script.exports );
                        } ).catch( function(err) {
                            _this._loading = false;
                            _this.emit( 'loading_error', err );
                        } );
                    }
                    else {
                        if( !Module.Module._extensions.hasOwnProperty( ext ) ) {
                            this.emit( 'warning',
                                util.format( 'The extension handler for %s does not exist, defaulting to .js handler',
                                    this.filename ) );
                        }
                        this._loading = true;
                        try {
                            this._script.load( this._script.filename );
                            this.emit( 'loaded', this.loaded );
                        }
                        catch( err ) {
                            this.emit( 'loading_error', err );
                        }
                        finally {
                            this._loading = false;
                        }
                    }
                }
                else {
                    this._loading = true;
                    return readFile( this.filename ).then( function(src) {
                        _this._script.exports = _this._source = src;
                        _this._script.loaded = true;
                        _this._loading = false;
                        _this.emit( 'loaded', _this.loaded );
                    } ).catch( function(err) {
                        _this._loading = false;
                        _this.emit( 'loading_error', err );
                    } );
                }
            }
        };
        Script.prototype.source = function(encoding) {
            var _this = this;
            if( encoding === void 0 ) {
                encoding = null;
            }
            if( this.loaded ) {
                if( encoding !== null && encoding !== void 0 ) {
                    return Promise.resolve( this._source.toString( encoding ) );
                }
                else {
                    return Promise.resolve( this._source );
                }
            }
            else {
                //Add the event listeners first
                var waiting = makeEventPromise( this, 'loaded', 'loading_error' );
                return this._callWrapper( this.do_load ).then( function() {
                    return waiting;
                } ).then( function() {
                    return _this.source( encoding );
                } );
            }
        };
        Script.prototype.exports = function() {
            var _this = this;
            if( this.loaded ) {
                if( this.pending ) {
                    return makeEventPromise( this, 'exports', 'exports_error' ).tap( console.log );
                }
                else {
                    return Promise.resolve( this._script.exports );
                }
            }
            else {
                //Add the event listeners first
                var waiting = makeEventPromise( this, 'loaded', 'loading_error' );
                return this._callWrapper( this.do_load ).then( function() {
                    return waiting;
                } ).then( function() {
                    return _this.exports();
                } );
            }
        };
        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        Script.prototype.call = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.apply( args );
        };
        Script.prototype.apply = function(args) {
            var _this = this;
            if( !this.textMode ) {
                return this.exports().then( function(main) {
                    if( typeof main === 'function' ||
                        (main !== void 0 && main !== null && typeof main['default'] === 'function') ) {
                        if( typeof main['default'] === 'function' ) {
                            main = main['default'];
                        }
                        if( isGeneratorFunction( main ) ) {
                            main = makeCoroutine( main );
                        }
                        return _this._callWrapper( main, null, args );
                    }
                    else {
                        return main;
                    }
                } );
            }
            else {
                return this.source.apply( this, args );
            }
        };
        Script.prototype.reference = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.reference_apply( args );
        };
        Script.prototype.reference_apply = function(args) {
            return new Reference( this, args );
        };
        Script.prototype.load = function(filename, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            filename = path.resolve( filename );
            this.close( false );
            this.id = path.basename( filename );
            this._script.filename = filename;
            if( watch ) {
                this.watch();
            }
            this.emit( 'change', 'change', this.filename );
            return this;
        };
        Script.prototype.watch = function(persistent) {
            var _this = this;
            if( persistent === void 0 ) {
                persistent = false;
            }
            if( !this.watched ) {
                var watcher;
                try {
                    watcher = this._watcher = fs.watch( this.filename, {
                        persistent: persistent
                    } );
                }
                catch( err ) {
                    throw Common.normalizeError( this.filename, 'nodefine', err );
                }
                //These are separated out so rename and change events can be debounced separately.
                var onChange = _.debounce( function(event, filename) {
                    _this.unload();
                    _this.emit( 'change', event, filename );
                }, this.debounceMaxWait );
                var onRename = _.debounce( function(event, filename) {
                    var old_filename = _this._script.filename;
                    //A simple rename doesn't change file content, so just change the filename
                    //and leave the script loaded
                    _this._script.filename = filename;
                    _this.emit( 'rename', old_filename, filename );
                }, this.debounceMaxWait );
                watcher.on( 'change', function(event, filename) {
                    //path.resolve doesn't like nulls, so this has to be done first
                    if( filename === null || filename === void 0 ) {
                        //If filename is null, that is generally a bad sign, so just close the script (not permanently)
                        _this.close( false );
                    }
                    else {
                        //This is important because fs.watch 'change' event only returns things like 'script.js'
                        //as a filename, which when resolved normally is relative to process.cwd(), not where the script
                        //actually is. So we have to get the directory of the last filename and combine it with the new name
                        filename = path.resolve( _this.baseUrl, filename );
                        if( event === 'change' && _this.loaded ) {
                            onChange( event, filename );
                        }
                        else if( event === 'rename' && filename !== _this.filename ) {
                            onRename( event, filename );
                        }
                    }
                } );
                watcher.on( 'error', function(error) {
                    //In the event of an error, unload and unwatch
                    _this.close( false );
                    //Would it be better to throw?
                    _this.emit( 'error', error );
                } );
                return true;
            }
            return false;
        };
        Script.prototype.unwatch = function() {
            if( this.watched ) {
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();
                return delete this._watcher;
            }
            return false;
        };
        return Script;
    })( AMDScript );
    Scriptor.Script = Script;
    var TextScript = (function(_super) {
        __extends( TextScript, _super );
        function TextScript(filename, parent) {
            _super.call( this, filename, parent );
        }

        Object.defineProperty( TextScript.prototype, "textMode", {
            get:          function() {
                return true;
            },
            enumerable:   true,
            configurable: true
        } );
        return TextScript;
    })( Script );
    Scriptor.TextScript = TextScript;
    var SourceScript = (function(_super) {
        __extends( SourceScript, _super );
        function SourceScript(src, parent) {
            if( parent === void 0 ) {
                parent = Scriptor.this_module;
            }
            _super.call( this, null, parent );
            if( src !== void 0 && src !== null ) {
                this.load( src );
            }
        }

        Object.defineProperty( SourceScript.prototype, "filename", {
            get:          function() {
                return this._script.filename;
            },
            set:          function(value) {
                this._script.filename = value;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( SourceScript.prototype, "baseUrl", {
            get:          function() {
                return path.dirname( this.filename );
            },
            set:          function(value) {
                value = path.dirname( value );
                this.filename = value + path.basename( this.filename );
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( SourceScript.prototype, "watched", {
            get:          function() {
                return this._onChange === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        SourceScript.prototype.source = function(encoding) {
            if( encoding === void 0 ) {
                encoding = null;
            }
            var srcPromise;
            if( this._source instanceof ReferenceBase ) {
                srcPromise = this._source.value().then( function(src) {
                    if( !Buffer.isBuffer( src ) ) {
                        assert.strictEqual( typeof src, 'string',
                            'Reference source must return string or Buffer as value' );
                    }
                    return src;
                } );
            }
            else {
                srcPromise = Promise.resolve( this._source );
            }
            return srcPromise.then( function(src) {
                if( Scriptor.extensions_enabled ) {
                    src = Common.injectAMDAndStripBOM( src );
                }
                else {
                    src = Common.stripBOM( src );
                }
                if( Buffer.isBuffer( src ) && encoding !== void 0 && encoding !== null ) {
                    return src.toString( encoding );
                }
                else {
                    return src;
                }
            } );
        };
        SourceScript.prototype.do_compile = function() {
            var _this = this;
            assert.notStrictEqual( this._source, void 0, 'Source must be set to compile' );
            return this.source( 'utf-8' ).then( function(src) {
                _this._script._compile( src, _this.filename );
                _this._script.loaded = true;
                _this.emit( 'loaded', _this.loaded );
                return _this.exports();
            } );
        };
        SourceScript.prototype.do_load = function() {
            this.unload();
            this.do_setup();
            return this.do_compile();
        };
        SourceScript.prototype.load = function(src, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            this.close( false );
            assert( typeof src === 'string' || src instanceof ReferenceBase, 'Source must be a string or Reference' );
            this._source = src;
            if( watch ) {
                this.watch();
            }
            this.emit( 'change', 'change', this.filename );
            return this;
        };
        SourceScript.prototype.watch = function() {
            var _this = this;
            if( !this.watched && this._source instanceof ReferenceBase ) {
                this._onChange = _.debounce( function(event, filename) {
                    _this.unload();
                    _this.emit( 'change', event, filename );
                }, this.debounceMaxWait );
                this._source.on( 'change', this._onChange );
                return true;
            }
            return false;
        };
        SourceScript.prototype.unwatch = function() {
            if( this.watched && this._source instanceof ReferenceBase ) {
                this._source.removeListener( 'change', this._onChange );
                return delete this._onChange;
            }
            return false;
        };
        return SourceScript;
    })( Script );
    Scriptor.SourceScript = SourceScript;
    var ScriptAdapter = (function(_super) {
        __extends( ScriptAdapter, _super );
        function ScriptAdapter(_manager, filename, parent) {
            _super.call( this, filename, parent );
            this._manager = _manager;
            //When a script is renamed, it should be reassigned in the manager
            //Otherwise, when it's accessed at the new location, the manager just creates a new script
            this.on( 'rename', function(event, oldname, newname) {
                _manager.scripts.set( newname, _manager.scripts.get( oldname ) );
                _manager.scripts.delete( oldname );
            } );
        }

        Object.defineProperty( ScriptAdapter.prototype, "manager", {
            get:          function() {
                return this._manager;
            },
            enumerable:   true,
            configurable: true
        } );
        ScriptAdapter.prototype.include = function(filename, load) {
            var _this = this;
            if( load === void 0 ) {
                load = false;
            }
            //make sure filename can be relative to the current script
            var real_filename = path.resolve( this.baseUrl, filename );
            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script = this._manager.add( real_filename );
            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( load && !script.loaded ) {
                script.reload();
            }
            this._addPropagationHandler( script, 'change', function() {
                _this.unload();
                _this.emit( 'change', _this.filename );
            } );
            script.propagateEvents( this._propagateEvents );
            script.maxRecursion = this.maxRecursion;
            return script;
        };
        ScriptAdapter.prototype.close = function(permanent) {
            if( permanent ) {
                delete this._manager;
            }
            return _super.prototype.close.call( this, permanent );
        };
        return ScriptAdapter;
    })( Script );

    function load(filename, watch, parent) {
        if( watch === void 0 ) {
            watch = true;
        }
        var script;
        filename = path.resolve( filename );
        if( Scriptor.scriptCache.has( filename ) ) {
            script = Scriptor.scriptCache.get( filename );
        }
        else {
            script = new Script( null, parent );
            script.load( filename, watch );
            //Remove the reference to the script upon close, even if it isn't permenant
            script.once( 'close', function() {
                Scriptor.scriptCache.delete( filename );
            } );
        }
        return script;
    }

    Scriptor.load = load;
    function compile(src, watch, parent) {
        if( watch === void 0 ) {
            watch = true;
        }
        var script = new SourceScript( src, parent );
        if( watch ) {
            script.watch();
        }
        return script;
    }

    Scriptor.compile = compile;
    Scriptor.identity = function(left, right) {
        return left.value();
    };
    var ReferenceBase = (function(_super) {
        __extends( ReferenceBase, _super );
        function ReferenceBase() {
            _super.apply( this, arguments );
            this._value = void 0;
            this._ran = false;
        }

        return ReferenceBase;
    })( events.EventEmitter );
    var Reference = (function(_super) {
        __extends( Reference, _super );
        function Reference(_script, _args) {
            var _this = this;
            _super.call( this );
            this._script = _script;
            this._args = _args;
            //Just mark this reference as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this reference would still not be run
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            this._script.on( 'change', this._onChange );
        }

        Reference.prototype.value = function() {
            var _this = this;
            if( !this._ran ) {
                return this._script.apply( this._args ).then( function(value) {
                    if( typeof _this._value === 'object' ) {
                        _this._value = Object.freeze( _this._value );
                    }
                    else {
                        _this._value = value;
                    }
                    _this._ran = true;
                    return _this._value;
                } );
            }
            else {
                return Promise.resolve( this._value );
            }
        };
        Object.defineProperty( Reference.prototype, "ran", {
            get:          function() {
                return this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( Reference.prototype, "closed", {
            get:          function() {
                return this._script === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        Reference.join = function(left, right, transform) {
            return new JoinedTransformReference( left, right, transform );
        };
        Reference.resolve = function(value) {
            if( value instanceof ReferenceBase ) {
                return value;
            }
            else {
                return new ResolvedReference( value );
            }
        };
        //Creates a binary tree (essentially) of joins from an array of References using a single transform
        Reference.join_all = function(refs, transform) {
            assert( Array.isArray( refs ), 'join_all can only join arrays of References' );
            if( refs.length === 0 ) {
                return null;
            }
            else if( refs.length === 1 ) {
                return refs[0];
            }
            else if( refs.length === 2 ) {
                return Reference.join( refs[0], refs[1], transform );
            }
            else {
                var mid = Math.floor( refs.length / 2 );
                var left = Reference.join_all( refs.slice( 0, mid ), transform );
                var right = Reference.join_all( refs.slice( mid ), transform );
                return Reference.join( left, right, transform );
            }
        };
        Reference.transform = function(ref, transform) {
            return new TransformReference( ref, transform );
        };
        Reference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        Reference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        Reference.prototype.left = function() {
            return null;
        };
        Reference.prototype.right = function() {
            return null;
        };
        Reference.prototype.close = function() {
            if( !this.closed ) {
                this._script.removeListener( 'change', this._onChange );
                delete this._value;
                delete this._args;
                delete this._script; //Doesn't really delete it, just removes it from this
            }
        };
        return Reference;
    })( ReferenceBase );
    Scriptor.Reference = Reference;
    var TransformReference = (function(_super) {
        __extends( TransformReference, _super );
        function TransformReference(_ref, _transform) {
            var _this = this;
            _super.call( this );
            this._ref = _ref;
            this._transform = _transform;
            assert( _ref instanceof ReferenceBase, 'transform will only work on References' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );
            if( isGeneratorFunction( _transform ) ) {
                this._transform = makeCoroutine( _transform );
            }
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            this._ref.on( 'change', this._onChange );
        }

        TransformReference.prototype.value = function() {
            var _this = this;
            if( !this._ran ) {
                return tryPromise( this._transform( this._ref, null ) ).then( function(value) {
                    if( typeof value === 'object' ) {
                        _this._value = Object.freeze( value );
                    }
                    else {
                        _this._value = value;
                    }
                    _this._ran = true;
                    return _this._value;
                } );
            }
            else {
                return Promise.resolve( this._value );
            }
        };
        Object.defineProperty( TransformReference.prototype, "ran", {
            get:          function() {
                return this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( TransformReference.prototype, "closed", {
            get:          function() {
                return this._ref === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        TransformReference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        TransformReference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        TransformReference.prototype.left = function() {
            return this._ref;
        };
        TransformReference.prototype.right = function() {
            return null;
        };
        TransformReference.prototype.close = function(recursive) {
            if( recursive === void 0 ) {
                recursive = false;
            }
            if( !this.closed ) {
                this._ref.removeListener( 'change', this._onChange );
                delete this._value;
                if( recursive ) {
                    this._ref.close( recursive );
                }
                delete this._ref;
            }
        };
        return TransformReference;
    })( ReferenceBase );
    var JoinedTransformReference = (function(_super) {
        __extends( JoinedTransformReference, _super );
        function JoinedTransformReference(_left, _right, _transform) {
            var _this = this;
            if( _transform === void 0 ) {
                _transform = Scriptor.identity;
            }
            _super.call( this );
            this._left = _left;
            this._right = _right;
            this._transform = _transform;
            //Just to prevent stupid mistakes
            assert( _left instanceof ReferenceBase &&
                    _right instanceof ReferenceBase, 'join will only work on References' );
            assert.notEqual( _left, _right, 'Cannot join to self' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );
            if( isGeneratorFunction( _transform ) ) {
                this._transform = makeCoroutine( _transform );
            }
            //This has to be a closure because the two emitters down below
            //tend to call this with themselves as this
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            _left.on( 'change', this._onChange );
            _right.on( 'change', this._onChange );
        }

        JoinedTransformReference.prototype.value = function() {
            var _this = this;
            if( !this._ran ) {
                return tryPromise( this._transform( this._left, this._right ) ).then( function(value) {
                    if( typeof value === 'object' ) {
                        _this._value = Object.freeze( value );
                    }
                    else {
                        _this._value = value;
                    }
                    _this._ran = true;
                    return _this._value;
                } );
            }
            else {
                return Promise.resolve( this._value );
            }
        };
        Object.defineProperty( JoinedTransformReference.prototype, "ran", {
            get:          function() {
                return this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( JoinedTransformReference.prototype, "closed", {
            get:          function() {
                return this._left === void 0 || this._right === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        JoinedTransformReference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        JoinedTransformReference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        JoinedTransformReference.prototype.left = function() {
            return this._left;
        };
        JoinedTransformReference.prototype.right = function() {
            return this._right;
        };
        JoinedTransformReference.prototype.close = function(recursive) {
            if( recursive === void 0 ) {
                recursive = false;
            }
            if( !this.closed ) {
                this._left.removeListener( 'change', this._onChange );
                this._right.removeListener( 'change', this._onChange );
                delete this._value;
                if( recursive ) {
                    this._left.close( recursive );
                    this._right.close( recursive );
                }
                delete this._left;
                delete this._right;
            }
        };
        return JoinedTransformReference;
    })( ReferenceBase );
    var ResolvedReference = (function(_super) {
        __extends( ResolvedReference, _super );
        function ResolvedReference(value) {
            var _this = this;
            _super.call( this );
            this._resolver = tryPromise( value ).then( function(result) {
                if( typeof result === 'object' ) {
                    _this._value = Object.freeze( result );
                }
                else {
                    _this._value = result;
                }
                _this._ran = true;
                delete _this._resolver;
                return _this._value;
            } );
        }

        Object.defineProperty( ResolvedReference.prototype, "closed", {
            get:          function() {
                return this._resolver === void 0 && !this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( ResolvedReference.prototype, "ran", {
            get:          function() {
                return this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        ResolvedReference.prototype.value = function() {
            if( this._resolver !== void 0 && !this._ran ) {
                return this._resolver;
            }
            else {
                return Promise.resolve( this._value );
            }
        };
        ResolvedReference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        ResolvedReference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        ResolvedReference.prototype.left = function() {
            return null;
        };
        ResolvedReference.prototype.right = function() {
            return null;
        };
        ResolvedReference.prototype.close = function() {
            if( this._ran ) {
                this._ran = false;
                delete this._value;
            }
        };
        return ResolvedReference;
    })( ReferenceBase );
    /**** BEGIN SECTION MANAGER ****/
    var Manager = (function() {
        function Manager(grandParent) {
            this._debounceMaxWait = null; //set to null if it shouldn't set it at all
            this._maxListeners = null; //set to null if it shouldn't set it at all
            this._config = null;
            this._scripts = MapAdapter.createMap();
            this._cwd = process.cwd();
            this._propagateEvents = false;
            this._parent = new Module.Module( 'ScriptManager', grandParent );
        }

        Manager.prototype.cwd = function() {
            return this._cwd;
        };
        Manager.prototype.chdir = function(value) {
            this._cwd = path.resolve( this.cwd(), value );
            return this._cwd;
        };
        Object.defineProperty( Manager.prototype, "debounceMaxWait", {
            get:          function() {
                return this._debounceMaxWait;
            },
            set:          function(time) {
                if( time !== null && time !== void 0 ) {
                    this._debounceMaxWait = Math.floor( time );
                    assert( !isNaN( this._debounceMaxWait ), 'debounceMaxWait must be set to a number' );
                }
                else {
                    this._debounceMaxWait = null;
                }
            },
            enumerable:   true,
            configurable: true
        } );
        Manager.prototype.setMaxListeners = function(value) {
            if( value !== null && value !== void 0 ) {
                this._maxListeners = Math.floor( value );
                assert( !isNaN( this._maxListeners ), 'setMaxListeners must be passed a number' );
            }
            else {
                this._maxListeners = null;
            }
        };
        Manager.prototype.getMaxListeners = function() {
            return this._maxListeners;
        };
        Manager.prototype.config = function(config) {
            if( config !== void 0 && config !== null ) {
                this._config = Common.normalizeConfig( config );
            }
            return this._config;
        };
        Object.defineProperty( Manager.prototype, "parent", {
            get:          function() {
                return this._parent;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( Manager.prototype, "scripts", {
            get:          function() {
                return this._scripts;
            },
            enumerable:   true,
            configurable: true
        } );
        Manager.prototype.propagateEvents = function(enable) {
            if( enable === void 0 ) {
                enable = true;
            }
            var wasPropagating = this._propagateEvents;
            this._propagateEvents = enable;
            if( wasPropagating && !enable ) {
                //immediately disable propagation by pretending it's already been propagated
                this._scripts.forEach( function(script) {
                    script.propagateEvents( false );
                } );
            }
            else if( !wasPropagating && enable ) {
                this._scripts.forEach( function(script) {
                    script.propagateEvents();
                } );
            }
            return wasPropagating;
        };
        //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
        //but this functions as a way to add and/or get a script in one fell swoop.
        //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
        //from watching a file.
        Manager.prototype.add = function(filename, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            filename = path.resolve( this.cwd(), filename );
            var script = this._scripts.get( filename );
            if( script === void 0 ) {
                script = new ScriptAdapter( this, null, this._parent );
                if( this._propagateEvents ) {
                    script.propagateEvents();
                }
                if( this.debounceMaxWait !== null && this.debounceMaxWait !== void 0 ) {
                    script.debounceMaxWait = this.debounceMaxWait;
                }
                if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
                    script.setMaxListeners( this._maxListeners );
                }
                if( this._config !== void 0 && this._config !== null ) {
                    script.config( this._config );
                }
                script.load( filename, watch );
                this._scripts.set( filename, script );
            }
            //Even if the script is added, this allows it to be watched, though not unwatched.
            //Unwatching still has to be done manually
            if( watch ) {
                script.watch();
            }
            return script;
        };
        //Removes a script from the manager. But closing it permenantly is optional,
        //as it may sometimes make sense to move it out of a manager and use it independently.
        //However, that is quite rare so close defaults to true
        Manager.prototype.remove = function(filename, close) {
            if( close === void 0 ) {
                close = true;
            }
            filename = path.resolve( this.cwd(), filename );
            var script = this._scripts.get( filename );
            if( script !== void 0 ) {
                if( close ) {
                    script.close();
                }
                return this._scripts.delete( filename );
            }
            return false;
        };
        Manager.prototype.call = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.apply( filename, args );
        };
        Manager.prototype.apply = function(filename, args) {
            var script = this.add( filename, false );
            try {
                return script.apply( args );
            }
            catch( err ) {
                this.remove( filename, true );
                throw err;
            }
        };
        Manager.prototype.reference = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.reference_apply( filename, args );
        };
        Manager.prototype.reference_apply = function(filename, args) {
            return this.add( filename, false ).reference( args );
        };
        Manager.prototype.get = function(filename) {
            filename = path.resolve( this.cwd(), filename );
            return this._scripts.get( filename );
        };
        //Make closing optional for the same reason as .remove
        Manager.prototype.clear = function(close) {
            if( close === void 0 ) {
                close = true;
            }
            if( close ) {
                this._scripts.forEach( function(script) {
                    script.close();
                } );
            }
            this._scripts.clear();
        };
        return Manager;
    })();
    Scriptor.Manager = Manager;
})( Scriptor || (Scriptor = {}) );
module.exports = Scriptor;
