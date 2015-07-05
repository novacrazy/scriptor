/**
 * Created by novacrazy on 12/25/2014.
 */

import fs = require('fs');
import util = require('util');
import assert = require('assert');
import url = require('url');
import path = require('path');
import events = require('events');

import Base = require('./base')
import Module = require('./Module');
import Common = require('./common');
import MapAdapter = require('./map');
import Types = require('./types');

import Promise = require('bluebird');

import _ = require('lodash');

var readFile = Promise.promisify( fs.readFile );

import posix_path = path.posix;

function isThenable( obj : any ) : boolean {
    return (obj !== void 0 && obj !== null) && (obj instanceof Promise || typeof obj.then === 'function');
}

function tryPromise( value : any ) : Promise<any> {
    if( isThenable( value ) ) {
        return value;

    } else {
        return Promise.resolve( value );
    }
}

function tryReject( func, context, ...args ) : Promise<any> {
    try {
        return tryPromise( func.apply( context, args ) );

    } catch( err ) {
        return Promise.reject( err );
    }
}

//Taken from tj/co
function isGenerator( obj : any ) : boolean {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}

//Taken from tj/co
function isGeneratorFunction( obj : any ) : boolean {
    if( !obj.constructor ) {
        return false;
    } else if( 'GeneratorFunction' === obj.constructor.name ||
               'GeneratorFunction' === obj.constructor.displayName ) {
        return true;
    } else {
        return isGenerator( obj.constructor.prototype );
    }
}

function makeCoroutine<T>( fn : T ) : T {
    return <any>Promise.coroutine( <any>fn );
}

function makeEventPromise( emitter : events.EventEmitter, resolve_event : string, reject_event : string ) {
    return new Promise( ( resolve : any, reject : any ) => {
        function resolve_handler( ...args : any[] ) {
            emitter.removeListener( reject_event, reject_handler );
            resolve( ...args );
        }

        function reject_handler( ...args : any[] ) {
            emitter.removeListener( resolve_event, resolve_handler );
            reject( ...args );
        }

        emitter.once( resolve_event, resolve_handler );
        emitter.once( reject_event, reject_handler );
    } );
}

/*
 * This is a more generic version of the above, but also costs more to run.
 * */
function makeMultiEventPromise( emitter : events.EventEmitter, resolve_events : string[], reject_events : string[] ) {
    return new Promise( ( resolve : any, reject : any ) => {
        function resolve_handler( ...args : any[] ) {
            for( let it in reject_events ) {
                if( reject_events.hasOwnProperty( it ) ) {
                    let event = reject_events[it];

                    emitter.removeListener( event, reject_handler );
                }
            }

            resolve( ...args );
        }

        function reject_handler( ...args : any[] ) {
            for( let it in resolve_events ) {
                if( resolve_events.hasOwnProperty( it ) ) {
                    let event = resolve_events[it];

                    emitter.removeListener( event, resolve_handler );
                }
            }

            reject( ...args );
        }

        for( let it in resolve_events ) {
            if( resolve_events.hasOwnProperty( it ) ) {
                let event = resolve_events[it];

                emitter.once( event, resolve_handler );
            }
        }

        for( let it in reject_events ) {
            if( reject_events.hasOwnProperty( it ) ) {
                let event = reject_events[it];

                emitter.once( event, reject_handler );
            }
        }
    } );
}

module Scriptor {
    export var this_module : Module.IModule = <any>module;

    export var common = Common;

    export var default_dependencies : string[] = Common.default_dependencies;

    export var default_max_recursion : number = Common.default_max_recursion;

    export type ScriptorExtensionMap = Types.ISimpleMap<Types.ScriptorExtension<Promise<Buffer>>>;

    export var default_extensions : ScriptorExtensionMap = {
        '.js': ( module : Module.IModule, filename : string ) => {
            return readFile( filename ).then( Common.stripBOM ).then( ( content : Buffer ) => {
                module._compile( (<Buffer>Common.injectAMD( content, null )).toString( 'utf-8' ), filename );

                return content;
            } );
        },
        '.json': ( module : Module.IModule, filename : string ) => {
            return readFile( filename ).then( Common.stripBOM ).then( ( content : Buffer ) => {
                try {
                    module.exports = JSON.parse( content.toString( 'utf-8' ) );

                } catch( err ) {
                    err.message = filename + ': ' + err.message;
                    throw err;
                }

                return content;
            } );
        }
    };

    export var extensions : ScriptorExtensionMap = {};

    export var extensions_enabled : boolean = false;

    export var promisifyCache : Map<string, any> = MapAdapter.createMap<any>();

    export var scriptCache : Map<string, Scriptor.Script> = MapAdapter.createMap<Scriptor.Script>();

    export function installCustomExtensions( enable : boolean = true ) {
        if( enable ) {
            for( var it in default_extensions ) {
                if( default_extensions.hasOwnProperty( it ) ) {
                    if( !extensions.hasOwnProperty( it ) ) {
                        extensions[it] = default_extensions[it];
                    }
                }
            }
        }

        extensions_enabled = enable;
    }

    export function disableCustomExtensions() {
        installCustomExtensions( false );
    }

    export function closeCachedScripts( permemant : boolean = true ) {
        scriptCache.forEach( ( script : Script ) => {
            script.close( permemant );
        } );
    }

    /**** BEGIN SECTION SCRIPT ****/

    export type IScriptBase = Types.IScriptBase<Promise<any>, Script>;

    export type IRequireFunction = Types.IRequireFunction<Promise<any>, Promise<any[]>>;
    export type IDefineFunction = Types.IDefineFunction<Promise<any>, Promise<any[]>>;

    export type IAMDScriptBase = Types.IAMDScriptBase<Promise<any>, Promise<any[]>>;

    export type IScriptorPlugin = Types.IScriptorPlugin<Promise<any>, Promise<any[]>>;

    export interface IScriptModule extends IScriptBase, IAMDScriptBase,
                                           Module.IModulePublic, Module.IModuleInternal,
                                           events.EventEmitter {
        //Empty, just merges the interfaces
    }

    //Basically, ScriptBase is an abstraction to allow better 'multiple' inheritance
    //Since single inheritance is the only thing supported, a mixin has to be put into the chain, rather than,
    //well, mixed in. So ScriptBase just handles the most basic Script functions
    class ScriptBase extends Base.EventPropagator {
        protected _script : IScriptModule;
        protected _recursion : number = 0;
        protected _maxRecursion : number = default_max_recursion;
        protected _debounceMaxWait : number = Common.default_debounceMaxWait;
        protected _textMode : boolean = false;
        protected _factory : ( ...deps : any[] ) => any;

        protected _watcher : fs.FSWatcher;

        get watched() : boolean {
            return this._watcher !== void 0;
        }

        public imports : {[key : string] : any} = {};

        constructor( parent : Module.IModule ) {
            super();

            this._script = <any>(new Module.Module( null, parent ));
        }

        //Wrap it before you tap it.
        //No, but really, it's important to protect against errors in a generic way
        protected _callWrapper( func : Function, this_arg : any = this, args : any[] = [] ) : Promise<any> {

            //Just in case, always use recursion protection
            if( this._recursion > this._maxRecursion ) {
                return Promise.reject( new RangeError( util.format( 'Script recursion limit reached at %d for script %s',
                    this._recursion, this.filename ) ) );

            } else {
                return new Promise( ( resolve, reject ) => {
                    this._recursion++;

                    resolve( func.apply( this_arg, args ) );

                } ).catch( e  => {
                        this.unload();

                        return Promise.reject( e );

                    } ).finally( () => {
                        this._recursion--;
                    } );
            }
        }

        //Abstract method
        protected do_load() : Promise<any> {
            return Promise.resolve( void 0 );
        }

        get id() : string {
            return this._script.id;
        }

        set id( value : string ) {
            this._script.id = value;
        }

        get children() : Module.IModule[] {
            return this._script.children;
        }

        get parent() : Module.IModule {
            return this._script.parent;
        }

        get loaded() : boolean {
            return this._script.loaded;
        }

        //Only allow getting the filename, setting should be done through .load
        get filename() : string {
            return this._script.filename;
        }

        get manager() : Manager {
            return null;
        }

        public isManaged() : boolean {
            return this.manager !== null && this.manager !== void 0;
        }

        //Based on the RequireJS 'standard' for relative locations
        //For SourceScripts, just set the filename to something relative
        get baseUrl() : string {
            return path.dirname( this.filename );
        }

        set maxRecursion( value : number ) {
            //JSHint doesn't like bitwise operators
            this._maxRecursion = Math.floor( value );

            assert( !isNaN( this._maxRecursion ), 'maxRecursion must be set to a number' );
        }

        get maxRecursion() : number {
            return this._maxRecursion;
        }

        set debounceMaxWait( time : number ) {
            this._debounceMaxWait = Math.floor( time );

            assert( !isNaN( this._debounceMaxWait ), 'debounceMaxWait must be set to a number' );
        }

        get debounceMaxWait() : number {
            return this._debounceMaxWait;
        }

        get textMode() : boolean {
            return this._textMode;
        }

        set textMode( value : boolean ) {
            this._textMode = !!value;
        }

        public unload() : boolean {
            var was_loaded : boolean = this.loaded;

            this.emit( 'unload' );

            this._script.loaded = false;
            this._script.exports = {};

            return was_loaded;
        }

        public reload() : boolean {
            var was_loaded : boolean = this.loaded;

            //Force it to reload and recompile the script.
            this._callWrapper( this.do_load ).then( () => {
                //If a Reference depends on this script, then it should be updated when it reloads
                //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
                this.emit( 'change', 'change', this.filename );
            } );

            return was_loaded;
        }

        //Abstract method
        public unwatch() : boolean {
            return false;
        }

        public close( permanent : boolean = true ) {
            this.unload();
            this.unwatch();

            this.emit( 'close', permanent );

            if( permanent ) {

                //Remove _script from parent
                Common.removeFromParent( this._script );

                //Remove _script from current object
                return delete this._script;

            } else {
                this._script.filename = null;
            }
        }

        public include( filename : string ) : Script {
            throw new Error( 'Cannot include script "' + filename + '"from an unmanaged script' );
        }
    }

    export type IAMDConfig = Types.IAMDConfig;

    class AMDScript extends ScriptBase implements IAMDScriptBase {
        protected _defineCache : Map<string, any[]> = MapAdapter.createMap<any[]>();
        protected _loadCache : Map<string, any> = MapAdapter.createMap<any>();
        protected _pending : boolean;
        protected _loading : boolean;
        protected _loadingText : boolean;
        protected _runningFactory : boolean = false;
        protected _config : IAMDConfig = Common.normalizeConfig( null );

        protected _dependencies : string[] = [];

        public require : IRequireFunction;
        public define : IDefineFunction;

        private _init() {
            var require : IRequireFunction = this._require.bind( this );
            var define : IDefineFunction = this._define.bind( this );

            require.toUrl = ( filepath : string = this.filename ) => {
                assert.strictEqual( typeof filepath, 'string', 'require.toUrl takes a string as filepath' );

                if( filepath.charAt( 0 ) === '.' ) {
                    //Use the url.resolve instead of path.resolve, even though they usually do the same thing
                    return url.resolve( this.baseUrl, filepath );

                } else {
                    return filepath;
                }
            };

            require.defined = ( id : string ) => {
                return this._loadCache.has( posix_path.normalize( id ) );
            };

            require.specified = ( id : string ) => {
                return this._defineCache.has( posix_path.normalize( id ) );
            };

            require.undef = ( id : string ) => {
                id = posix_path.normalize( id );

                this._loadCache.delete( id );
                this._defineCache.delete( id );

                return this;
            };

            //This is not an anonymous so stack traces make a bit more sense
            require.onError = function onErrorDefault( err : any ) {
                throw err; //default error
            };

            //This is almost exactly like the normal require.resolve, but it's relative to this.baseUrl
            require.resolve = ( id : string ) => {
                var relative = path.resolve( this.baseUrl, id );
                return Module.Module._resolveFilename( relative, this._script );
            };

            define.require = require;

            define.amd = {
                jQuery: false
            };

            require.define = define;

            this.require = require;
            this.define = define;
        }

        constructor( parent : Module.IModule ) {
            super( parent );

            this._init();
        }

        get pending() : boolean {
            return this._pending;
        }

        get loading() : boolean {
            return this._loading;
        }

        protected _runFactory( id : string, deps : string[], factory : ( ...deps : any[] ) => any ) : Promise<any> {
            if( id !== void 0 && id !== null ) {
                this._loadCache.delete( id ); //clear before running. Will remained cleared in the event of error
            }

            if( typeof factory === 'function' ) {
                if( isGeneratorFunction( factory ) ) {
                    factory = makeCoroutine( factory );
                }

                return this._require( deps ).then( ( resolvedDeps : any[] ) => {
                    return factory.apply( this._script.exports, resolvedDeps );
                } );

            } else {
                //On the off chance the function factory is a promise, run it through again if need be
                return tryPromise( factory ).then( ( resolvedFactory ) => {
                    if( typeof factory === 'function' ) {
                        return this._runFactory( id, deps, resolvedFactory );

                    } else {
                        return resolvedFactory;
                    }
                } );
            }
        }

        protected _runMainFactory() : Promise<any> {
            if( !this._runningFactory ) {
                this._runningFactory = true;
                this._pending = true;

                return this._runFactory( null, this._dependencies, this._factory ).then( ( result ) => {
                    if( this._pending ) {
                        //To match AMDefine, don't export the result unless there is one.
                        //Null is allowed, since it would have to have been returned explicitly.
                        if( result !== void 0 ) {
                            this._script.exports = result;
                        }

                        this._pending = false;
                        this._runningFactory = false;

                        this.emit( 'exports', this._script.exports );
                    }

                }, err => {
                    this._runningFactory = false;

                    this.emit( 'exports_error', err );
                } );
            }
        }

        //Overloads, which can differ from Module.IModule
        protected _require( path : string ) : any;
        protected _require( id : string[] ) : Promise<any[]>;
        protected _require( id : string ) : Promise<any>;

        //Implementation, and holy crap is it huge
        protected _require( id : any ) : any {
            assert.strictEqual( arguments.length, 1,
                'The async build uses promises for the require function instead of callbacks. Please use then/catch instead of individual callbacks.' );

            var normalize = path.resolve.bind( null, this.baseUrl );

            var result : any;

            if( Array.isArray( id ) ) {
                //We know it's an array, so just cast it to one to appease TypeScript
                var ids : string[] = id;

                result = Promise.map( ids, id => this._require( id ) );

            } else {
                assert.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );

                //Plugins ARE supported, but they have to work like a normal module
                if( id.indexOf( '!' ) !== -1 ) {
                    //modules to be loaded through an AMD loader transform
                    var parts : string[] = id.split( '!', 2 );

                    var plugin_resolver : Promise<IScriptorPlugin>;

                    var plugin_id : string = parts[0];

                    if( plugin_id === 'include' ) {
                        plugin_resolver = Promise.resolve( {
                            normalize: ( id : string, defaultNormalize : ( id : string ) => string ) => {
                                return defaultNormalize( id );
                            },
                            load: ( id, require, _onLoad, config ) => {
                                try {
                                    var script = this.include( id );

                                    script.textMode = false;

                                    _onLoad( script );

                                } catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        } );

                    } else if( plugin_id === 'promisify' ) {
                        plugin_resolver = Promise.resolve( {
                            load: ( id, require, _onLoad, config ) => {
                                var resolver : Promise<any>;

                                if( promisifyCache.has( id ) ) {
                                    resolver = Promise.resolve( promisifyCache.get( id ) );

                                } else {
                                    resolver = this._require( id ).then( function( obj : any ) {
                                        if( typeof obj === 'function' ) {
                                            return Promise.promisify( obj );

                                        } else if( typeof obj === 'object' ) {
                                            var newObj = Common.shallowCloneObject( obj );
                                            return Promise.promisifyAll( newObj );

                                        } else {
                                            return null;
                                        }

                                    } ).then( ( obj ) => {
                                        promisifyCache.set( id, obj );

                                        return obj;
                                    } );
                                }

                                resolver.then( _onLoad );
                            }
                        } );

                    } else if( plugin_id === 'text' ) {
                        plugin_resolver = Promise.resolve( {
                            normalize: ( id : string, defaultNormalize : ( id : string ) => string ) => {
                                return defaultNormalize( id );
                            },
                            load: ( id, require, _onLoad, config ) => {
                                try {
                                    var script = this.include( id );

                                    script.textMode = true;

                                    _onLoad( script );

                                } catch( err ) {
                                    _onLoad.error( err );
                                }
                            }
                        } );

                    } else {
                        plugin_resolver = this._require( plugin_id );
                    }

                    result = plugin_resolver.then( ( plugin : any ) => {
                        assert( plugin !== void 0 && plugin !== null, 'Invalid AMD plugin: ' + plugin_id );
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
                                var onLoad : any = ( value : any ) => {
                                    this._loadCache.set( id, value );

                                    resolve( value );
                                };

                                onLoad.fromText = ( text : string ) => {
                                    //Exploit Scriptor as much as possible
                                    Scriptor.compile( text ).exports().then( onLoad, onLoad.error );
                                };

                                onLoad.error = ( err : any ) => {
                                    reject( Common.normalizeError( id, 'scripterror', err ) );
                                };

                                //Since onload is a closure, it 'this' is implicitly bound with TypeScript
                                plugin.load( id, this.require, onLoad, this._config );
                            }
                        } );
                    } );

                } else if( Common.isAbsoluteOrRelative( id ) ) {
                    //Exploit Scriptor as much as possible for relative and absolute paths

                    id = Module.Module._resolveFilename( normalize( id ), this.parent );

                    var script : Script;

                    if( this.isManaged() ) {
                        script = this.include( id );

                        script.textMode = false;

                    } else {
                        script = Scriptor.load( id, this.watched, this._script );

                        this._addPropagationHandler( script, 'change', () => {
                            this.unload();
                            this.emit( 'change', this.filename );
                        } );

                        script.propagateEvents( this._propagateEvents );

                        script.maxRecursion = this.maxRecursion;
                    }

                    result = script.exports();

                } else {
                    if( id === 'require' ) {
                        result = this.require;

                    } else if( id === 'exports' ) {
                        result = this._script.exports;

                    } else if( id === 'module' ) {
                        result = this._script;

                    } else if( id === 'imports' ) {
                        result = Object.freeze( this.imports );

                    } else if( id === 'Promise' ) {
                        return Promise;

                    } else if( id === 'Scriptor' ) {
                        return Scriptor;

                    } else if( this._loadCache.has( id ) ) {
                        result = this._loadCache.get( id );

                    } else if( this._defineCache.has( id ) ) {
                        var args : any[] = this._defineCache.get( id );

                        result = this._runFactory( args[0], args[1], args[2] ).then( ( exported ) => {
                            this._loadCache.set( id, exported );

                            return exported;
                        } );
                        //The callbacks can be done pretty easily this way

                    } else if( this._config.paths.hasOwnProperty( id ) ) {
                        var filepath = this._config.paths[id];

                        if( filepath.charAt( 0 ) === '.' ) {
                            filepath = path.resolve( this.baseUrl, filepath );
                        }

                        return this.require( filepath );

                    } else {
                        //In a closure so the try-catch block doesn't prevent optimization of the rest of the function

                        result = new Promise( ( resolve, reject ) => {
                            try {
                                //Normal module loading akin to the real 'require' function
                                resolve( this._script.require( id ) );

                            } catch( err ) {
                                reject( Common.normalizeError( id, 'nodefine', err ) );
                            }
                        } );
                    }
                }
            }

            if( !isThenable( result ) ) {
                result = Promise.resolve( result );
            }

            return result;
        }

        protected _define( /*...*/ ) : void {
            var define_args : any[] = Common.parseDefine.apply( null, arguments );

            var id : string = define_args[0];

            if( id !== void 0 ) {
                assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

                this._defineCache.set( id, define_args );

            } else {
                this._dependencies = define_args[1];
                this._factory = define_args[2];

                this._runMainFactory();
            }
        }

        get dependencies() : string[] {
            return this._dependencies;
        }

        public config( config? : IAMDConfig ) : IAMDConfig {
            if( config !== void 0 && config !== null ) {
                this._config = Common.normalizeConfig( config );
            }

            return this._config;
        }

        public unload() : boolean {
            var res : boolean = super.unload();

            //unload also clears defines and requires
            this._defineCache.clear();
            this._loadCache.clear();

            this._pending = false;
            this._runningFactory = false;
            this._loading = false;
            this._loadingText = false;

            return res;
        }
    }

    export class Script extends AMDScript implements IScriptBase {
        protected _source : Buffer;

        constructor( filename? : string, parent? : Module.IModule ) {
            if( parent === void 0 || parent === null ) {
                if( <any>filename instanceof Module.Module ) {
                    parent = <any>filename;
                    filename = null;

                } else {
                    parent = this_module;
                }
            }

            super( parent );

            //Explicit comparisons to appease JSHint
            if( filename !== void 0 && filename !== null ) {
                this.load( filename );
            }
        }

        protected do_setup() {
            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );

            this._script.define = Common.bind( this.define, this );

            this._script.include = this.include.bind( this );

            this._script.on = this._script.addListener = this._script.once = ( event : string,
                                                                               cb : Function ) : any => {
                assert.equal( event, 'unload', 'modules can only listen for the unload event' );

                return this.once( event, cb );
            };
        }

        //Should ALWAYS be called within a _callWrapper
        protected do_load() : Promise<any> {
            assert.notEqual( this.filename, null, 'Cannot load a script without a filename' );

            if( !this.loading || (this._loadingText && !this.textMode) ) {
                this.unload();

                if( !this.textMode ) {
                    this.do_setup();

                    var ext = path.extname( this.filename ) || '.js';

                    //Use custom extension if available
                    if( extensions_enabled && extensions.hasOwnProperty( ext ) ) {

                        this._script.paths = Module.Module._nodeModulePaths( path.dirname( this.filename ) );

                        this._loading = true;
                        this._loadingText = false;

                        return tryPromise( extensions[ext]( this._script, this.filename ) ).then( ( src : Buffer ) => {
                            if( this._loading ) {
                                this._source = src;
                                this._script.loaded = true;

                                this._loading = false;

                                this.emit( 'loaded', this._script.exports );
                            }

                        }, err => {
                            this._loading = false;

                            this.emit( 'loading_error', err );
                        } );

                    } else {
                        if( !Module.Module._extensions.hasOwnProperty( ext ) ) {
                            this.emit( 'warning',
                                util.format( 'The extension handler for %s does not exist, defaulting to .js handler',
                                    this.filename ) );
                        }

                        this._loading = true;

                        try {
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

                    return readFile( this.filename ).then( ( src : Buffer ) => {
                        if( this._loading && this._loadingText ) {
                            this._source = src;
                            this._script.loaded = true;

                            this._loading = false;

                            this.emit( 'loaded_src', this.loaded );
                        }

                    }, err => {
                        this._loading = false;

                        this.emit( 'loading_src_error', err );
                    } );
                }
            }
        }

        public source( encoding : string = null ) : Promise<string | Buffer> {
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
                let waiting = makeMultiEventPromise( this,
                    ['loaded', 'loaded_src'],
                    ['loading_error', 'loading_src_error'] );

                return Promise.all( [this._callWrapper( this.do_load ), waiting] ).then( () => {
                    return this.source( encoding );
                } );
            }
        }

        public exports() : Promise<any> {
            if( this.loaded ) {
                if( this.pending ) {

                    //Add the event listeners first
                    let waiting = makeEventPromise( this, 'exports', 'exports_error' );

                    this._runMainFactory();

                    return waiting;

                } else {
                    return Promise.resolve( this._script.exports );
                }

            } else {
                //Add the event listeners first
                let waiting = makeEventPromise( this, 'loaded', 'loading_error' );

                return Promise.all( [this._callWrapper( this.do_load ), waiting] ).then( () => {
                    return this.exports();
                } );
            }
        }

        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        public call( ...args : any[] ) : Promise<any> {
            return this.apply( args );
        }

        public apply( args : any[] ) : Promise<any> {
            if( !this.textMode ) {
                return this.exports().then( ( main : any ) => {
                    if( typeof main === 'function' ||
                        (main !== void 0 && main !== null && typeof main['default'] === 'function') ) {

                        if( typeof main['default'] === 'function' ) {
                            main = main['default'];
                        }

                        if( isGeneratorFunction( main ) ) {
                            main = makeCoroutine( main );
                        }

                        return this._callWrapper( main, null, args );

                    } else {
                        return main;
                    }
                } );

            } else {
                return this.source.apply( this, args );
            }
        }

        public reference( ...args : any[] ) : Reference {
            return this.reference_apply( args );
        }

        public reference_apply( args : any[] ) : Reference {
            return new Reference( this, args );
        }

        public load( filename : string, watch : boolean = true ) : Script {
            filename = path.resolve( filename );

            this.close( false );

            this.id = path.basename( filename );

            this._script.filename = filename;

            if( watch ) {
                this.watch();
            }

            this.emit( 'change', 'change', this.filename );

            return this;
        }

        public watch( persistent : boolean = false ) : boolean {
            if( !this.watched ) {
                var watcher : fs.FSWatcher;

                try {
                    watcher = this._watcher = fs.watch( this.filename, {
                        persistent: persistent
                    } );

                } catch( err ) {
                    throw Common.normalizeError( this.filename, 'nodefine', err );
                }

                //These are separated out so rename and change events can be debounced separately.
                var onChange = _.debounce( ( event : string, filename : string ) => {
                    this.unload();
                    this.emit( 'change', event, filename );

                }, this.debounceMaxWait );

                var onRename = _.debounce( ( event : string, filename : string ) => {
                    var old_filename = this._script.filename;

                    //A simple rename doesn't change file content, so just change the filename
                    //and leave the script loaded
                    this._script.filename = filename;

                    this.emit( 'rename', old_filename, filename );

                }, this.debounceMaxWait );

                watcher.on( 'change', ( event : string, filename : string ) => {
                    //path.resolve doesn't like nulls, so this has to be done first
                    if( filename === null || filename === void 0 ) {
                        //If filename is null, that is generally a bad sign, so just close the script (not permanently)
                        this.close( false );

                    } else {

                        //This is important because fs.watch 'change' event only returns things like 'script.js'
                        //as a filename, which when resolved normally is relative to process.cwd(), not where the script
                        //actually is. So we have to get the directory of the last filename and combine it with the new name
                        filename = path.resolve( this.baseUrl, filename );

                        if( event === 'change' && this.loaded ) {
                            onChange( event, filename )

                        } else if( event === 'rename' && filename !== this.filename ) {
                            onRename( event, filename );
                        }
                    }
                } );

                watcher.on( 'error', ( error : NodeJS.ErrnoException ) => {
                    //In the event of an error, unload and unwatch
                    this.close( false );

                    //Would it be better to throw?
                    this.emit( 'error', error );
                } );

                return true;
            }

            return false;
        }

        public unwatch() : boolean {
            if( this.watched ) {
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();
                return delete this._watcher;
            }

            return false;
        }
    }

    export class TextScript extends Script {
        public constructor( filename? : string, parent? : Module.IModule ) {
            super( filename, parent );
        }

        get textMode() : boolean {
            return true;
        }
    }

    export class SourceScript extends Script {
        protected _source : any; //string|Reference

        private _onChange : ( event : string, filename : string ) => any;

        get filename() : string {
            return this._script.filename;
        }

        set filename( value : string ) {
            this._script.filename = value;
        }

        get baseUrl() : string {
            return path.dirname( this.filename );
        }

        set baseUrl( value : string ) {
            value = path.dirname( value );

            this.filename = value + path.basename( this.filename );
        }

        get watched() : boolean {
            return this._onChange === void 0;
        }

        public source( encoding : string = null ) : Promise<string | Buffer> {
            var srcPromise : Promise<string | Buffer>;

            if( this._source instanceof ReferenceBase ) {
                srcPromise = this._source.value().then( ( src : string | Buffer ) => {
                    if( !Buffer.isBuffer( src ) ) {
                        assert.strictEqual( typeof src, 'string',
                            'Reference source must return string or Buffer as value' );
                    }

                    return src;
                } );

            } else {
                srcPromise = Promise.resolve( this._source );
            }

            return srcPromise.then( ( src : string | Buffer ) => {
                if( extensions_enabled ) {
                    src = Common.injectAMDAndStripBOM( src );

                } else {
                    src = Common.stripBOM( src );
                }

                if( Buffer.isBuffer( src ) && encoding !== void 0 && encoding !== null ) {
                    return (<Buffer>src).toString( encoding );

                } else {
                    return src;
                }
            } );
        }

        constructor( src? : any, parent : Module.IModule = this_module ) {
            super( null, parent );

            if( src !== void 0 && src !== null ) {
                this.load( src );
            }
        }

        protected do_compile() : Promise<any> {
            assert.notStrictEqual( this._source, void 0, 'Source must be set to compile' );

            return this.source( 'utf-8' ).then( ( src : string ) => {
                this._script._compile( src, this.filename );

                this._script.loaded = true;

                this.emit( 'loaded', this.loaded );

                return this.exports();
            } );
        }

        protected do_load() : any {
            this.unload();

            this.do_setup();

            return this.do_compile();
        }

        public load( src : any, watch : boolean = true ) : SourceScript {
            this.close( false );

            assert( typeof src === 'string' || src instanceof ReferenceBase, 'Source must be a string or Reference' );

            this._source = src;

            if( watch ) {
                this.watch();
            }

            this.emit( 'change', 'change', this.filename );

            return this;
        }

        public watch() : boolean {
            if( !this.watched && this._source instanceof ReferenceBase ) {

                this._onChange = _.debounce( ( event : string, filename : string ) => {
                    this.unload();
                    this.emit( 'change', event, filename );
                }, this.debounceMaxWait );

                this._source.on( 'change', this._onChange );

                return true;
            }

            return false;
        }

        public unwatch() : boolean {
            if( this.watched && this._source instanceof ReferenceBase ) {
                this._source.removeListener( 'change', this._onChange );
                return delete this._onChange;
            }

            return false;
        }
    }

    class ScriptAdapter extends Script {
        constructor( private _manager : Manager, filename : string, parent : Module.IModule ) {
            super( filename, parent );

            //When a script is renamed, it should be reassigned in the manager
            //Otherwise, when it's accessed at the new location, the manager just creates a new script
            this.on( 'rename', ( event, oldname, newname ) => {
                _manager.scripts.set( newname, _manager.scripts.get( oldname ) );
                _manager.scripts.delete( oldname );
            } );
        }

        get manager() : Manager {
            return this._manager;
        }

        public include( filename : string, load : boolean = false ) : ScriptAdapter {
            //make sure filename can be relative to the current script
            var real_filename : string = path.resolve( this.baseUrl, filename );

            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script : ScriptAdapter = this._manager.add( real_filename );

            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( load && !script.loaded ) {
                script.reload();
            }

            this._addPropagationHandler( script, 'change', () => {
                this.unload();
                this.emit( 'change', this.filename );
            } );

            script.propagateEvents( this._propagateEvents );

            script.maxRecursion = this.maxRecursion;

            return script;
        }

        public close( permanent? : boolean ) : boolean {
            if( permanent ) {
                delete this._manager;
            }

            return super.close( permanent );
        }
    }

    export function load( filename : string, watch : boolean = true, parent? : Module.IModule ) {
        var script : Script;

        filename = path.resolve( filename );

        if( scriptCache.has( filename ) ) {
            script = scriptCache.get( filename );

        } else {
            script = new Script( null, parent );

            script.load( filename, watch );

            //Remove the reference to the script upon close, even if it isn't permenant
            script.once( 'close', () => {
                scriptCache.delete( filename );
            } );
        }

        return script;
    }

    export function compile( src : any, watch : boolean = true, parent? : Module.IModule ) {
        var script : SourceScript = new SourceScript( src, parent );

        if( watch ) {
            script.watch();
        }

        return script;
    }

    /**** END SECTION SCRIPT ****/

    /**** BEGIN SECTION REFERENCE ****/

    export type IReference = Types.IReference<Promise<any>>;
    export type ITransformFunction = Types.ITransformFunction<Promise<any>>;

    export var identity : ITransformFunction = ( left : IReference, right : IReference ) => {
        return left.value();
    };

    class ReferenceBase extends events.EventEmitter {
        protected _onChange : ( event : string, filename : string ) => any;
        protected _value : any = void 0;
        protected _ran : boolean = false;
        protected _running : boolean = false;

        protected _run() : void {
            this.emit( 'value_error', new Error( 'Cannot get value from ReferenceBase' ) );
        }

        get ran() : boolean {
            return this._ran;
        }

        get running() : boolean {
            return this._running;
        }

        public value() : Promise<any> {
            if( this._ran ) {
                return Promise.resolve( this._value );

            } else {
                let waiting = makeEventPromise( this, 'value', 'value_error' );

                this._run();

                return waiting;
            }
        }
    }

    export class Reference extends ReferenceBase implements IReference {
        constructor( private _script : Script, private _args : any[] ) {
            super();

            //Just mark this reference as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this reference would still not be run
            this._onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            this._script.on( 'change', this._onChange );
        }

        protected _run() : void {
            if( !this._running ) {
                this._running = true;

                this._script.apply( this._args ).then( ( value )=> {
                    if( typeof this._value === 'object' ) {
                        this._value = Object.freeze( this._value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;
                    this._running = false;

                    this.emit( 'value', this._value );

                } ).catch( err => {
                    this._running = false;

                    this.emit( 'value_error', err );
                } );
            }
        }

        get closed() : boolean {
            return this._script === void 0;
        }

        static join( left : IReference, right : IReference, transform? : ITransformFunction ) : IReference {
            return new JoinedTransformReference( left, right, transform );
        }

        static resolve( value : any ) : IReference {
            if( value instanceof ReferenceBase ) {
                return value;

            } else {
                return new ResolvedReference( value );
            }
        }

        //Creates a binary tree (essentially) of joins from an array of References using a single transform
        static join_all( refs : IReference[], transform? : ITransformFunction ) : IReference {
            assert( Array.isArray( refs ), 'join_all can only join arrays of References' );

            if( refs.length === 0 ) {
                return null;

            } else if( refs.length === 1 ) {
                return refs[0];

            } else if( refs.length === 2 ) {
                return Reference.join( refs[0], refs[1], transform );

            } else {
                var mid = Math.floor( refs.length / 2 );

                var left : IReference = Reference.join_all( refs.slice( 0, mid ), transform );
                var right : IReference = Reference.join_all( refs.slice( mid ), transform );

                return Reference.join( left, right, transform );
            }
        }

        static transform( ref : IReference, transform? : ITransformFunction ) {
            return new TransformReference( ref, transform );
        }

        public join( ref : IReference, transform? : ITransformFunction ) : IReference {
            return Reference.join( this, ref, transform );
        }

        public transform( transform? : ITransformFunction ) {
            return Reference.transform( this, transform );
        }

        public left() : IReference {
            return null;
        }

        public right() : IReference {
            return null;
        }

        public close() {
            if( !this.closed ) {
                this._script.removeListener( 'change', this._onChange );

                delete this._value;
                delete this._args;
                delete this._script; //Doesn't really delete it, just removes it from this
            }
        }
    }

    class TransformReference extends ReferenceBase implements IReference {
        constructor( private _ref : IReference, private _transform : ITransformFunction ) {
            super();

            assert( _ref instanceof ReferenceBase, 'transform will only work on References' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );

            if( isGeneratorFunction( _transform ) ) {
                this._transform = makeCoroutine( _transform );
            }

            this._onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            this._ref.on( 'change', this._onChange );
        }

        protected _run() : void {
            if( !this._running ) {
                this._running = true;

                tryReject( this._transform, null, this._ref, null ).then( ( value ) => {
                    if( typeof value === 'object' ) {
                        this._value = Object.freeze( value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;
                    this._running = false;

                    this.emit( 'value', this._value );

                } ).catch( err => {
                    this._running = false;

                    this.emit( 'value_error', err );
                } );

            }
        }

        get closed() : boolean {
            return this._ref === void 0;
        }

        public join( ref : IReference, transform? : ITransformFunction ) {
            return Reference.join( this, ref, transform );
        }

        public transform( transform? : ITransformFunction ) {
            return Reference.transform( this, transform );
        }

        public left() : IReference {
            return this._ref;
        }

        public right() : IReference {
            return null;
        }

        public close( recursive : boolean = false ) {
            if( !this.closed ) {
                this._ref.removeListener( 'change', this._onChange );
                delete this._value;

                if( recursive ) {
                    this._ref.close( recursive );
                }

                delete this._ref;
            }
        }
    }

    class JoinedTransformReference extends ReferenceBase implements IReference {
        constructor( private _left : IReference, private _right : IReference,
                     private _transform : ITransformFunction = identity ) {
            super();

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
            this._onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            _left.on( 'change', this._onChange );
            _right.on( 'change', this._onChange );
        }

        protected _run() : void {
            if( !this._running ) {
                this._running = true;

                tryReject( this._transform, null, this._left, this._right ).then( ( value ) => {
                    if( typeof value === 'object' ) {
                        this._value = Object.freeze( value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;
                    this._running = false;

                    this.emit( 'value', this._value );

                } ).catch( err => {
                    this._running = false;

                    this.emit( 'value_error', err );
                } );
            }
        }

        get closed() : boolean {
            return this._left === void 0 || this._right === void 0;
        }

        public join( ref : IReference, transform? : ITransformFunction ) : IReference {
            return Reference.join( this, ref, transform );
        }

        public transform( transform? : ITransformFunction ) {
            return Reference.transform( this, transform );
        }

        public left() : IReference {
            return this._left;
        }

        public right() : IReference {
            return this._right;
        }

        public close( recursive : boolean = false ) {
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
        }
    }

    class ResolvedReference extends ReferenceBase implements IReference {
        protected _resolver : Promise<any>;

        constructor( value : any ) {
            super();

            this._value = value;

            this._run();
        }

        protected _run() : void {
            if( !this._running ) {
                this._running = true;

                tryPromise( this._value ).then( ( result ) => {
                    if( typeof result === 'object' ) {
                        this._value = Object.freeze( result );

                    } else {
                        this._value = result;
                    }

                    this._ran = true;
                    this._running = false;

                    this.emit( 'value', this._value );

                } ).catch( err => {
                    this._running = false;

                    this.emit( 'value_error', err );
                } );
            }
        }

        get closed() : boolean {
            return !this._running && !this._ran;
        }

        public join( ref : IReference, transform? : ITransformFunction ) : IReference {
            return Reference.join( this, ref, transform );
        }

        public transform( transform? : ITransformFunction ) {
            return Reference.transform( this, transform );
        }

        public left() : IReference {
            return null;
        }

        public right() : IReference {
            return null;
        }

        public close() {
            if( this._ran ) {
                this._ran = false;
                delete this._value;
            }
        }
    }

    /**** BEGIN SECTION MANAGER ****/

    export class Manager {
        private _debounceMaxWait : number = null; //set to null if it shouldn't set it at all

        private _maxListeners : number = null; //set to null if it shouldn't set it at all

        private _config : IAMDConfig = null;

        private _scripts : Map<string, ScriptAdapter> = MapAdapter.createMap<ScriptAdapter>();

        private _cwd : string = process.cwd();

        public cwd() : string {
            return this._cwd;
        }

        public chdir( value : string ) : string {
            this._cwd = path.resolve( this.cwd(), value );

            return this._cwd;
        }

        set debounceMaxWait( time : number ) {
            if( time !== null && time !== void 0 ) {
                this._debounceMaxWait = Math.floor( time );

                assert( !isNaN( this._debounceMaxWait ), 'debounceMaxWait must be set to a number' );

            } else {
                this._debounceMaxWait = null;
            }
        }

        get debounceMaxWait() : number {
            return this._debounceMaxWait;
        }

        public setMaxListeners( value : number ) {
            if( value !== null && value !== void 0 ) {

                this._maxListeners = Math.floor( value );

                assert( !isNaN( this._maxListeners ), 'setMaxListeners must be passed a number' );

            } else {
                this._maxListeners = null;
            }
        }

        public getMaxListeners() : number {
            return this._maxListeners;
        }

        public config( config? : IAMDConfig ) : IAMDConfig {
            if( config !== void 0 && config !== null ) {
                this._config = Common.normalizeConfig( config );
            }

            return this._config;
        }

        private _parent : Module.IModule;

        get parent() : Module.IModule {
            return this._parent;
        }

        get scripts() : Map<string, ScriptAdapter> {
            return this._scripts;
        }

        private _propagateEvents : boolean = false;

        public propagateEvents( enable : boolean = true ) : boolean {
            var wasPropagating : boolean = this._propagateEvents;

            this._propagateEvents = enable;

            if( wasPropagating && !enable ) {
                //immediately disable propagation by pretending it's already been propagated
                this._scripts.forEach( ( script : Script ) => {
                    script.propagateEvents( false );
                } );

            } else if( !wasPropagating && enable ) {
                this._scripts.forEach( ( script : Script ) => {
                    script.propagateEvents();
                } );
            }

            return wasPropagating;
        }

        constructor( grandParent? : Module.IModule ) {
            this._parent = new Module.Module( 'ScriptManager', grandParent );
        }

        //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
        //but this functions as a way to add and/or get a script in one fell swoop.
        //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
        //from watching a file.
        public add( filename : string, watch : boolean = true ) : ScriptAdapter {
            filename = path.resolve( this.cwd(), filename );

            var script : ScriptAdapter = this._scripts.get( filename );

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
        }

        //Removes a script from the manager. But closing it permenantly is optional,
        //as it may sometimes make sense to move it out of a manager and use it independently.
        //However, that is quite rare so close defaults to true
        public remove( filename : string, close : boolean = true ) : boolean {
            filename = path.resolve( this.cwd(), filename );

            var script : ScriptAdapter = this._scripts.get( filename );

            if( script !== void 0 ) {

                if( close ) {
                    script.close();
                }

                return this._scripts.delete( filename );
            }

            return false;
        }

        public call( filename : string, ...args : any[] ) : Promise<any> {
            return this.apply( filename, args );
        }

        public apply( filename : string, args : any[] ) : Promise<any> {
            var script : ScriptAdapter = this.add( filename, false );

            try {
                return script.apply( args );

            } catch( err ) {
                this.remove( filename, true );

                throw err;
            }
        }

        public reference( filename : string, ...args : any[] ) : Reference {
            return this.reference_apply( filename, args );
        }

        public reference_apply( filename : string, args : any[] ) : Reference {
            let ref : Reference = this.add( filename, false ).reference( args );

            if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
                ref.setMaxListeners( this._maxListeners );
            }

            return ref;
        }

        public get( filename : string ) : ScriptAdapter {
            filename = path.resolve( this.cwd(), filename );

            return this._scripts.get( filename );
        }

        //Make closing optional for the same reason as .remove
        public clear( close : boolean = true ) {
            if( close ) {
                this._scripts.forEach( ( script : Script ) => {
                    script.close();
                } );
            }

            this._scripts.clear();
        }
    }

    /**** END SECTION MANAGER ****/
}

export = Scriptor;