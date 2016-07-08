/**
 * Created by Aaron on 7/5/2015.
 */

import Module from "module";
import assert from "assert";
import Promise from "bluebird";
import {clone, debounce} from "lodash";
import {readFile, watch as watchFile} from "fs";
import {resolve as resolveURL} from "url";
import {extname, dirname, basename, resolve, relative, posix as path} from "path";
import {normalizeError} from "./error.js";
import defaultExtensions from "./extensions.js";
import {EventEmitter} from "events";
import {EventPropagator} from "event-propagator";
import {promisifyEvents} from "promisify-events";
import {default_max_debounceMaxWait} from "./defaults.js";
import {tryPromise, isThenable, isGeneratorFunction, isAbsoluteOrRelative, normalizeConfig, parseDefine} from "./utils.js";

let promisifyCache = new Map();

let readFileAsync = Promise.promisify( readFile );

export function load( filename, watch = true, parent = null ) {

    filename = resolve( filename );

    let script = new Script( null, parent );

    script.load( filename, watch );

    return script;
}

export default class Script extends EventPropagator {
    _script  = null;
    _source  = null;
    _factory = null;
    _watcher = null;

    _willWatch       = false;
    _watchPersistent = false;

    _maxListeners = 10; //Node default maxListeners

    _debounceMaxWait = default_max_debounceMaxWait;

    _textMode = false;

    _defineCache = new Map();
    _loadCache   = new Map();

    _pending        = false;
    _loading        = false;
    _loadingText    = false;
    _runningFactory = false;

    _config = normalizeConfig( null );

    _dependencies = [];

    _unloadOnRename = false;

    require = null;
    define  = null;

    imports = {};

    static Scriptor = null;

    static extensions_enabled = true;
    static extensions         = defaultExtensions;

    static hasExtension( ext ) {
        return Script.extensions.hasOwnProperty( ext );
    }

    /*
     * Because of the dynamic nature of JavaScript and AMD, these functions need to be set up at runtime.
     * */
    _init() {
        let require = ( ...args ) => {
            return this._require( ...args );
        };

        let define = ( ...args ) => {
            return this._define( ...args );
        };

        //This is supposed to return a URL to where the file is, but since we're server side I dont' really know what it's supposed to do.
        require.toUrl = ( filepath = this.filename ) => {
            assert.strictEqual( typeof filepath, 'string', 'require.toUrl takes a string as filepath' );

            if( filepath.charAt( 0 ) === '.' ) {
                //Use the url.resolve instead of resolve, even though they usually do the same thing
                return resolveURL( this.baseUrl, filepath );

            } else {
                return filepath;
            }
        };

        require.defined = ( id ) => {
            return this._loadCache.has( path.normalize( id ) );
        };

        require.specified = ( id ) => {
            return this._defineCache.has( path.normalize( id ) );
        };

        require.undef = ( id ) => {
            id = path.normalize( id );

            this._loadCache.delete( id );
            this._defineCache.delete( id );

            return this;
        };

        //This is not an anonymous so stack traces make a bit more sense
        require.onError = function onErrorDefault( err ) {
            throw err; //default error
        };

        //This is almost exactly like the normal require.resolve, but it's relative to this.baseUrl
        require.resolve = ( id ) => {
            let relative = resolve( this.baseUrl, id );
            return Module._resolveFilename( relative, this._script );
        };

        define.require = require;

        define.amd = {
            jQuery: false
        };

        require.define = define;

        this.require = require;
        this.define  = define;
    }

    constructor( filename, parent ) {
        super();

        if( parent === void 0 || parent === null ) {
            if( filename instanceof Module.Module ) {
                parent   = filename;
                filename = null;

            } else {
                parent = module;
            }
        }

        this._script = new Module( null, parent );

        if( filename !== void 0 && filename !== null ) {
            this.load( filename );
        }

        this._init();
    }

    setMaxListeners( num ) {
        num = Math.floor( num );

        assert( !isNaN( num ), 'maxListeners must be set to a number' );

        this._maxListeners = num;

        super.setMaxListeners( num );
    }

    getMaxListeners() {
        if( typeof super.getMaxListeners === 'function' ) {
            return super.getMaxListeners();

        } else {
            return this._maxListeners;
        }
    }

    config( config, alreadyNormalized = false ) {
        if( config !== void 0 && config !== null ) {
            if( alreadyNormalized ) {
                this._config = config;

            } else {
                this._config = normalizeConfig( config );
            }
        }
    }

    get watched() {
        return this._watcher instanceof EventEmitter;
    }

    get willWatch() {
        return !this.watched && this._willWatch;
    }

    get id() {
        return this._script.id;
    }

    set id( value ) {
        this._script.id = value;
    }

    get children() {
        return this._script.children;
    }

    get parent() {
        return this._script.parent;
    }

    get loaded() {
        return this._script.loaded;
    }

    get pending() {
        return this._pending;
    }

    get loading() {
        return this._loading;
    }

    get dependencies() {
        return this._dependencies;
    }

    //Only allow getting the filename, setting should be done through .load
    get filename() {
        return this._script.filename;
    }

    get manager() {
        return null;
    }

    isManaged() {
        return this.manager !== null && this.manager !== void 0;
    }

    /*
     * Based on the RequireJS 'standard' for relative locations
     * For SourceScripts, just set the filename to something relative
     * */
    get baseUrl() {
        return path.dirname( this.filename );
    }

    set debounceMaxWait( time ) {
        time = Math.floor( time );

        assert( !isNaN( time ), 'debounceMaxWait must be set to a number' );

        this._debounceMaxWait = time;
    }

    get debounceMaxWait() {
        return this._debounceMaxWait;
    }

    get textMode() {
        return this._textMode;
    }

    set textMode( value ) {
        this._textMode = !!value;
    }

    set unloadOnRename( value ) {
        this._unloadOnRename = !!value;
    }

    get unloadOnRename() {
        return this._unloadOnRename;
    }

    /*
     * This is a little function that wraps the execution of another (possibly asynchronous) function
     * in a try-catch statement and a Promise, containing any weirdness that could occur.
     * */
    _callWrapper( func, context = this, args = [] ) {
        return new Promise( ( resolve, reject ) => {
            try {
                let res = func.apply( context, args );

                if( isThenable( res ) ) {
                    res.then( resolve, reject );

                } else {
                    resolve( res );
                }

            } catch( err ) {
                this.unload();

                reject( err );
            }
        } );
    }

    /*
     * Anything defined with "define" has a factory function, which this function executes. It supports caching factory results and even
     * asynchronous factories with coroutines.
     * */
    _runFactory( id, deps, factory ) {
        if( id !== void 0 && id !== null ) {
            //clear before running. Will remained cleared in the event of error
            this._loadCache.delete( id );
        }

        if( typeof factory === 'function' ) {
            /*
             * If this is true, generators are obviously supported.
             * */
            if( isGeneratorFunction( factory ) ) {
                factory = Promise.coroutine( factory );
            }

            return this._require( deps ).then( resolvedDeps => {
                return factory.apply( this._script.exports, resolvedDeps );
            } );

        } else {
            //On the off chance the function factory is a promise, run it through again if need be
            return tryPromise( factory ).then( resolvedFactory => {
                if( typeof factory === 'function' ) {
                    return this._runFactory( id, deps, resolvedFactory );

                } else {
                    return resolvedFactory;
                }
            } );
        }
    }

    /*
     * The "main" factory is the one defined without an ID, and there can only be one per module.
     * */
    _runMainFactory() {
        if( !this._runningFactory ) {
            this._runningFactory = true;
            this._pending        = true;

            return this._runFactory( null, this._dependencies, this._factory ).then( result => {
                if( this._pending ) {
                    //To match AMDefine, don't export the result unless there is one.
                    //Null is allowed, since it would have to have been returned explicitly.
                    if( result !== void 0 ) {
                        this._script.exports = result;
                    }

                    this._pending        = false;
                    this._runningFactory = false;

                    this.emit( 'exports', this._script.exports );

                } else {
                    this.emit( 'error',
                        new Error( `The script ${this.filename} was unloaded while performing an asynchronous operation.` ) );
                }

            }, err => {
                this._runningFactory = false;

                this.emit( 'error', err );
            } );
        }
    }

    /*
     * This behemoth of a function does all the dependency loading for scripts, as asynchronously as possible.
     * 
     * Any dependency given with 'define' is passed through this function. 
     */
    async _require( id ) {
        let normalize = resolve.bind( null, this.baseUrl );

        if( Array.isArray( id ) ) {
            return Promise.map( id, id => this._require( id ) );

        } else {
            assert.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );

            //Plugins ARE supported, but they have to work like a normal module
            if( id.indexOf( '!' ) !== -1 ) {
                let parts = id.split( '!', 2 );

                let plugin, plugin_id = parts[0];

                if( plugin_id === 'include' ) {
                    /*
                     * This is a built-in plugin that uses the ManagedScript 'include' function to load up another script.
                     * 
                     * NOTE: This can only be used with ManagedScripts
                     * */
                    plugin = {
                        normalize: ( id, defaultNormalize ) => {
                            return defaultNormalize( id );
                        },
                        load:      ( id, require, _onLoad, config ) => {
                            try {
                                let script = this.include( id );

                                script.textMode = false;

                                _onLoad( script );

                            } catch( err ) {
                                _onLoad.error( err );
                            }
                        }
                    };

                } else if( plugin_id === 'promisify' ) {
                    /*
                     * This is a built-in plugin that uses Bluebird's Promisify function to automatically promisify loaded modules.
                     * 
                     * e.g.: _require('promisify!fs') will load the same as var fs = Bluebird.PromisifyAll(require('fs'));
                     * */
                    plugin = {
                        load: ( id, require, _onLoad, config ) => {
                            if( promisifyCache.has( id ) ) {
                                _onLoad( promisifyCache.get( id ) );

                            } else {
                                this._require( id ).then( obj => {
                                    if( typeof obj === 'function' ) {
                                        return Promise.promisify( obj );

                                    } else if( typeof obj === 'object' ) {
                                        let newObj = clone( obj );

                                        return Promise.promisifyAll( newObj );

                                    } else {
                                        return null;
                                    }

                                } ).then( obj => {
                                    promisifyCache.set( id, obj );

                                    return obj;
                                } ).then( _onLoad, _onLoad.error );
                            }
                        }
                    };

                } else if( plugin_id === 'text' ) {
                    /*
                     * This is a built-in plugin that loads the script in textMode. It's not a TextScript, though, and can later be changed
                     * to normal mode
                     * */
                    plugin = {
                        normalize: ( id, defaultNormalize ) => {
                            return defaultNormalize( id );
                        },
                        load:      ( id, require, _onLoad, config ) => {
                            try {
                                let script = this.include( id );

                                script.textMode = true;

                                _onLoad( script );

                            } catch( err ) {
                                _onLoad.error( err );
                            }
                        }
                    };

                } else {
                    //For all other plugins attempt to load it from file 
                    plugin = await this._require( plugin_id );
                }

                assert( plugin !== void 0 && plugin !== null, `Invalid AMD plugin: ${plugin_id }` );
                assert.strictEqual( typeof plugin.load, 'function', '.load function on AMD plugin not found' );

                id = parts[1];

                if( typeof plugin.normalize === 'function' ) {
                    id = plugin.normalize( id, normalize );

                } else if( id.charAt( 0 ) === '.' ) {
                    id = normalize( id );
                }

                return new Promise( ( resolve, reject ) => {
                    if( this._loadCache.has( id ) ) {
                        resolve( this._loadCache.get( id ) );

                    } else {
                        let onLoad = value => {
                            this._loadCache.set( id, value );

                            resolve( value );
                        };

                        onLoad.fromText = ( text ) => {
                            //Exploit Scriptor as much as possible
                            compile( text ).exports().then( onLoad, onLoad.error );
                        };

                        onLoad.error = ( err ) => {
                            reject( normalizeError( id, 'scripterror', err ) );
                        };

                        //Since onload is a closure, it 'this' is implicitly bound with TypeScript
                        plugin.load( id, this.require, onLoad, this._config );
                    }
                } );

            } else if( isAbsoluteOrRelative( id ) ) {
                //Load as another script

                id = Module._resolveFilename( normalize( id ), this.parent );

                let script;

                /*
                 * If the current script is managed, attempt to load in any other dependent scripts using the include function.
                 * */
                if( this.isManaged() ) {
                    script = this.include( id );

                    script.textMode = false;

                } else {
                    /*
                     * Otherwise, load it up with it's own Script and so forth
                     * */
                    script = load( id, this.watched, this._script );

                    script.propagateTo( this, 'change', () => {
                        this.unload();
                        this.emit( 'change', this.filename );
                    } );
                }

                return script.exports();

            } else {
                /*
                 * Handle any of the built-in modules
                 * */
                if( id === 'require' ) {
                    return this.require;

                } else if( id === 'exports' ) {
                    return this._script.exports;

                } else if( id === 'module' ) {
                    return this._script;

                } else if( id === 'imports' ) {
                    return this.imports;

                } else if( id === 'Promise' ) {
                    return Promise;

                } else if( id === 'Scriptor' ) {
                    return Script.Scriptor;

                } else if( this._loadCache.has( id ) ) {
                    return this._loadCache.get( id );

                } else if( this._defineCache.has( id ) ) {
                    /*
                     * Load any named module created using 'define'
                     * */
                    let args = this._defineCache.get( id );

                    return this._runFactory( ...args ).then( exported => {
                        this._loadCache.set( id, exported );

                        return exported;
                    } );

                } else {
                    /*
                     * Load normal modules, accounting for _config.paths for in-place replacements
                     * */
                    const config_paths = this._config.paths;

                    for( let p in config_paths ) {
                        if( config_paths.hasOwnProperty( p ) ) {
                            let rel = relative( p, id );

                            if( rel.indexOf( '..' ) === -1 ) {
                                let filepath = config_paths[p];

                                if( isAbsoluteOrRelative( filepath ) ) {
                                    filepath = resolve( this.baseUrl, filepath, rel );
                                }

                                return this.require( filepath );
                            }
                        }
                    }

                    return new Promise( ( resolve, reject ) => {
                        try {
                            //Normal module loading akin to the real 'require' function
                            resolve( this._script.require( id ) );

                        } catch( err ) {
                            reject( normalizeError( id, 'nodefine', err ) );
                        }
                    } );
                }
            }
        }
    }

    /*
     * This is a short implementation of AMD's define function, which is called from within the script.
     *
     * This should NEVER be called outside of the loaded script.
     * */
    _define( ...args ) {
        let define_args = parseDefine( ...args );

        const [id] = define_args;

        if( id !== void 0 ) {
            assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

            this._defineCache.set( id, define_args );

        } else {
            this._dependencies = define_args[1];
            this._factory      = define_args[2];

            this._runMainFactory();
        }
    }

    /*
     * This injects values into the script-level 'module' variable to be used within the loaded script.
     *
     * For example, the 'define' function used to allow AMD scripts.
     * */
    _do_setup() {
        this._script.imports = this.imports;

        /*
         * //This custom bind function copies other values along with the bound function
         * this._script.define = bind( this.define, this );
         * */

        //this.define is already just a closure and doesn't need to be bound. It wouldn't affect it anyway.
        this._script.define = this.define;

        this._script.include = ( ...args ) => {
            return this.include( ...args );
        };

        this._script.on = this._script.addListener = this._script.once = ( event, cb ) => {
            assert.equal( event, 'unload', 'modules can only listen for the unload event' );

            return this.once( event, cb );
        };
    }

    /*
     * This internal function does the actual file loading and compilation/evaluation.
     * */
    _do_load() {
        assert.notEqual( this.filename, null, 'Cannot load a script without a filename' );

        /*
         * If the script was loading in text mode already, but we changed it and are now loading in normal mode,
         * it should abandon the text loading. The source code will still be available eventually.
         * */
        if( !this.loading || (this._loadingText && !this.textMode) ) {
            this.unload();

            if( !this.textMode ) {
                this._do_setup();

                this._loadingText = false;

                /*
                 * default to .js if the file has no extension. It'll probably fail anyway,
                 * but since this IS node.js, JavaScript is assumed
                 * */
                let ext = extname( this.filename ) || '.js';

                //Use custom extension if available
                if( Script.extensions_enabled && Script.hasExtension( ext ) ) {
                    /*
                     * Unfortunately for now, we have to rely on the built-in Module loading code,
                     * which is quite complex, and also synchronous.
                     * */
                    this._script.paths = Module._nodeModulePaths( dirname( this.filename ) );

                    this._loading = true;

                    try {
                        /*
                         * Watching here is a good choice, because if the file changes AS we are loading it, it's invalid anyway,
                         * and it won't progress beyond the if( this._loading ) below.
                         * */
                        if( this._willWatch ) {
                            this._do_watch( this._watchPersistent );
                        }

                        return tryPromise( Script.extensions[ext]( this._script, this.filename ) ).then( src => {
                            if( this._loading ) {
                                this._source        = src;
                                this._script.loaded = true;

                                this._loading = false;

                                this.emit( 'loaded', this._script.exports );

                            } else {
                                this.emit( 'error',
                                    new Error( `The script ${this.filename} was unloaded while performing an asynchronous operation.` ) );
                            }

                        }, err => {
                            this._loading = false;

                            this.emit( 'error', err );
                        } );

                    } catch( err ) {
                        this._loading = false;

                        this.emit( 'error', err );
                    }

                } else {
                    /*
                     * This is the synchronous path. If custom extension handlers are used, this should never run. While there is nothing
                     * particularly wrong with this path, it's still synchronous.
                     * */

                    if( !Module._extensions.hasOwnProperty( ext ) ) {
                        this.emit( 'warning',
                            `The extension handler for ${this.filename} does not exist, defaulting to .js handler` );
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
                            this.emit( 'error',
                                new Error( `The script ${this.filename} was unloaded while performing an asynchronous operation.` ) );
                        }

                    } catch( err ) {
                        this.emit( 'error', err );

                    } finally {
                        this._loading = false;
                    }
                }

            } else {
                this._loading     = true;
                this._loadingText = true;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );

                    } catch( err ) {
                        this._loading     = false;
                        this._loadingText = false;

                        this.emit( 'error', err );
                    }
                }

                return readFileAsync( this.filename ).then( src => {
                    if( this._loading && this._loadingText ) {
                        this._source        = src;
                        this._script.loaded = true;

                        this._loading     = false;
                        this._loadingText = false;

                        this.emit( 'loaded_src', this.loaded );

                    } else if( !this._loading ) {
                        this.emit( 'error',
                            new Error( `The script ${this.filename} was unloaded while performing an asynchronous operation.` ) );
                    }

                }, err => {
                    this._loading     = false;
                    this._loadingText = false;

                    this.emit( 'error', err );
                } );
            }
        }
    }

    /*
     * This internal function sets up the file watcher, with individual debounces for change and rename events.
     * */
    _do_watch( persistent ) {
        if( !this.watched ) {
            let watcher;

            try {
                watcher = this._watcher = watchFile( this.filename, {
                    persistent: persistent
                } );

            } catch( err ) {
                throw normalizeError( this.filename, 'nodefine', err );
            }

            //These are separated out so rename and change events can be debounced separately.
            var onChange = debounce( ( event, filename ) => {
                this.unload();
                this.emit( 'change', event, filename );

            }, this.debounceMaxWait );

            var onRename = debounce( ( event, filename ) => {
                if( this._unloadOnRename ) {
                    this.unload();

                    this.emit( 'change', event, filename );

                } else {
                    var old_filename = this._script.filename;

                    //A simple rename doesn't change file content, so just change the filename
                    //and leave the script loaded
                    this._script.filename = filename;

                    this.emit( 'rename', old_filename, filename );
                }

            }, this.debounceMaxWait );

            watcher.on( 'change', ( event, filename ) => {

                //resolve doesn't like nulls, so this has to be done first
                if( filename === null || filename === void 0 ) {
                    //Generally, if the filename was null, either the platform is unsupported
                    // or the file has been deleted. So just reopen it with a fresh watcher and stuff.
                    this.reopen();

                } else {

                    //This is important because fs.watch 'change' event only returns things like 'script.js'
                    //as a filename, which when resolved normally is relative to process.cwd(), not where the script
                    //actually is. So we have to get the directory of the last filename and combine it with the new name
                    filename = resolve( this.baseUrl, filename );

                    if( event === 'change' ) {
                        onChange( event, filename )

                    } else if( event === 'rename' ) {
                        if( filename !== this.filename ) {
                            onRename( event, filename );

                        } else {
                            this.reopen();
                        }
                    }
                }
            } );

            watcher.on( 'error', error => {
                //In the event of an error, unload and unwatch
                this.close( false );

                //Would it be better to throw?
                this.emit( 'error', error );
            } );
        }
    }

    source( encoding = null ) {
        if( this.loaded ) {
            if( encoding !== null && encoding !== void 0 ) {
                return Promise.resolve( this._source.toString( encoding ) );

            } else {
                return Promise.resolve( this._source );
            }

        } else {
            /*
             * This is a special one were it doesn't matter which event triggers first. The source code will be the same.
             * */
            let waiting = promisifyEvents( this, ['loaded', 'loaded_src'], 'error' );

            this._callWrapper( this._do_load );

            return waiting.then( () => {
                return this.source( encoding );
            } );
        }
    }

    /*
     * This forces loading, compilation and evaluation of a script, and returns a Promise that should resolve to whatever
     * module.exports was assigned when the script was run. For Text mode scripts, it returns the source code.
     * */
    exports() {
        if( this.loaded ) {
            if( this.pending ) {
                //Add the event listeners first
                let waiting = promisifyEvents( this, 'exports', 'error' );

                this._runMainFactory();

                return waiting;

            } else {
                return Promise.resolve( this._script.exports );
            }

        } else if( this.textMode ) {
            return this.source().then( () => this.exports() );

        } else {
            //Add the event listeners first
            let waiting = promisifyEvents( this, 'loaded', 'error' );

            this._callWrapper( this._do_load );

            return waiting.then( () => {
                return this.exports();
            } );
        }
    }

    call( ...args ) {
        return this.apply( args );
    }

    apply( args ) {
        assert( Array.isArray( args ) );

        if( !this.textMode ) {
            return this.exports().then( main => {
                if( main !== null && main !== void 0 ) {

                    if( main['default'] ) {
                        main = main['default'];
                    }

                    if( typeof main === 'function' ) {
                        if( isGeneratorFunction( main ) ) {
                            main = Promise.coroutine( main );
                        }

                        return this._callWrapper( main, null, args );
                    }
                }

                return main;
            } );

        } else {
            return this.source( ...args );
        }
    }

    /*
     * Loading is actually done lazily, so this doesn't do anything more than set up values needed when it does eventually load.
     * */
    load( filename, watch = true ) {
        filename = resolve( filename );

        this.close( false );

        this.id = basename( filename );

        this._script.filename = filename;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    }

    /*
     * Basically this just cleans up everything. Clearing values and so forth.
     * */
    unload() {
        this.emit( 'unload' );

        this._script.loaded  = false;
        this._script.exports = {};

        //unload also clears defines and requires
        this._defineCache.clear();
        this._loadCache.clear();

        this._pending        = false;
        this._runningFactory = false;
        this._loading        = false;
        this._loadingText    = false;
    }

    /*
     * Force the script to reload and recompile.
     * */
    reload() {
        this._callWrapper( this._do_load ).then( () => {
            this.emit( 'change', 'change', this.filename );
        } );
    }

    /*
     * Watching is done lazily so we don't generate any more events that needed until the script is loaded and compiled.
     * */
    watch( persistent = false ) {
        if( !this.watched ) {
            this._willWatch       = true;
            this._watchPersistent = persistent;

        } else if( this._willWatch ) {
            this._watchPersistent = persistent;
        }
    }

    /*
     * Unwatching is done synchronously, however, since it's simple and should be done ASAP anyway to prevent any new events.
     * */
    unwatch() {
        if( this.watched ) {
            //close the watched and null it to allow the GC to collect it
            this._watcher.close();

            delete this['_watcher'];

            this._willWatch = false;

        } else if( this._willWatch ) {
            this._willWatch = false;
        }
    }

    /*
     * This is a simple "cheat" to allow a script to re-evaluate itself and re-watch itself if needed
     * */
    reopen() {
        this.unload();

        if( this.watched ) {
            this.unwatch();
            this.watch( this._watchPersistent );
        }

        this.emit( 'change', this.filename );
    }

    close( permanent = true ) {
        this.unload();
        this.unwatch();

        this.emit( 'close', permanent );

        if( permanent ) {
            let parent = this._script.parent;

            //Remove _script from parent, if the parent exists
            if( parent !== void 0 && parent !== null ) {
                for( let it in parent.children ) {
                    //Find which child is this._script, delete it and remove the (now undefined) reference
                    if( parent.children.hasOwnProperty( it ) && parent.children[it] === this._script ) {
                        delete parent.children[it];
                        parent.children.splice( it, 1 );
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

    /*
     * See manager.js for include's for ManagedScripts.
     * */
    include( filename ) {
        throw new Error( `Cannot include script "${filename}" from an unmanaged script` );
    }
}
