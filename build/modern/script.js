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
/**
 * Created by Aaron on 7/5/2015.
 */

'use strict';

var _inherits = require( 'babel-runtime/helpers/inherits' ).default;

var _createClass = require( 'babel-runtime/helpers/create-class' ).default;

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' ).default;

var _bluebird = require( 'bluebird' );

var _Map = require( 'babel-runtime/core-js/map' ).default;

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

exports.__esModule = true;
exports.load = load;

var _module2 = require( 'module' );

var _module3 = _interopRequireDefault( _module2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _fs = require( 'fs' );

var _url = require( 'url' );

var _path = require( 'path' );

var _errorJs = require( './error.js' );

var _extensionsJs = require( './extensions.js' );

var _extensionsJs2 = _interopRequireDefault( _extensionsJs );

var _eventsJs = require( './events.js' );

var _defaultsJs = require( './defaults.js' );

var _utilsJs = require( './utils.js' );

var _referenceJs = require( './reference.js' );

var _referenceJs2 = _interopRequireDefault( _referenceJs );

var promisifyCache = new _Map();

var readFileAsync = _bluebird2.default.promisify( _fs.readFile );

function load( filename ) {
    var watch = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];
    var parent = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    filename = _path.resolve( filename );

    var script = new Script( null, parent );

    script.load( filename, watch );

    return script;
}

var Script = (function( _EventPropagator ) {
    _inherits( Script, _EventPropagator );

    Script.hasExtension = function hasExtension( ext ) {
        return Script.extensions.hasOwnProperty( ext );
    };

    Script.prototype._init = function _init() {
        var _this = this;

        var require = function require() {
            return _this._require.apply( _this, arguments );
        };

        var define = function define() {
            return _this._define.apply( _this, arguments );
        };

        require.toUrl = function() {
            var filepath = arguments.length <= 0 || arguments[0] === undefined ? _this.filename : arguments[0];

            _assert2.default.strictEqual( typeof filepath, 'string', 'require.toUrl takes a string as filepath' );

            if( filepath.charAt( 0 ) === '.' ) {
                //Use the url.resolve instead of resolve, even though they usually do the same thing
                return _url.resolve( _this.baseUrl, filepath );
            } else {
                return filepath;
            }
        };

        require.defined = function( id ) {
            return _this._loadCache.has( _path.posix.normalize( id ) );
        };

        require.specified = function( id ) {
            return _this._defineCache.has( _path.posix.normalize( id ) );
        };

        require.undef = function( id ) {
            id = _path.posix.normalize( id );

            _this._loadCache.delete( id );
            _this._defineCache.delete( id );

            return _this;
        };

        //This is not an anonymous so stack traces make a bit more sense
        require.onError = function onErrorDefault( err ) {
            throw err; //default error
        };

        //This is almost exactly like the normal require.resolve, but it's relative to this.baseUrl
        require.resolve = function( id ) {
            var relative = _path.resolve( _this.baseUrl, id );
            return _module3.default._resolveFilename( relative, _this._script );
        };

        define.require = require;

        define.amd = {
            jQuery: false
        };

        require.define = define;

        this.require = require;
        this.define = define;
    };

    _createClass( Script, null, [
        {
            key:        'Scriptor',
            value:      null,
            enumerable: true
        }, {
            key:        'extensions_enabled',
            value:      true,
            enumerable: true
        }, {
            key:        'extensions',
            value:      _extensionsJs2.default,
            enumerable: true
        }
    ] );

    function Script( filename, parent ) {
        _classCallCheck( this, Script );

        _EventPropagator.call( this );

        this._script = null;
        this._source = null;
        this._factory = null;
        this._watcher = null;
        this._willWatch = false;
        this._watchPersistent = false;
        this._maxListeners = 10;
        this._debounceMaxWait = _defaultsJs.default_max_debounceMaxWait;
        this._textMode = false;
        this._defineCache = new _Map();
        this._loadCache = new _Map();
        this._pending = false;
        this._loading = false;
        this._loadingText = false;
        this._runningFactory = false;
        this._config = _utilsJs.normalizeConfig( null );
        this._dependencies = [];
        this._unloadOnRename = false;
        this.require = null;
        this.define = null;
        this.imports = {};
        if( parent === void 0 || parent === null ) {
            if( filename instanceof _module3.default.Module ) {
                parent = filename;
                filename = null;
            } else {
                parent = module;
            }
        }

        this._script = new _module3.default( null, parent );

        //Explicit comparisons to appease JSHint
        if( filename !== void 0 && filename !== null ) {
            this.load( filename );
        }

        this._init();
    }

    Script.prototype.setMaxListeners = function setMaxListeners( num ) {
        num = Math.floor( num );

        _assert2.default( !isNaN( num ), 'maxListeners must be set to a number' );

        this._maxListeners = num;

        _EventPropagator.prototype.setMaxListeners.call( this, num );
    };

    Script.prototype.getMaxListeners = function getMaxListeners() {
        if( typeof _EventPropagator.prototype.getMaxListeners === 'function' ) {
            return _EventPropagator.prototype.getMaxListeners.call( this );
        } else {
            return this._maxListeners;
        }
    };

    Script.prototype.config = function config( _config ) {
        var alreadyNormalized = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        if( _config !== void 0 && _config !== null ) {
            if( alreadyNormalized ) {
                this._config = _config;
            } else {
                this._config = _utilsJs.normalizeConfig( _config );
            }
        }
    };

    Script.prototype.isManaged = function isManaged() {
        return this.manager !== null && this.manager !== void 0;
    };

    //Based on the RequireJS 'standard' for relative locations
    //For SourceScripts, just set the filename to something relative

    Script.prototype._callWrapper = function _callWrapper( func ) {
        var _this2 = this;

        var context = arguments.length <= 1 || arguments[1] === undefined ? this : arguments[1];
        var args = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

        return new _bluebird2.default( function( resolve, reject ) {
            try {
                var res = func.apply( context, args );

                if( _utilsJs.isThenable( res ) ) {
                    res.then( resolve, reject );
                } else {
                    resolve( res );
                }
            } catch( err ) {
                _this2.unload();

                reject( err );
            }
        } );
    };

    Script.prototype._runFactory = function _runFactory( id, deps, factory ) {
        var _this3 = this;

        if( id !== void 0 && id !== null ) {
            //clear before running. Will remained cleared in the event of error
            this._loadCache.delete( id );
        }

        if( typeof factory === 'function' ) {
            /*
             * If this is true, generators are obviously supported.
             * */
            if( _utilsJs.isGeneratorFunction( factory ) ) {
                factory = _bluebird2.default.coroutine( factory );
            }

            return this._require( deps ).then( function( resolvedDeps ) {
                return factory.apply( _this3._script.exports, resolvedDeps );
            } );
        } else {
            //On the off chance the function factory is a promise, run it through again if need be
            return _utilsJs.tryPromise( factory ).then( function( resolvedFactory ) {
                if( typeof factory === 'function' ) {
                    return _this3._runFactory( id, deps, resolvedFactory );
                } else {
                    return resolvedFactory;
                }
            } );
        }
    };

    Script.prototype._runMainFactory = function _runMainFactory() {
        var _this4 = this;

        if( !this._runningFactory ) {
            this._runningFactory = true;
            this._pending = true;

            return this._runFactory( null, this._dependencies, this._factory ).then( function( result ) {
                if( _this4._pending ) {
                    //To match AMDefine, don't export the result unless there is one.
                    //Null is allowed, since it would have to have been returned explicitly.
                    if( result !== void 0 ) {
                        _this4._script.exports = result;
                    }

                    _this4._pending = false;
                    _this4._runningFactory = false;

                    _this4.emit( 'exports', _this4._script.exports );
                } else {
                    _this4.emit( 'error', new Error( 'The script ' + _this4.filename
                                                     + ' was unloaded while performing an asynchronous operation.' ) );
                }
            }, function( err ) {
                _this4._runningFactory = false;

                _this4.emit( 'error', err );
            } );
        }
    };

    Script.prototype._require = _bluebird.coroutine( function* ( id ) {
        var _this5 = this;

        var normalize = _path.resolve.bind( null, this.baseUrl );

        if( Array.isArray( id ) ) {
            return _bluebird2.default.map( id, function( id ) {
                return _this5._require( id );
            } );
        } else {
            _assert2.default.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );

            //Plugins ARE supported, but they have to work like a normal module
            if( id.indexOf( '!' ) !== -1 ) {
                var _ret = yield* (function* () {
                    var parts = id.split( '!', 2 );

                    var plugin    = undefined,
                        plugin_id = parts[0];

                    if( plugin_id === 'include' ) {
                        plugin = {
                            normalize: function normalize( id, defaultNormalize ) {
                                return defaultNormalize( id );
                            },
                            load:      function load( id, require, _onLoad, config ) {
                                try {
                                    var script = _this5.include( id );

                                    script.textMode = false;

                                    _onLoad( script );
                                } catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        };
                    } else if( plugin_id === 'promisify' ) {
                        plugin = {
                            load: function load( id, require, _onLoad, config ) {
                                if( promisifyCache.has( id ) ) {
                                    _onLoad( promisifyCache.get( id ) );
                                } else {
                                    _this5._require( id ).then( function( obj ) {
                                        if( typeof obj === 'function' ) {
                                            return _bluebird2.default.promisify( obj );
                                        } else if( typeof obj === 'object' ) {
                                            var newObj = _lodash2.default.clone( obj );

                                            return _bluebird2.default.promisifyAll( newObj );
                                        } else {
                                            return null;
                                        }
                                    } ).then( function( obj ) {
                                        promisifyCache.set( id, obj );

                                        return obj;
                                    } ).then( _onLoad, _onLoad.error );
                                }
                            }
                        };
                    } else if( plugin_id === 'text' ) {
                        plugin = {
                            normalize: function normalize( id, defaultNormalize ) {
                                return defaultNormalize( id );
                            },
                            load:      function load( id, require, _onLoad, config ) {
                                try {
                                    var script = _this5.include( id );

                                    script.textMode = true;

                                    _onLoad( script );
                                } catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        };
                    } else {
                        plugin = yield _this5._require( plugin_id );
                    }

                    _assert2.default( plugin !== void 0 && plugin !== null, 'Invalid AMD plugin: ' + plugin_id );
                    _assert2.default.strictEqual( typeof plugin.load, 'function',
                        '.load function on AMD plugin not found' );

                    id = parts[1];

                    if( typeof plugin.normalize === 'function' ) {
                        id = plugin.normalize( id, normalize );
                    } else if( id.charAt( 0 ) === '.' ) {
                        id = normalize( id );
                    }

                    return {
                        v: new _bluebird2.default( function( resolve, reject ) {
                            if( _this5._loadCache.has( id ) ) {
                                resolve( _this5._loadCache.get( id ) );
                            } else {
                                (function() {
                                    var onLoad = function onLoad( value ) {
                                        _this5._loadCache.set( id, value );

                                        resolve( value );
                                    };

                                    onLoad.fromText = function( text ) {
                                        //Exploit Scriptor as much as possible
                                        compile( text ).exports().then( onLoad, onLoad.error );
                                    };

                                    onLoad.error = function( err ) {
                                        reject( _errorJs.normalizeError( id, 'scripterror', err ) );
                                    };

                                    //Since onload is a closure, it 'this' is implicitly bound with TypeScript
                                    plugin.load( id, _this5.require, onLoad, _this5._config );
                                })();
                            }
                        } )
                    };
                })();

                if( typeof _ret === 'object' ) {
                    return _ret.v;
                }
            } else if( _utilsJs.isAbsoluteOrRelative( id ) ) {
                id = _module3.default._resolveFilename( normalize( id ), this.parent );

                var script = undefined;

                if( this.isManaged() ) {
                    script = this.include( id );

                    script.textMode = false;
                } else {
                    script = load( id, this.watched, this._script );

                    script.propagateTo( this, 'change', function() {
                        _this5.unload();
                        _this5.emit( 'change', _this5.filename );
                    } );

                    script.propagateEvents( this.isPropagatingEvents() );
                }

                return script.exports();
            } else {
                if( id === 'require' ) {
                    return this.require;
                } else if( id === 'exports' ) {
                    return this._script.exports;
                } else if( id === 'module' ) {
                    return this._script;
                } else if( id === 'imports' ) {
                    return this.imports;
                } else if( id === 'Promise' ) {
                    return _bluebird2.default;
                } else if( id === 'Scriptor' ) {
                    return Script.Scriptor;
                } else if( this._loadCache.has( id ) ) {
                    return this._loadCache.get( id );
                } else if( this._defineCache.has( id ) ) {
                    var args = this._defineCache.get( id );

                    return this._runFactory.apply( this, args ).then( function( exported ) {
                        _this5._loadCache.set( id, exported );

                        return exported;
                    } );
                } else {
                    var config_paths = this._config.paths;

                    for( var p in config_paths ) {
                        if( config_paths.hasOwnProperty( p ) ) {
                            var rel = _path.relative( p, id );

                            if( rel.indexOf( '..' ) === -1 ) {
                                var filepath = config_paths[p];

                                if( _utilsJs.isAbsoluteOrRelative( filename ) ) {
                                    filepath = _path.resolve( this.baseUrl, filepath, rel );
                                }

                                return this.require( filepath );
                            }
                        }
                    }

                    return new _bluebird2.default( function( resolve, reject ) {
                        try {
                            //Normal module loading akin to the real 'require' function
                            resolve( _this5._script.require( id ) );
                        } catch( err ) {
                            reject( _errorJs.normalizeError( id, 'nodefine', err ) );
                        }
                    } );
                }
            }
        }
    } );

    Script.prototype._define = function _define() {
        var define_args = _utilsJs.parseDefine.apply( undefined, arguments );

        var id = define_args[0];

        if( id !== void 0 ) {
            _assert2.default.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

            this._defineCache.set( id, define_args );
        } else {
            this._dependencies = define_args[1];
            this._factory = define_args[2];

            this._runMainFactory();
        }
    };

    Script.prototype._do_setup = function _do_setup() {
        var _this6 = this;

        this._script.imports = this.imports;

        this._script.define = _utilsJs.bind( this.define, this );

        this._script.include = function() {
            return _this6.include.apply( _this6, arguments );
        };

        this._script.on = this._script.addListener = this._script.once = function( event, cb ) {
            _assert2.default.equal( event, 'unload', 'modules can only listen for the unload event' );

            return _this6.once( event, cb );
        };
    };

    Script.prototype._do_load = function _do_load() {
        var _this7 = this;

        _assert2.default.notEqual( this.filename, null, 'Cannot load a script without a filename' );

        if( !this.loading || this._loadingText && !this.textMode ) {
            this.unload();

            if( !this.textMode ) {
                this._do_setup();

                this._loadingText = false;

                var ext = _path.extname( this.filename ) || '.js';

                //Use custom extension if available
                if( Script.extensions_enabled && Script.hasExtension( ext ) ) {
                    this._script.paths = _module3.default._nodeModulePaths( _path.dirname( this.filename ) );

                    this._loading = true;

                    try {
                        if( this._willWatch ) {
                            this._do_watch( this._watchPersistent );
                        }

                        return _utilsJs.tryPromise( Script.extensions[ext]( this._script,
                            this.filename ) ).then( function( src ) {
                            if( _this7._loading ) {
                                _this7._source = src;
                                _this7._script.loaded = true;

                                _this7._loading = false;

                                _this7.emit( 'loaded', _this7._script.exports );
                            } else {
                                _this7.emit( 'error', new Error( 'The script ' + _this7.filename
                                                                 + ' was unloaded while performing an asynchronous operation.' ) );
                            }
                        }, function( err ) {
                            _this7._loading = false;

                            _this7.emit( 'error', err );
                        } );
                    } catch( err ) {
                        this._loading = false;

                        this.emit( 'error', err );
                    }
                } else {
                    /*
                     * This is the synchronous path. If custom extension handlers are used, this should never run
                     * */

                    if( !_module3.default._extensions.hasOwnProperty( ext ) ) {
                        this.emit( 'warning', 'The extension handler for ' + this.filename
                                              + ' does not exist, defaulting to .js handler' );
                    }

                    this._loading = true;

                    try {
                        if( this._willWatch ) {
                            this._do_watch( this._watchPersistent );
                        }

                        this._script.load( this._script.filename );

                        if( this._loading ) {
                            this.emit( 'loaded', this.loaded );
                        } else {
                            this.emit( 'error', new Error( 'The script ' + this.filename
                                                           + ' was unloaded while performing an asynchronous operation.' ) );
                        }
                    } catch( err ) {
                        this.emit( 'error', err );
                    } finally {
                        this._loading = false;
                    }
                }
            } else {
                this._loading = true;
                this._loadingText = true;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );
                    } catch( err ) {
                        this._loading = false;
                        this._loadingText = false;

                        this.emit( 'error', err );
                    }
                }

                return readFileAsync( this.filename ).then( function( src ) {
                    if( _this7._loading && _this7._loadingText ) {
                        _this7._source = src;
                        _this7._script.loaded = true;

                        _this7._loading = false;
                        _this7._loadingText = false;

                        _this7.emit( 'loaded_src', _this7.loaded );
                    } else if( !_this7._loading ) {
                        _this7.emit( 'error', new Error( 'The script ' + _this7.filename
                                                         + ' was unloaded while performing an asynchronous operation.' ) );
                    }
                }, function( err ) {
                    _this7._loading = false;
                    _this7._loadingText = false;

                    _this7.emit( 'error', err );
                } );
            }
        }
    };

    Script.prototype._do_watch = function _do_watch( persistent ) {
        var _this8 = this;

        if( !this.watched ) {
            var watcher = undefined;

            try {
                watcher = this._watcher = _fs.watch( this.filename, {
                    persistent: persistent
                } );
            } catch( err ) {
                throw _errorJs.normalizeError( this.filename, 'nodefine', err );
            }

            //These are separated out so rename and change events can be debounced separately.
            var onChange = _lodash2.default.debounce( function( event, filename ) {
                _this8.unload();
                _this8.emit( 'change', event, filename );
            }, this.debounceMaxWait );

            var onRename = _lodash2.default.debounce( function( event, filename ) {
                if( _this8._unloadOnRename ) {
                    _this8.unload();

                    _this8.emit( 'change', event, filename );
                } else {
                    var old_filename = _this8._script.filename;

                    //A simple rename doesn't change file content, so just change the filename
                    //and leave the script loaded
                    _this8._script.filename = filename;

                    _this8.emit( 'rename', old_filename, filename );
                }
            }, this.debounceMaxWait );

            watcher.on( 'change', function( event, filename ) {

                //resolve doesn't like nulls, so this has to be done first
                if( filename === null || filename === void 0 ) {
                    //Generally, if the filename was null, either the platform is unsupported
                    // or the file has been deleted. So just reopen it with a fresh watcher and stuff.
                    _this8.reopen();
                } else {

                    //This is important because fs.watch 'change' event only returns things like 'script.js'
                    //as a filename, which when resolved normally is relative to process.cwd(), not where the script
                    //actually is. So we have to get the directory of the last filename and combine it with the new name
                    filename = _path.resolve( _this8.baseUrl, filename );

                    if( event === 'change' ) {
                        onChange( event, filename );
                    } else if( event === 'rename' ) {
                        if( filename !== _this8.filename ) {
                            onRename( event, filename );
                        } else {
                            _this8.reopen();
                        }
                    }
                }
            } );

            watcher.on( 'error', function( error ) {
                //In the event of an error, unload and unwatch
                _this8.close( false );

                //Would it be better to throw?
                _this8.emit( 'error', error );
            } );
        }
    };

    Script.prototype.source = function source() {
        var _this9 = this;

        var encoding = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

        if( this.loaded ) {
            if( encoding !== null && encoding !== void 0 ) {
                return _bluebird2.default.resolve( this._source.toString( encoding ) );
            } else {
                return _bluebird2.default.resolve( this._source );
            }
        } else {
            /*
             * This is a special one were it doesn't matter which event triggers first.
             * */
            var waiting = _eventsJs.makeMultiEventPromise( this, ['loaded', 'loaded_src'], ['error'] );

            this._callWrapper( this._do_load );

            return waiting.then( function() {
                return _this9.source( encoding );
            } );
        }
    };

    Script.prototype.exports = function exports() {
        var _this10 = this;

        if( this.loaded ) {
            if( this.pending ) {
                //Add the event listeners first
                var waiting = _eventsJs.makeEventPromise( this, 'exports', 'error' );

                this._runMainFactory();

                return waiting;
            } else {
                return _bluebird2.default.resolve( this._script.exports );
            }
        } else if( this.textMode ) {
            return this.source().then( function() {
                return _this10.exports();
            } );
        } else {
            //Add the event listeners first
            var waiting = _eventsJs.makeEventPromise( this, 'loaded', 'error' );

            this._callWrapper( this._do_load );

            return waiting.then( function() {
                return _this10.exports();
            } );
        }
    };

    Script.prototype.call = function call() {
        for( var _len = arguments.length, args = Array( _len ), _key = 0; _key < _len; _key++ ) {
            args[_key] = arguments[_key];
        }

        return this.apply( args );
    };

    Script.prototype.apply = function apply( args ) {
        var _this11 = this;

        if( !this.textMode ) {
            return this.exports().then( function( main ) {
                if( main !== null && main !== void 0 ) {

                    if( main['default'] ) {
                        main = main['default'];
                    }

                    if( typeof main === 'function' ) {
                        if( _utilsJs.isGeneratorFunction( main ) ) {
                            main = _bluebird2.default.coroutine( main );
                        }

                        return _this11._callWrapper( main, null, args );
                    }
                }

                return main;
            } );
        } else {
            return this.source.apply( this, args );
        }
    };

    Script.prototype.load = function load( filename ) {
        var watch = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

        filename = _path.resolve( filename );

        this.close( false );

        this.id = _path.basename( filename );

        this._script.filename = filename;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    };

    Script.prototype.unload = function unload() {
        this.emit( 'unload' );

        this._script.loaded = false;
        this._script.exports = {};

        //unload also clears defines and requires
        this._defineCache.clear();
        this._loadCache.clear();

        this._pending = false;
        this._runningFactory = false;
        this._loading = false;
        this._loadingText = false;
    };

    Script.prototype.reload = function reload() {
        var _this12 = this;

        //Force it to reload and recompile the script.
        this._callWrapper( this._do_load ).then( function() {
            //If a Reference depends on this script, then it should be updated when it reloads
            //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
            _this12.emit( 'change', 'change', _this12.filename );
        } );
    };

    Script.prototype.watch = function watch() {
        var persistent = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

        if( !this.watched ) {
            this._willWatch = true;
            this._watchPersistent = persistent;
        } else if( this._willWatch ) {
            this._watchPersistent = persistent;
        }
    };

    Script.prototype.unwatch = function unwatch() {
        if( this.watched ) {
            //close the watched and null it to allow the GC to collect it
            this._watcher.close();

            delete this['_watcher'];

            this._willWatch = false;
        } else if( this._willWatch ) {
            this._willWatch = false;
        }
    };

    Script.prototype.reference = function reference() {
        for( var _len2 = arguments.length, args = Array( _len2 ), _key2 = 0; _key2 < _len2; _key2++ ) {
            args[_key2] = arguments[_key2];
        }

        return this.reference_apply( args );
    };

    Script.prototype.reference_apply = function reference_apply( args ) {
        _assert2.default( Array.isArray( args ), 'reference_apply only accepts an array of arguments' );

        return new _referenceJs2.default( this, args );
    };

    Script.prototype.reopen = function reopen() {
        this.unload();

        if( this.watched ) {
            this.unwatch();
            this.watch( this._watchPersistent );
        }

        this.emit( 'change', this.filename );
    };

    Script.prototype.close = function close() {
        var permanent = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

        this.unload();
        this.unwatch();

        this.emit( 'close', permanent );

        if( permanent ) {
            var _parent = this._script.parent;

            //Remove _script from parent
            if( _parent !== void 0 && _parent !== null ) {
                for( var it in _parent.children ) {
                    //Find which child is this._script, delete it and remove the (now undefined) reference
                    if( _parent.children.hasOwnProperty( it ) && _parent.children[it] === this._script ) {
                        delete _parent.children[it];
                        _parent.children.splice( it, 1 );
                        break;
                    }
                }
            }

            //Remove _script from current object
            return delete this['_script'];
        } else {
            this._script.filename = null;
        }
    };

    Script.prototype.include = function include( filename ) {
        throw new Error( 'Cannot include script "' + filename + '" from an unmanaged script' );
    };

    _createClass( Script, [
        {
            key: 'watched',
            get: function get() {
                return this._watcher instanceof _eventsJs.EventEmitter;
            }
        }, {
            key: 'willWatch',
            get: function get() {
                return !this.watched && this._willWatch;
            }
        }, {
            key: 'id',
            get: function get() {
                return this._script.id;
            },
            set: function set( value ) {
                this._script.id = value;
            }
        }, {
            key: 'children',
            get: function get() {
                return this._script.children;
            }
        }, {
            key: 'parent',
            get: function get() {
                return this._script.parent;
            }
        }, {
            key: 'loaded',
            get: function get() {
                return this._script.loaded;
            }
        }, {
            key: 'pending',
            get: function get() {
                return this._pending;
            }
        }, {
            key: 'loading',
            get: function get() {
                return this._loading;
            }
        }, {
            key: 'dependencies',
            get: function get() {
                return this._dependencies;
            }

            //Only allow getting the filename, setting should be done through .load
        }, {
            key: 'filename',
            get: function get() {
                return this._script.filename;
            }
        }, {
            key: 'manager',
            get: function get() {
                return null;
            }
        }, {
            key: 'baseUrl',
            get: function get() {
                return _path.posix.dirname( this.filename );
            }
        }, {
            key: 'debounceMaxWait',
            set: function set( time ) {
                time = Math.floor( time );

                _assert2.default( !isNaN( time ), 'debounceMaxWait must be set to a number' );

                this._debounceMaxWait = time;
            },
            get: function get() {
                return this._debounceMaxWait;
            }
        }, {
            key: 'textMode',
            get: function get() {
                return this._textMode;
            },
            set: function set( value ) {
                this._textMode = !!value;
            }
        }, {
            key: 'unloadOnRename',
            set: function set( value ) {
                this._unloadOnRename = !!value;
            },
            get: function get() {
                return this._unloadOnRename;
            }
        }
    ] );

    return Script;
})( _eventsJs.EventPropagator );

exports.default = Script;
//Node default maxListeners
