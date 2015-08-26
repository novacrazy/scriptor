/**
 * Created by Aaron on 7/5/2015.
 */

import Module from 'module';
import assert from 'assert';
import Promise from 'bluebird';

import _ from 'lodash';

import {readFile, watch as watchFile} from 'fs';
import {resolve as resolveURL} from 'url';
import {extname, dirname, basename, resolve, posix as path} from 'path';

import {normalizeError} from './error.js';
import defaultExtensions from './extensions.js';

import {EventPropagator, EventEmitter, makeEventPromise, makeMultiEventPromise} from './events.js';
import {default_max_recursion, default_max_debounceMaxWait} from './defaults.js';

import {tryPromise, isThenable, isGeneratorFunction, isAbsoluteOrRelative, bind, normalizeConfig, parseDefine} from './utils.js';

import Reference from './reference.js';

let promisifyCache = new Map();

let readFileAsync = Promise.promisify( readFile );

export function load( filename, watch = true, parent = null ) {

    filename = resolve( filename );

    let script = new Script( null, parent );

    script.load( filename, watch );

    return script;
}

export default class Script extends EventPropagator {
    _script = null;
    _source = null;
    _factory = null;
    _watcher = null;

    _willWatch = false;
    _watchPersistent = false;

    _maxListeners = 10; //Node default maxListeners

    _recursion = 0;
    _maxRecursion = default_max_recursion;
    _debounceMaxWait = default_max_debounceMaxWait;

    _textMode = false;

    _defineCache = new Map();
    _loadCache = new Map();

    _pending = false;
    _loading = false;
    _loadingText = false;
    _runningFactory = false;

    _config = normalizeConfig( null );

    _dependencies = [];

    require = null;
    define = null;

    imports = {};

    static Scriptor = null;

    static extensions_enabled = true;
    static extensions = defaultExtensions;

    static hasExtension( ext ) {
        return Script.extensions.hasOwnProperty( ext );
    }

    _init() {
        let require = ( ...args ) => {
            return this._require( ...args );
        };

        let define = ( ...args ) => {
            return this._define( ...args );
        };

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
        this.define = define;
    }

    constructor( filename, parent ) {
        super();

        if( parent === void 0 || parent === null ) {
            if( filename instanceof Module.Module ) {
                parent = filename;
                filename = null;

            } else {
                parent = module;
            }
        }

        this._script = new Module( null, parent );

        //Explicit comparisons to appease JSHint
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

    //Based on the RequireJS 'standard' for relative locations
    //For SourceScripts, just set the filename to something relative
    get baseUrl() {
        return path.dirname( this.filename );
    }

    set maxRecursion( value ) {
        value = Math.floor( value );

        assert( !isNaN( value ), 'maxRecursion must be set to a number' );

        this._maxRecursion = value;
    }

    get maxRecursion() {
        return this._maxRecursion;
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

    _callWrapper( func, context = this, args = [] ) {
        //Just in case, always use recursion protection
        if( this._recursion > this._maxRecursion ) {
            return Promise.reject( new RangeError( `Script recursion limit reached at ${this._recursion} for script ${this.filename}` ) );

        } else {
            return new Promise( ( resolve, reject ) => {
                try {
                    this._recursion++;

                    let res = func.apply( context, args );

                    if( isThenable( res ) ) {
                        res.then( resolve, reject );

                    } else {
                        resolve( res );
                    }

                } catch( err ) {
                    this.unload();

                    reject( err );

                } finally {
                    this._recursion--;
                }
            } );
        }
    }

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

    _runMainFactory() {
        if( !this._runningFactory ) {
            this._runningFactory = true;
            this._pending = true;

            return this._runFactory( null, this._dependencies, this._factory ).then( result => {
                if( this._pending ) {
                    //To match AMDefine, don't export the result unless there is one.
                    //Null is allowed, since it would have to have been returned explicitly.
                    if( result !== void 0 ) {
                        this._script.exports = result;
                    }

                    this._pending = false;
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
                    plugin = {
                        load: ( id, require, _onLoad, config ) => {
                            if( promisifyCache.has( id ) ) {
                                _onLoad( promisifyCache.get( id ) );

                            } else {
                                this._require( id ).then( obj => {
                                    if( typeof obj === 'function' ) {
                                        return Promise.promisify( obj );

                                    } else if( typeof obj === 'object' ) {
                                        let newObj = _.clone( obj );

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
                id = Module._resolveFilename( normalize( id ), this.parent );

                let script;

                if( this.isManaged() ) {
                    script = this.include( id );

                    script.textMode = false;

                } else {
                    script = load( id, this.watched, this._script );

                    script.propagateTo( this, 'change', () => {
                        this.unload();
                        this.emit( 'change', this.filename );
                    } );

                    script.propagateEvents( this.isPropagatingEvents() );

                    script.maxRecursion = this.maxRecursion;
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
                    return Promise;

                } else if( id === 'Scriptor' ) {
                    return Script.Scriptor;

                } else if( this._loadCache.has( id ) ) {
                    return this._loadCache.get( id );

                } else if( this._defineCache.has( id ) ) {
                    let args = this._defineCache.get( id );

                    return this._runFactory( ...args ).then( exported => {
                        this._loadCache.set( id, exported );

                        return exported;
                    } );

                } else if( this._config.paths.hasOwnProperty( id ) ) {
                    let filepath = this._config.paths[id];

                    if( filepath.charAt( 0 ) === '.' ) {
                        filepath = resolve( this.baseUrl, filepath );
                    }

                    return this.require( filepath );

                } else {
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

    _define( ...args ) {
        let define_args = parseDefine( ...args );

        let [id] = define_args;

        if( id !== void 0 ) {
            assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

            this._defineCache.set( id, define_args );

        } else {
            this._dependencies = define_args[1];
            this._factory = define_args[2];

            this._runMainFactory();
        }
    }

    _do_setup() {
        this._script.imports = this.imports;

        this._script.define = bind( this.define, this );

        this._script.include = ( ...args ) => {
            return this.include( ...args );
        };

        this._script.on = this._script.addListener = this._script.once = ( event, cb ) => {
            assert.equal( event, 'unload', 'modules can only listen for the unload event' );

            return this.once( event, cb );
        };
    }

    _do_load() {
        assert.notEqual( this.filename, null, 'Cannot load a script without a filename' );

        if( !this.loading || (this._loadingText && !this.textMode) ) {
            this.unload();

            if( !this.textMode ) {
                this._do_setup();

                this._loadingText = false;

                var ext = extname( this.filename ) || '.js';

                //Use custom extension if available
                if( Script.extensions_enabled && Script.hasExtension( ext ) ) {
                    this._script.paths = Module._nodeModulePaths( dirname( this.filename ) );

                    this._loading = true;

                    try {
                        if( this._willWatch ) {
                            this._do_watch( this._watchPersistent );
                        }

                        tryPromise( Script.extensions[ext]( this._script, this.filename ) ).then( src => {
                            if( this._loading ) {
                                this._source = src;
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
                     * This is the synchronous path. If custom extension handlers are used, this should never run
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

                return readFileAsync( this.filename ).then( src => {
                    if( this._loading && this._loadingText ) {
                        this._source = src;
                        this._script.loaded = true;

                        this._loading = false;
                        this._loadingText = false;

                        this.emit( 'loaded_src', this.loaded );

                    } else if( !this._loading ) {
                        this.emit( 'error',
                            new Error( `The script ${this.filename} was unloaded while performing an asynchronous operation.` ) );
                    }

                }, err => {
                    this._loading = false;
                    this._loadingText = false;

                    this.emit( 'error', err );
                } );
            }
        }
    }

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
            var onChange = _.debounce( ( event, filename ) => {
                this.unload();
                this.emit( 'change', event, filename );

            }, this.debounceMaxWait );

            var onRename = _.debounce( ( event, filename ) => {
                var old_filename = this._script.filename;

                //A simple rename doesn't change file content, so just change the filename
                //and leave the script loaded
                this._script.filename = filename;

                this.emit( 'rename', old_filename, filename );

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

                    } else if( event === 'rename' && filename !== this.filename ) {
                        onRename( event, filename );
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
             * This is a special one were it doesn't matter which event triggers first.
             * */
            let waiting = makeMultiEventPromise( this, ['loaded', 'loaded_src'], ['error'] );

            return Promise.all( [this._callWrapper( this._do_load ), waiting] ).then( () => {
                return this.source( encoding );
            } );
        }
    }

    exports() {
        if( this.loaded ) {
            if( this.pending ) {
                //Add the event listeners first
                let waiting = makeEventPromise( this, 'exports', 'error' );

                this._runMainFactory();

                return waiting;

            } else {
                return Promise.resolve( this._script.exports );
            }

        } else if( this.textMode ) {
            return this.source().then( () => this.exports() );

        } else {
            //Add the event listeners first
            let waiting = makeEventPromise( this, 'loaded', 'error' );

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

    unload() {
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

    reload() {
        //Force it to reload and recompile the script.
        this._callWrapper( this._do_load ).then( () => {
            //If a Reference depends on this script, then it should be updated when it reloads
            //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
            this.emit( 'change', 'change', this.filename );
        } );
    }

    watch( persistent = false ) {
        if( !this.watched ) {
            this._willWatch = true;
            this._watchPersistent = persistent;

        } else if( this._willWatch ) {
            this._watchPersistent = persistent;
        }
    }

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

    reference( ...args ) {
        return this.reference_apply( args );
    }

    reference_apply( args ) {
        assert( Array.isArray( args ), 'reference_apply only accepts an array of arguments' );

        return new Reference( this, args );
    }

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

            //Remove _script from parent
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

    include( filename ) {
        throw new Error( `Cannot include script "${filename}" from an unmanaged script` );
    }
}
