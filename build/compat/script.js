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

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _toConsumableArray = require( 'babel-runtime/helpers/to-consumable-array' )['default'];

var _slicedToArray = require( 'babel-runtime/helpers/sliced-to-array' )['default'];

var _Map = require( 'babel-runtime/core-js/map' )['default'];

var _regeneratorRuntime = require( 'babel-runtime/regenerator' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );
exports.load = load;

var _module2 = require( 'module' );

var _module3 = _interopRequireDefault( _module2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _fs = require( 'fs' );

var _url = require( 'url' );

var _path = require( 'path' );

var _errorJs = require( './error.js' );

var _eventsJs = require( './events.js' );

var _defaultsJs = require( './defaults.js' );

var _utilsJs = require( './utils.js' );

var _extensionsJs = require( './extensions.js' );

var _extensionsJs2 = _interopRequireDefault( _extensionsJs );

var _referenceJs = require( './reference.js' );

var _referenceJs2 = _interopRequireDefault( _referenceJs );

var readFileAsync = _bluebird2['default'].promisify( _fs.readFile );

var promisifyCache = new _Map();

function load( filename ) {
    var watch = arguments[1] === undefined ? true : arguments[1];
    var parent = arguments[2] === undefined ? null : arguments[2];

    filename = (0, _path.resolve)( filename );

    var script = new Script( null, parent );

    script.load( filename, watch );

    return script;
}

var Script = (function( _EventPropagator ) {
    function Script( filename, parent ) {
        _classCallCheck( this, Script );

        _get( Object.getPrototypeOf( Script.prototype ), 'constructor', this ).call( this );

        this._script = null;
        this._source = null;
        this._factory = null;
        this._watcher = null;
        this._willWatch = false;
        this._watchPersistent = false;
        this._maxListeners = 10;
        this._recursion = 0;
        this._maxRecursion = _defaultsJs.default_max_recursion;
        this._debounceMaxWait = _defaultsJs.default_max_debounceMaxWait;
        this._textMode = false;
        this._defineCache = new _Map();
        this._loadCache = new _Map();
        this._pending = false;
        this._loading = false;
        this._loadingText = false;
        this._runningFactory = false;
        this._config = (0, _utilsJs.normalizeConfig)( null );
        this._dependencies = [];
        this.require = null;
        this.define = null;
        this.imports = {};
        if( parent === void 0 || parent === null ) {
            if( filename instanceof _module3['default'].Module ) {
                parent = filename;
                filename = null;
            } else {
                parent = module;
            }
        }

        this._script = new _module3['default']( null, parent );

        //Explicit comparisons to appease JSHint
        if( filename !== void 0 && filename !== null ) {
            this.load( filename );
        }

        this._init();
    }

    _inherits( Script, _EventPropagator );

    _createClass( Script, [{
        key:   '_init',
        value: function _init() {
            var _this = this;

            var require = this._require.bind( this );
            var define = this._define.bind( this );

            require.toUrl = function() {
                var filepath = arguments[0] === undefined ? _this.filename : arguments[0];

                _assert2['default'].strictEqual( typeof filepath, 'string',
                                                 'require.toUrl takes a string as filepath' );

                if( filepath.charAt( 0 ) === '.' ) {
                    //Use the url.resolve instead of resolve, even though they usually do the same thing
                    return (0, _url.resolve)( _this.baseUrl, filepath );
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

                _this._loadCache['delete']( id );
                _this._defineCache['delete']( id );

                return _this;
            };

            //This is not an anonymous so stack traces make a bit more sense
            require.onError = function onErrorDefault( err ) {
                throw err; //default error
            };

            //This is almost exactly like the normal require.resolve, but it's relative to this.baseUrl
            require.resolve = function( id ) {
                var relative = (0, _path.resolve)( _this.baseUrl, id );
                return _module3['default']._resolveFilename( relative, _this._script );
            };

            define.require = require;

            define.amd = {
                jQuery: false
            };

            require.define = define;

            this.require = require;
            this.define = define;
        }
    }, {
        key:   'setMaxListeners',
        value: function setMaxListeners( num ) {
            num = Math.floor( num );

            (0, _assert2['default'])( !isNaN( num ), 'maxListeners must be set to a number' );

            this._maxListeners = num;

            _get( Object.getPrototypeOf( Script.prototype ), 'setMaxListeners', this ).call( this, num );
        }
    }, {
        key:   'getMaxListeners',
        value: function getMaxListeners() {
            if( typeof _get( Object.getPrototypeOf( Script.prototype ), 'getMaxListeners', this ) === 'function' ) {
                return _get( Object.getPrototypeOf( Script.prototype ), 'getMaxListeners', this ).call( this );
            } else {
                return this._maxListeners;
            }
        }
    }, {
        key:   'config',
        value: function config( _config2 ) {
            var alreadyNormalized = arguments[1] === undefined ? false : arguments[1];

            if( _config2 !== void 0 && _config2 !== null ) {
                if( alreadyNormalized ) {
                    this._config = _config2;
                } else {
                    this._config = (0, _utilsJs.normalizeConfig)( _config2 );
                }
            }
        }
    }, {
        key:   'isManaged',
        value: function isManaged() {
            return this.manager !== null && this.manager !== void 0;
        }
    }, {
        key:   '_callWrapper',
        value: function _callWrapper( func ) {
            var _this2 = this;

            var context = arguments[1] === undefined ? this : arguments[1];
            var args = arguments[2] === undefined ? [] : arguments[2];

            //Just in case, always use recursion protection
            if( this._recursion > this._maxRecursion ) {
                return _bluebird2['default'].reject( new RangeError( 'Script recursion limit reached at '
                                                                     + this._recursion + ' for script '
                                                                     + this.filename ) );
            } else {
                var res = new _bluebird2['default']( function( resolve, reject ) {
                    _this2._recursion++;

                    resolve( func.apply( context, args ) );
                } );

                return res['catch']( function( e ) {
                    _this2.unload();

                    return _bluebird2['default'].reject( e );
                } )['finally']( function() {
                    _this2._recursion--;
                } );
            }
        }
    }, {
        key:   '_runFactory',
        value: function _runFactory( id, deps, factory ) {
            var _this3 = this;

            if( id !== void 0 && id !== null ) {
                //clear before running. Will remained cleared in the event of error
                this._loadCache['delete']( id );
            }

            if( typeof factory === 'function' ) {
                /*
                 * If this is true, generators are obviously supported.
                 * */
                if( (0, _utilsJs.isGeneratorFunction)( factory ) ) {
                    factory = _bluebird2['default'].coroutine( factory );
                }

                return this._require( deps ).then( function( resolvedDeps ) {
                    return factory.apply( _this3._script.exports, resolvedDeps );
                } );
            } else {
                //On the off chance the function factory is a promise, run it through again if need be
                return (0, _utilsJs.tryPromise)( factory ).then( function( resolvedFactory ) {
                    if( typeof factory === 'function' ) {
                        return _this3._runFactory( id, deps, resolvedFactory );
                    } else {
                        return resolvedFactory;
                    }
                } );
            }
        }
    }, {
        key:   '_runMainFactory',
        value: function _runMainFactory() {
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
                    }
                }, function( err ) {
                    _this4._runningFactory = false;

                    _this4.emit( 'exports_error', err );
                } );
            }
        }
    }, {
        key:   '_require',
        value: function _require( id ) {
            var normalize, _ret, script, args, filepath;

            return _regeneratorRuntime.async( function _require$( context$2$0 ) {
                var _this5 = this;

                while( 1 ) switch( context$2$0.prev = context$2$0.next ) {
                    case 0:
                        normalize = _path.resolve.bind( null, this.baseUrl );

                        if( !Array.isArray( id ) ) {
                            context$2$0.next = 5;
                            break;
                        }

                        return context$2$0.abrupt( 'return', _bluebird2['default'].map( id, function( id ) {
                            return _this5._require( id );
                        } ) );

                    case 5:
                        _assert2['default'].strictEqual( typeof id, 'string',
                                                         'require id must be a string or array of strings' );

                        if( !(id.indexOf( '!' ) !== -1) ) {
                            context$2$0.next = 14;
                            break;
                        }

                        context$2$0.next = 9;
                        return _regeneratorRuntime.awrap( (function callee$2$0() {
                            var parts, plugin, plugin_id;
                            return _regeneratorRuntime.async( function callee$2$0$( context$3$0 ) {
                                var _this6 = this;

                                while( 1 ) {
                                    switch( context$3$0.prev = context$3$0.next ) {
                                        case 0:
                                            parts = id.split( '!', 2 );
                                            plugin = undefined, plugin_id = parts[0];

                                            if( !(plugin_id === 'include') ) {
                                                context$3$0.next = 6;
                                                break;
                                            }

                                            plugin = {
                                                normalize: function normalize( id, defaultNormalize ) {
                                                    return defaultNormalize( id );
                                                },
                                                load:      function load( id, require, _onLoad, config ) {
                                                    try {
                                                        var script = _this6.include( id );

                                                        script.textMode = false;

                                                        _onLoad( script );
                                                    } catch( err ) {
                                                        _onLoad.error( err );
                                                    }
                                                }
                                            };

                                            context$3$0.next = 17;
                                            break;

                                        case 6:
                                            if( !(plugin_id === 'promisify') ) {
                                                context$3$0.next = 10;
                                                break;
                                            }

                                            plugin = {
                                                load: function load( id, require, _onLoad, config ) {
                                                    if( promisifyCache.has( id ) ) {
                                                        _onLoad( promisifyCache.get( id ) );
                                                    } else {
                                                        _this6._require( id ).then( function( obj ) {
                                                            if( typeof obj === 'function' ) {
                                                                return _bluebird2['default'].promisify( obj );
                                                            } else if( typeof obj === 'object' ) {
                                                                var newObj = _lodash2['default'].clone( obj );

                                                                return _bluebird2['default'].promisifyAll( newObj );
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

                                            context$3$0.next = 17;
                                            break;

                                        case 10:
                                            if( !(plugin_id === 'text') ) {
                                                context$3$0.next = 14;
                                                break;
                                            }

                                            plugin = {
                                                normalize: function normalize( id, defaultNormalize ) {
                                                    return defaultNormalize( id );
                                                },
                                                load:      function load( id, require, _onLoad, config ) {
                                                    try {
                                                        var script = _this6.include( id );

                                                        script.textMode = true;

                                                        _onLoad( script );
                                                    } catch( err ) {
                                                        _onLoad.error( err );
                                                    }
                                                }
                                            };

                                            context$3$0.next = 17;
                                            break;

                                        case 14:
                                            context$3$0.next = 16;
                                            return _regeneratorRuntime.awrap( this._require( plugin_id ) );

                                        case 16:
                                            plugin = context$3$0.sent;

                                        case 17:

                                            (0, _assert2['default'])( plugin !== void 0 && plugin !== null,
                                                                      'Invalid AMD plugin: ' + plugin_id );
                                            _assert2['default'].strictEqual( typeof plugin.load, 'function',
                                                                             '.load function on AMD plugin not found' );

                                            id = parts[1];

                                            if( typeof plugin.normalize === 'function' ) {
                                                id = plugin.normalize( id, normalize );
                                            } else if( id.charAt( 0 ) === '.' ) {
                                                id = normalize( id );
                                            }

                                            return context$3$0.abrupt( 'return', {
                                                v: new _bluebird2['default']( function( resolve, reject ) {
                                                    if( _this6._loadCache.has( id ) ) {
                                                        resolve( _this6._loadCache.get( id ) );
                                                    } else {
                                                        (function() {
                                                            var onLoad = function onLoad( value ) {
                                                                _this6._loadCache.set( id, value );

                                                                resolve( value );
                                                            };

                                                            onLoad.fromText = function( text ) {
                                                                //Exploit Scriptor as much as possible
                                                                compile( text ).exports().then( onLoad, onLoad.error );
                                                            };

                                                            onLoad.error = function( err ) {
                                                                reject( (0, _errorJs.normalizeError)( id, 'scripterror',
                                                                                                      err ) );
                                                            };

                                                            //Since onload is a closure, it 'this' is implicitly bound
                                                            // with TypeScript
                                                            plugin.load( id, _this6.require, onLoad, _this6._config );
                                                        })();
                                                    }
                                                } )
                                            } );

                                        case 22:
                                        case 'end':
                                            return context$3$0.stop();
                                    }
                                }
                            }, null, _this5 );
                        })() );

                    case 9:
                        _ret = context$2$0.sent;

                        if( !(typeof _ret === 'object') ) {
                            context$2$0.next = 12;
                            break;
                        }

                        return context$2$0.abrupt( 'return', _ret.v );

                    case 12:
                        context$2$0.next = 61;
                        break;

                    case 14:
                        if( !(0, _utilsJs.isAbsoluteOrRelative)( id ) ) {
                            context$2$0.next = 21;
                            break;
                        }

                        id = _module3['default']._resolveFilename( normalize( id ), this.parent );

                        script = undefined;

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

                            script.maxRecursion = this.maxRecursion;
                        }

                        return context$2$0.abrupt( 'return', script.exports() );

                    case 21:
                        if( !(id === 'require') ) {
                            context$2$0.next = 25;
                            break;
                        }

                        return context$2$0.abrupt( 'return', this.require );

                    case 25:
                        if( !(id === 'exports') ) {
                            context$2$0.next = 29;
                            break;
                        }

                        return context$2$0.abrupt( 'return', this._script.exports );

                    case 29:
                        if( !(id === 'module') ) {
                            context$2$0.next = 33;
                            break;
                        }

                        return context$2$0.abrupt( 'return', this._script );

                    case 33:
                        if( !(id === 'imports') ) {
                            context$2$0.next = 37;
                            break;
                        }

                        return context$2$0.abrupt( 'return', this.imports );

                    case 37:
                        if( !(id === 'Promise') ) {
                            context$2$0.next = 41;
                            break;
                        }

                        return context$2$0.abrupt( 'return', _bluebird2['default'] );

                    case 41:
                        if( !(id === 'Scriptor') ) {
                            context$2$0.next = 45;
                            break;
                        }

                        return context$2$0.abrupt( 'return', Script.Scriptor );

                    case 45:
                        if( !this._loadCache.has( id ) ) {
                            context$2$0.next = 49;
                            break;
                        }

                        return context$2$0.abrupt( 'return', this._loadCache.get( id ) );

                    case 49:
                        if( !this._defineCache.has( id ) ) {
                            context$2$0.next = 54;
                            break;
                        }

                        args = this._defineCache.get( id );
                        return context$2$0.abrupt( 'return', this._runFactory.apply( this,
                                                                                     _toConsumableArray( args ) ).then( function( exported ) {
                                                                                                                                                                                         _this5._loadCache.set( id,
                                                                                                                                                                                                                exported );

                                                                                                                                                                                         return exported;
                                                                                                                                                                                     } ) );

                    case 54:
                        if( !this._config.paths.hasOwnProperty( id ) ) {
                            context$2$0.next = 60;
                            break;
                        }

                        filepath = this._config.paths[id];

                        if( filepath.charAt( 0 ) === '.' ) {
                            filepath = (0, _path.resolve)( this.baseUrl, filepath );
                        }

                        return context$2$0.abrupt( 'return', this.require( filepath ) );

                    case 60:
                        return context$2$0.abrupt( 'return', new _bluebird2['default']( function( resolve, reject ) {
                            try {
                                //Normal module loading akin to the real 'require' function
                                resolve( _this5._script.require( id ) );
                            } catch( err ) {
                                reject( (0, _errorJs.normalizeError)( id, 'nodefine', err ) );
                            }
                        } ) );

                    case 61:
                    case 'end':
                        return context$2$0.stop();
                }
            }, null, this );
        }
    }, {
        key:   '_define',
        value: function _define() {
            var define_args = _utilsJs.parseDefine.apply( undefined, arguments );

            var _define_args = _slicedToArray( define_args, 1 );

            var id = _define_args[0];

            if( id !== void 0 ) {
                _assert2['default'].notStrictEqual( id.charAt( 0 ), '.',
                                                    'module identifiers cannot be relative paths' );

                this._defineCache.set( id, define_args );
            } else {
                this._dependencies = define_args[1];
                this._factory = define_args[2];

                this._runMainFactory();
            }
        }
    }, {
        key:   '_do_setup',
        value: function _do_setup() {
            var _this7 = this;

            this._script.imports = this.imports;

            this._script.define = (0, _utilsJs.bind)( this.define, this );

            this._script.include = this.include.bind( this );

            this._script.on = this._script.addListener = this._script.once = function( event, cb ) {
                _assert2['default'].equal( event, 'unload', 'modules can only listen for the unload event' );

                return _this7.once( event, cb );
            };
        }
    }, {
        key:   '_do_load',
        value: function _do_load() {
            var _this8 = this;

            _assert2['default'].notEqual( this.filename, null, 'Cannot load a script without a filename' );

            if( !this.loading || this._loadingText && !this.textMode ) {
                this.unload();

                if( !this.textMode ) {
                    this._do_setup();

                    this._loadingText = false;

                    var ext = (0, _path.extname)( this.filename ) || '.js';

                    //Use custom extension if available
                    if( Script.extensions_enabled && Script.hasExtension( ext ) ) {
                        this._script.paths =
                            _module3['default']._nodeModulePaths( (0, _path.dirname)( this.filename ) );

                        this._loading = true;

                        if( this._willWatch ) {
                            try {
                                this._do_watch( this._watchPersistent );

                                (0, _utilsJs.tryPromise)( Script.extensions[ext]( this._script,
                                                                                  this.filename ) ).then( function( src ) {
                                    if( _this8._loading ) {
                                        _this8._source = src;
                                        _this8._script.loaded = true;

                                        _this8._loading = false;

                                        _this8.emit( 'loaded', _this8._script.exports );
                                    }
                                }, function( err ) {
                                    _this8._loading = false;

                                    _this8.emit( 'loading_error', err );
                                } );
                            } catch( err ) {
                                this._loading = false;

                                this.emit( 'loading_error', err );
                            }
                        }
                    } else {
                        /*
                         * This is the synchronous path. If custom extension handlers are used, this should never run
                         * */

                        if( !_module3['default']._extensions.hasOwnProperty( ext ) ) {
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
                            }
                        } catch( err ) {
                            this.emit( 'loading_error', err );
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

                            this.emit( 'loading_src_error', err );
                        }
                    }

                    return readFileAsync( this.filename ).then( function( src ) {
                        if( _this8._loading && _this8._loadingText ) {
                            _this8._source = src;
                            _this8._script.loaded = true;

                            _this8._loading = false;
                            _this8._loadingText = false;

                            _this8.emit( 'loaded_src', _this8.loaded );
                        }
                    }, function( err ) {
                        _this8._loading = false;
                        _this8._loadingText = false;

                        _this8.emit( 'loading_src_error', err );
                    } );
                }
            }
        }
    }, {
        key:   '_do_watch',
        value: function _do_watch( persistent ) {
            var _this9 = this;

            if( !this.watched ) {
                var watcher = undefined;

                try {
                    watcher = this._watcher = (0, _fs.watch)( this.filename, {
                        persistent: persistent
                    } );
                } catch( err ) {
                    throw (0, _errorJs.normalizeError)( this.filename, 'nodefine', err );
                }

                //These are separated out so rename and change events can be debounced separately.
                var onChange = _lodash2['default'].debounce( function( event, filename ) {
                    _this9.unload();
                    _this9.emit( 'change', event, filename );
                }, this.debounceMaxWait );

                var onRename = _lodash2['default'].debounce( function( event, filename ) {
                    var old_filename = _this9._script.filename;

                    //A simple rename doesn't change file content, so just change the filename
                    //and leave the script loaded
                    _this9._script.filename = filename;

                    _this9.emit( 'rename', old_filename, filename );
                }, this.debounceMaxWait );

                watcher.on( 'change', function( event, filename ) {

                    //resolve doesn't like nulls, so this has to be done first
                    if( filename === null || filename === void 0 ) {
                        //Generally, if the filename was null, either the platform is unsupported
                        // or the file has been deleted. So just reopen it with a fresh watcher and stuff.
                        _this9.reopen();
                    } else {

                        //This is important because fs.watch 'change' event only returns things like 'script.js'
                        //as a filename, which when resolved normally is relative to process.cwd(), not where the
                        // script
                        //actually is. So we have to get the directory of the last filename and combine it with the new
                        // name
                        filename = (0, _path.resolve)( _this9.baseUrl, filename );

                        if( event === 'change' && _this9.loaded ) {
                            onChange( event, filename );
                        } else if( event === 'rename' && filename !== _this9.filename ) {
                            onRename( event, filename );
                        }
                    }
                } );

                watcher.on( 'error', function( error ) {
                    //In the event of an error, unload and unwatch
                    _this9.close( false );

                    //Would it be better to throw?
                    _this9.emit( 'error', error );
                } );
            }
        }
    }, {
        key:   'source',
        value: function source() {
            var _this10 = this;

            var encoding = arguments[0] === undefined ? null : arguments[0];

            if( this.loaded ) {
                if( encoding !== null && encoding !== void 0 ) {
                    return _bluebird2['default'].resolve( this._source.toString( encoding ) );
                } else {
                    return _bluebird2['default'].resolve( this._source );
                }
            } else {
                /*
                 * This is a special one were it doesn't matter which event triggers first.
                 * */
                var waiting = (0, _eventsJs.makeMultiEventPromise)( this, ['loaded', 'loaded_src'],
                                                                    ['loading_error', 'loading_src_error'] );

                return _bluebird2['default'].all( [this._callWrapper( this._do_load ), waiting] ).then( function() {
                    return _this10.source( encoding );
                } );
            }
        }
    }, {
        key:   'exports',
        value: function exports() {
            var _this11 = this;

            if( this.loaded ) {
                if( this.pending ) {
                    //Add the event listeners first
                    var waiting = (0, _eventsJs.makeEventPromise)( this, 'exports', 'exports_error' );

                    this._runMainFactory();

                    return waiting;
                } else {
                    return _bluebird2['default'].resolve( this._script.exports );
                }
            } else if( this.textMode ) {
                return this.source().then( function() {
                    return _this11.exports();
                } );
            } else {
                //Add the event listeners first
                var waiting = (0, _eventsJs.makeEventPromise)( this, 'loaded', 'loading_error' );

                this._callWrapper( this._do_load );

                return waiting.then( function() {
                    return _this11.exports();
                } );
            }
        }
    }, {
        key:   'call',
        value: function call() {
            for( var _len = arguments.length, args = Array( _len ), _key = 0; _key < _len; _key++ ) {
                args[_key] = arguments[_key];
            }

            return this.apply( args );
        }
    }, {
        key:   'apply',
        value: function apply( args ) {
            var _this12 = this;

            if( !this.textMode ) {
                return this.exports().then( function( main ) {
                    if( typeof main === 'function' || main !== void 0 && main !== null && typeof main['default']
                                                                                          === 'function' ) {

                        if( typeof main['default'] === 'function' ) {
                            main = main['default'];
                        }

                        if( (0, _utilsJs.isGeneratorFunction)( main ) ) {
                            main = _bluebird2['default'].coroutine( main );
                        }

                        return _this12._callWrapper( main, null, args );
                    } else {
                        return main;
                    }
                } );
            } else {
                return this.source.apply( this, _toConsumableArray( args ) );
            }
        }
    }, {
        key:   'load',
        value: function load( filename ) {
            var watch = arguments[1] === undefined ? true : arguments[1];

            filename = (0, _path.resolve)( filename );

            this.close( false );

            this.id = (0, _path.basename)( filename );

            this._script.filename = filename;

            if( watch ) {
                this.watch();
            }

            this.emit( 'change', 'change', this.filename );

            return this;
        }
    }, {
        key:   'unload',
        value: function unload() {
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
        }
    }, {
        key:   'reload',
        value: function reload() {
            var _this13 = this;

            //Force it to reload and recompile the script.
            this._callWrapper( this._do_load ).then( function() {
                //If a Reference depends on this script, then it should be updated when it reloads
                //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
                _this13.emit( 'change', 'change', _this13.filename );
            } );
        }
    }, {
        key:   'watch',
        value: function watch() {
            var persistent = arguments[0] === undefined ? false : arguments[0];

            if( !this.watched ) {
                this._willWatch = true;
                this._watchPersistent = persistent;
            } else if( this._willWatch ) {
                this._watchPersistent = persistent;
            }
        }
    }, {
        key:   'unwatch',
        value: function unwatch() {
            if( this.watched ) {
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();

                delete this['_watcher'];

                this._willWatch = false;
            } else if( this._willWatch ) {
                this._willWatch = false;
            }
        }
    }, {
        key:   'reference',
        value: function reference() {
            for( var _len2 = arguments.length, args = Array( _len2 ), _key2 = 0; _key2 < _len2; _key2++ ) {
                args[_key2] = arguments[_key2];
            }

            return this.reference_apply( args );
        }
    }, {
        key:   'reference_apply',
        value: function reference_apply( args ) {
            (0, _assert2['default'])( Array.isArray( args ), 'reference_apply only accepts an array of arguments' );

            return new _referenceJs2['default']( this, args );
        }
    }, {
        key:   'reopen',
        value: function reopen() {
            this.unload();

            if( this.watched ) {
                this.unwatch();
                this.watch( this._watchPersistent );
            }

            this.emit( 'change', this.filename );
        }
    }, {
        key:   'close',
        value: function close() {
            var permanent = arguments[0] === undefined ? true : arguments[0];

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
        }
    }, {
        key:   'include',
        value: function include( filename ) {
            throw new Error( 'Cannot include script "' + filename + '" from an unmanaged script' );
        }
    }, {
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
    }, {
        key: 'filename',

        //Only allow getting the filename, setting should be done through .load
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

        //Based on the RequireJS 'standard' for relative locations
        //For SourceScripts, just set the filename to something relative
        get: function get() {
            return _path.posix.dirname( this.filename );
        }
    }, {
        key: 'maxRecursion',
        set: function set( value ) {
            value = Math.floor( value );

            (0, _assert2['default'])( !isNaN( value ), 'maxRecursion must be set to a number' );

            this._maxRecursion = value;
        },
        get: function get() {
            return this._maxRecursion;
        }
    }, {
        key: 'debounceMaxWait',
        set: function set( time ) {
            time = Math.floor( time );

            (0, _assert2['default'])( !isNaN( time ), 'debounceMaxWait must be set to a number' );

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
    }], [{
        key:   'hasExtension',
        value: function hasExtension( ext ) {
            return Script.extensions.hasOwnProperty( ext );
        }
    }, {
        key:        'Scriptor',
        value:      null,
        enumerable: true
    }, {
        key:        'extensions_enabled',
        value:      true,
        enumerable: true
    }, {
        key:        'extensions',
        value:      _extensionsJs2['default'],
        enumerable: true
    }] );

    return Script;
})( _eventsJs.EventPropagator );

exports['default'] = Script;
//Node default maxListeners

//Plugins ARE supported, but they have to work like a normal module
