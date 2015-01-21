/**
 * Created by novacrazy on 12/25/2014.
 */

import fs = require('fs');
import assert = require('assert');
import url = require('url');
import path = require('path');
import events = require('events');

import Module = require('./Module');
import Common = require('./common');
import MapAdapter = require('./map');

import Promise = require('bluebird');

function isPromise( value : any ) : boolean {
    return (value !== void 0 && value !== null)
           && (value instanceof Promise || value.hasOwnProperty( '_promise0' )
               || (typeof value.then === 'function' && typeof value.catch === 'function'));
}

function tryPromise( value : any ) {
    if( isPromise( value ) ) {
        return value;

    } else {
        return Promise.resolve( value );
    }
}

module Scriptor {
    export var this_module : Module.IModule = <any>module;

    export var default_dependencies : string[] = Common.default_dependencies;

    /**** BEGIN SECTION SCRIPT ****/

    export interface IScriptBase extends Module.IModulePublic {
        imports : {[key : string] : any};
        reference( filename : string, ...args : any[] ) : any;
        reference_apply( filename : string, args : any[] ) : any;
        reference_once( filename : string, ...args : any[] ) : Reference;
        include( filename : string, load? : boolean ) : Script;
    }

    export interface IAMDScriptBase {
        require( path : string ) : any;
        //overloads that can't be here because it would conflict with Module.IModule declarations
        //require( id : string[], cb? : ( deps : any[] ) => any, ecb? : (err : any) => any ) : any[];
        //require( id : string, cb? : ( deps : any ) => any, ecb? : (err : any) => any ) : any;

        //overloads
        define( id : string, deps : string[], factory : ( ...deps : any[] ) => any );
        define( id : string, deps : string[], factory : {[key : string] : any} );
        define( deps : string[], factory : ( ...deps : any[] ) => any );
        define( deps : string[], factory : {[key : string] : any} );
        define( factory : ( ...deps : any[] ) => any );
        define( factory : {[key : string] : any} );
    }

    export interface IScriptModule extends IScriptBase, Module.IModule, IAMDScriptBase {
        //Empty, just merges the interfaces
    }

    //Basically, ScriptBase is an abstraction to allow better 'multiple' inheritance
    //Since single inheritance is the only thing supported, a mixin has to be put into the chain, rather than,
    //well, mixed in. So ScriptBase just handles the most basic Script functions
    export class ScriptBase extends events.EventEmitter {
        protected _script : IScriptModule;
        protected _recursion : number = 0;
        protected _maxRecursion : number = 1;

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
                return Promise.reject( new RangeError( 'Script recursion limit reached at ' + this._recursion ) );

            } else {
                var result : Promise<any> = new Promise( ( resolve, reject ) => {
                    this._recursion++;

                    resolve( func.apply( this_arg, args ) );
                } );

                return result.catch( SyntaxError, ( e ) => {
                    this.unload();

                    return Promise.reject( e );

                } ).finally( () => {
                    this._recursion--;
                } );
            }
        }

        //Abstract method
        protected do_load() {
            //pass
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

        public unload() : boolean {
            var was_loaded : boolean = this.loaded;

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

            if( permanent ) {

                //Remove _script from parent
                if( this.parent !== void 0 ) {
                    var children : Module.IModule[] = this.parent.children;

                    for( var _i in children ) {
                        //Find which child is this._script, delete it and remove the (now undefined) reference
                        if( children.hasOwnProperty( _i ) && children[_i] === this._script ) {
                            delete children[_i];
                            children.splice( _i, 1 );
                            break;
                        }
                    }
                }

                //Remove _script from current object
                return delete this._script;

            } else {
                this._script.filename = null;
            }
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference( filename : string ) : Promise<any> {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_apply( filename : string, args : any[] ) : Promise<any> {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_once( filename : string ) : Reference {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public include( filename : string ) : Script {
            return null;
        }
    }

    export class AMDScript extends ScriptBase implements IAMDScriptBase {
        protected _defineCache : Map<string, any[]> = MapAdapter.createMap<any[]>();
        protected _loadCache : Map<string, any> = MapAdapter.createMap<any>();
        protected _resolver : Promise<any>;

        constructor( parent : Module.IModule ) {
            super( parent );

            //These all have to be done here as closures

            this.require['toUrl'] = ( filepath : string ) => {
                //Typescript decided it didn't like doing this part, so I did it myself
                if( filepath === void 0 ) {
                    filepath = this.filename;
                }

                if( filepath.charAt( 0 ) === '.' ) {
                    //Use the url.resolve instead of path.resolve, even though they usually do the same thing
                    return url.resolve( this.baseUrl, filepath );

                } else {
                    return filepath;
                }
            };

            var normalize = ( id : string ) => {
                return id.charAt( 0 ) === '.' ? path.resolve( this.baseUrl, id ) : id;
            };

            this.require['defined'] = ( id : string ) => {
                return this._loadCache.has( normalize( id ) );
            };

            this.require['specified'] = ( id : string ) => {
                return this._defineCache.has( normalize( id ) );
            };

            this.require['undef'] = ( id : string ) => {
                id = normalize( id );

                this._defineCache.delete( id );
                this._loadCache.delete( id );
            };

            this.require['onError'] = function onError( err : any ) {
                throw err; //default error
            };

            this.define['require'] = Common.bind( this.require, this );
        }

        get pending() : boolean {
            return this._resolver !== void 0 && this._resolver.isPending();
        }

        protected _runFactory( id : string, deps : string[], factory : ( ...deps : any[] ) => any ) : Promise<any> {
            if( id !== void 0 ) {
                this._loadCache.delete( id ); //clear before running. Will remained cleared in the event of error
            }

            if( typeof factory === 'function' ) {
                return this.require( deps ).then( ( resolvedDeps : any[] ) => {
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

        //Overloads, which can differ from Module.IModule
        public require( path : string ) : any;
        public require( id : string[], cb? : ( deps : any[] ) => any, ecb? : ( err : any ) => any ) : Promise<any>;
        public require( id : string, cb? : ( deps : any ) => any, ecb? : ( err : any ) => any ) : Promise<any>;

        //Implementation, and holy crap is it huge
        public require( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) : any {
            var normalize = path.resolve.bind( null, this.baseUrl );

            var result : any;

            if( Array.isArray( id ) ) {
                //We know it's an array, so just cast it to one to appease TypeScript
                var ids : string[] = <any>id;

                result = Promise.map( ids, id => this.require( id ) );

            } else {
                assert.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );

                //Plugins ARE supported, but they have to work like a normal module
                if( id.indexOf( '!' ) !== -1 ) {
                    //modules to be loaded through an AMD loader transform
                    var parts : string[] = id.split( '!', 2 );

                    result = this.require( parts[0] ).then( ( plugin : any ) => {
                        assert( plugin !== void 0 && plugin !== null, 'Invalid AMD plugin' );
                        assert.strictEqual( typeof plugin.load, 'function', '.load function on AMD plugin not found' );

                        id = parts[1];

                        if( plugin.normalize ) {
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
                                plugin.load( id, Common.bind( this.require, this ), onLoad, {} );

                            }
                        } );
                    } );

                } else if( id.charAt( 0 ) === '.' ) {
                    //relative modules
                    id = normalize( id );

                    //If possible, take advantage of a manager
                    var script = this.include( id );

                    if( script === null || script === void 0 ) {
                        //If no manager is available, use a normal require
                        result = this.require( id );

                    } else {
                        result = script.exports();
                    }

                } else {
                    if( id === 'require' ) {
                        result = Common.bind( this.require, this );

                    } else if( id === 'exports' ) {
                        result = this._script.exports;

                    } else if( id === 'module' ) {
                        result = this._script;

                    } else if( id === 'imports' ) {
                        result = Object.freeze( this.imports );

                    } else if( id === '_script' ) {
                        result = {
                            load: ( id, require, onLoad, config ) => {
                                var script = this.include( id );

                                if( script !== null && script !== void 0 ) {
                                    onLoad( script );

                                } else {
                                    onLoad( new Script( id, this._script ) );
                                }
                            }
                        };

                    } else if( id === '_once' ) {
                        result = {
                            load: ( id, require, onLoad, config ) => {
                                var reference = this.reference_once( id );

                                if( reference !== null && reference !== void 0 ) {
                                    onLoad( reference );

                                } else {
                                    onLoad.error( {
                                        requireType: 'nodefine',
                                        message:     'Cannot reference module outside of a manager'
                                    } );
                                }
                            }
                        };

                    } else if( this._loadCache.has( id ) ) {
                        result = this._loadCache.get( id );

                    } else if( this._defineCache.has( id ) ) {
                        var args : any[] = this._defineCache.get( id );

                        result = this._runFactory( args[0], args[1], args[2] ).then( ( exported ) => {
                            this._loadCache.set( id, exported );

                            return exported;
                        } );
                        //The callbacks can be done pretty easily this way

                    } else {
                        //In a closure so the try-catch block doesn't prevent optimization of the rest of the function

                        result = new Promise( ( resolve, reject ) => {
                            try {
                                //Normal module loading akin to the real 'require' function
                                resolve( Module.Module._load( id, this._script ) );

                            } catch( err ) {
                                reject( Common.normalizeError( id, 'nodefine', err ) );
                            }
                        } );
                    }
                }
            }

            if( !isPromise( result ) ) {
                result = Promise.resolve( result );
            }

            if( typeof cb === 'function' ) {
                result.then( ( resolvedResult : any ) => {
                    if( Array.isArray( resolvedResult ) ) {
                        cb.apply( null, resolvedResult );

                    } else {
                        cb.call( null, resolvedResult );
                    }

                }, typeof errcb === 'function' ? errcb : this.require['onError'] );
            }

            return result;
        }

        //overloads
        public define( id : string, deps : string[], factory : ( ...deps : any[] ) => any );
        public define( id : string, deps : string[], factory : {[key : string] : any} );
        public define( deps : string[], factory : ( ...deps : any[] ) => any );
        public define( deps : string[], factory : {[key : string] : any} );
        public define( factory : ( ...deps : any[] ) => any );
        public define( factory : {[key : string] : any} );

        //implementation
        public define( id : any, deps? : any, factory? : any ) : void {
            //This argument parsing code is taken from amdefine
            if( Array.isArray( id ) ) {
                factory = deps;
                deps = id;
                id = void 0;

            } else if( typeof id !== 'string' ) {
                factory = id;
                id = deps = void 0;
            }

            if( deps !== void 0 && !Array.isArray( deps ) ) {
                factory = deps;
                deps = void 0;
            }

            if( deps === void 0 ) {
                deps = default_dependencies;

            } else {
                deps = deps.concat( default_dependencies )
            }

            if( id !== void 0 ) {
                assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

                this._defineCache.set( id, [id, deps, factory] );

            } else {
                this._resolver = this._runFactory( id, deps, factory ).then( ( result ) => {
                    //Allows for main factory to not return anything.
                    if( result !== null && result !== void 0 ) {
                        this._script.exports = result;
                    }

                    delete this._resolver;

                    return this._script.exports;
                } );
            }
        }

        public unload() : boolean {
            var res : boolean = super.unload();

            //unload also clears defines and requires
            this._defineCache.clear();
            this._loadCache.clear();

            if( this._resolver !== void 0 ) {
                if( this._resolver.isCancellable() ) {
                    this._resolver.cancel();
                }

                delete this._resolver;
            }

            return res;
        }
    }

    export class Script extends AMDScript implements IScriptBase {

        protected _watcher : fs.FSWatcher;

        protected _reference : Reference = void 0;

        get watched() : boolean {
            return this._watcher !== void 0;
        }

        constructor( filename? : string, parent : Module.IModule = this_module ) {
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

            //bind all these to this because calling them inside the script might do something weird.
            //probably not, but still
            this._script.reference = this.reference.bind( this );
            this._script.reference_apply = this.reference_apply.bind( this );
            this._script.reference_once = this.reference_once.bind( this );
            this._script.include = this.include.bind( this );
        }

        //Should ALWAYS be called within a _callWrapper
        protected do_load() {
            this.unload();

            this.do_setup();

            //Because Scriptor uses require extensions, it has to go through this, which is synchronous. Damn.
            this._script.load( this._script.filename );

            this.emit( 'loaded', this.loaded );
        }

        public exports() : Promise<any> {
            if( this.loaded ) {
                assert( this.loaded );

                if( this.pending ) {
                    return this._resolver;

                } else {
                    return Promise.resolve( this._script.exports );
                }

            } else {
                return this._callWrapper( this.do_load ).then( () => this.exports() );
            }
        }

        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        public call( ...args : any[] ) : Promise<any> {
            return this.apply( args );
        }

        public apply( args : any[] ) : Promise<any> {
            return this.exports().then( ( main : any ) => {
                if( typeof main === 'function' ) {
                    return this._callWrapper( main, null, args );

                } else {
                    return main;
                }
            } );
        }

        public call_once( ...args : any[] ) : Reference {
            return this.apply_once( args );
        }

        public apply_once( args : any[] ) : Reference {
            if( this._reference !== void 0 ) {
                return this._reference;

            } else {
                this._reference = new Reference( this, args );

                return this._reference;
            }
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

        public watch() : boolean {
            if( !this.watched ) {
                var watcher : fs.FSWatcher;

                try {
                    watcher = this._watcher = fs.watch( this.filename, {
                        persistent: false
                    } );

                } catch( err ) {
                    throw Common.normalizeError( this.filename, 'nodefine', err );
                }

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
                            this.unload();

                        } else if( event === 'rename' && filename !== this.filename ) {
                            //A simple rename doesn't change file content, so just change the filename
                            //and leave the script loaded
                            this._script.filename = filename;
                        }
                    }

                    this.emit( 'change', event, filename );
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

        public clearReference() : boolean {
            var was_referenced : boolean = this._reference !== void 0;

            if( was_referenced ) {
                this._reference.close();
            }

            delete this._reference;

            return was_referenced;
        }
    }

    export class SourceScript extends Script {
        protected _source : any; //string|Reference
        protected _loadResolver : Promise<any>;

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

        get source() : Promise<string> {
            var srcPromise : Promise<string>;

            if( this._source instanceof ReferenceBase ) {
                srcPromise = this._source.value().then( ( src : string ) => {
                    assert.strictEqual( typeof src, 'string', 'Reference source must return string as value' );

                    return src;
                } );

            } else {
                srcPromise = Promise.resolve( this._source );
            }

            return srcPromise.then( ( src : string ) => {
                //strip BOM
                if( src.charCodeAt( 0 ) === 0xFEFF ) {
                    src = src.slice( 1 );
                }

                return src;
            } );
        }

        constructor( src? : any, parent : Module.IModule = this_module ) {
            super( null, parent );

            if( src !== void 0 && src !== null ) {
                this.load( src );
            }
        }

        protected do_compile() {
            if( !this.loaded ) {
                assert.notStrictEqual( this._source, void 0, 'Source must be set to compile' );

                this._loadResolver = this.source.then( ( src : string ) => {
                    this._script._compile( src, this.filename );

                    this._script.loaded = true;

                    delete this._loadResolver;

                    this.emit( 'loaded', this.loaded );
                } );
            }
        }

        protected do_load() {
            this.unload();

            this.do_setup();

            this.do_compile();
        }

        public exports() : Promise<any> {
            if( this.loaded ) {
                if( this._loadResolver !== void 0 && this._loadResolver.isPending() ) {
                    return this._loadResolver.then( () => super.exports() );

                } else {
                    return super.exports();
                }

            } else {
                return this._callWrapper( this.do_load ).then( () => this.exports() );
            }
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

                this._onChange = ( event : string, filename : string ) => {
                    this.emit( 'change', event, filename );

                    this.unload();
                };

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

    export class ScriptAdapter extends Script {
        constructor( public manager : Manager, filename : string, parent : Module.IModule ) {
            super( filename, parent );
        }

        //Again just taking advantage of TypeScript's variable arguments
        public reference( filename : string, ...args : any[] ) : Promise<any> {
            return this.reference_apply( filename, args );
        }

        //This is kind of funny it's so simple
        public reference_apply( filename : string, args : any[] ) : Promise<any> {
            //include is used instead of this.manager.apply because include takes into account
            //relative includes/references
            return this.include( filename, false ).apply( args );
        }

        //Basically, whatever arguments you give this the first time it's called is all you get
        public reference_once( filename : string, ...args : any[] ) : Reference {
            var real_filename : string = path.resolve( this.baseUrl, filename );

            return this.manager.add( real_filename ).apply_once( args );
        }

        public include( filename : string, load : boolean = false ) : ScriptAdapter {
            //make sure filename can be relative to the current script
            var real_filename : string = path.resolve( this.baseUrl, filename );

            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script : ScriptAdapter = this.manager.add( real_filename );

            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( load && !script.loaded ) {
                script.reload();
            }

            return script;
        }
    }

    export function load( filename : string, watch : boolean = true ) {
        var script : Script = new Script( filename );

        if( watch ) {
            script.watch();
        }

        return script;
    }

    export function compile( src : any, watch : boolean = true ) {
        var script : SourceScript = new SourceScript( src );

        if( watch ) {
            script.watch();
        }

        return script;
    }

    /**** END SECTION SCRIPT ****/

    /**** BEGIN SECTION REFERENCE ****/

    export interface ITransformFunction {
        ( left : IReference, right : IReference ) : Promise<any>;
    }

    export var identity : ITransformFunction = ( left : IReference, right : IReference ) => {
        return left.value();
    };

    export interface IReference extends NodeJS.EventEmitter {
        value() : Promise<any>;
        ran : boolean;
        closed : boolean;
        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction )
        left() : IReference;
        right() : IReference;
        close( recursive? );
    }

    export class ReferenceBase extends events.EventEmitter {
        protected _onChange : ( event : string, filename : string ) => any;
        protected _value : any = void 0;
        protected _ran : boolean = false;
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

        public value() : Promise<any> {
            if( !this._ran ) {
                return this._script.apply( this._args ).then( ( value )=> {
                    if( typeof this._value === 'object' ) {
                        this._value = Object.freeze( this._value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;

                    return this._value;
                } );

            } else {
                return Promise.resolve( this._value );
            }
        }

        get ran() : boolean {
            return this._ran;
        }

        get closed() : boolean {
            return this._script === void 0;
        }

        static join( left : IReference, right : IReference, transform? : ITransformFunction ) : IReference {
            return new JoinedTransformReference( left, right, transform );
        }

        static resolve( value : any ) : IReference {
            return new ResolvedReference( value );
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
            return this;
        }

        public right() : IReference {
            return null;
        }

        public close() {
            if( !this.closed ) {
                this._script.removeListener( 'change', this._onChange );

                delete this._value;
                this._script.clearReference();
                delete this._script; //Doesn't really delete it, just removes it from this
            }
        }
    }

    export class TransformReference extends ReferenceBase implements IReference {
        constructor( private _ref : IReference, private _transform : ITransformFunction ) {
            super();

            assert( _ref instanceof ReferenceBase, 'transform will only work on References' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );

            this._onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            this._ref.on( 'change', this._onChange );
        }

        public value() : Promise<any> {
            if( !this._ran ) {
                return this._transform( this._ref, null ).then( ( value ) => {
                    if( typeof value === 'object' ) {
                        this._value = Object.freeze( value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;

                    return this._value;
                } );

            } else {
                return Promise.resolve( this._value );
            }
        }

        get ran() : boolean {
            return this._ran;
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
            return this;
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

    export class JoinedTransformReference extends ReferenceBase implements IReference {
        constructor( private _left : IReference, private _right : IReference,
                     private _transform : ITransformFunction = identity ) {
            super();

            //Just to prevent stupid mistakes
            assert( _left instanceof ReferenceBase &&
                    _right instanceof ReferenceBase, 'join will only work on References' );
            assert.notEqual( _left, _right, 'Cannot join to self' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );

            //This has to be a closure because the two emitters down below
            //tend to call this with themselves as this
            this._onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            _left.on( 'change', this._onChange );
            _right.on( 'change', this._onChange );
        }

        public value() : Promise<any> {
            if( !this._ran ) {
                return this._transform( this._left, this._right ).then( ( value ) => {
                    if( typeof value === 'object' ) {
                        this._value = Object.freeze( value );

                    } else {
                        this._value = value;
                    }

                    this._ran = true;

                    return this._value;
                } );

            } else {
                return Promise.resolve( this._value );
            }
        }

        get ran() : boolean {
            return this._ran;
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

    export class ResolvedReference extends ReferenceBase implements IReference {
        protected _resolver : Promise<any>;

        constructor( value : any ) {
            super();

            this._resolver = tryPromise( value ).then( ( result ) => {
                if( typeof result === 'object' ) {
                    this._value = Object.freeze( result );

                } else {
                    this._value = result;
                }

                this._ran = true;

                delete this._resolver;

                return this._value;
            } );
        }

        get closed() : boolean {
            return this._resolver === void 0 && !this._ran;
        }

        get ran() : boolean {
            return this._ran;
        }

        public value() : Promise<any> {
            if( this._resolver !== void 0 && !this._ran ) {
                return this._resolver;

            } else {
                return Promise.resolve( this._value );
            }
        }

        public join( ref : IReference, transform? : ITransformFunction ) : IReference {
            return Reference.join( this, ref, transform );
        }

        public transform( transform? : ITransformFunction ) {
            return Reference.transform( this, transform );
        }

        public left() : IReference {
            return this;
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

        private _scripts : Map<string, ScriptAdapter> = MapAdapter.createMap<ScriptAdapter>();

        private _cwd : string = process.cwd();

        get cwd() : string {
            return this._cwd;
        }

        set cwd( value : string ) {
            this.chdir( value );
        }

        public chdir( value : string ) : string {
            this._cwd = path.resolve( this.cwd, value );

            return this._cwd;
        }

        private _parent : Module.IModule;

        get parent() : Module.IModule {
            return this._parent;
        }

        get scripts() : ScriptAdapter[] {
            return Object.freeze( this._scripts );
        }

        constructor( grandParent? : Module.IModule ) {
            this._parent = new Module.Module( 'ScriptManager', grandParent );
        }

        //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
        //but this functions as a way to add and/or get a script in one fell swoop.
        //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
        //from watching a file.
        public add( filename : string, watch : boolean = true ) : ScriptAdapter {
            filename = path.resolve( this.cwd, filename );

            var script : ScriptAdapter = this._scripts.get( filename );

            if( script === void 0 ) {
                script = new ScriptAdapter( this, filename, this._parent );

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
            filename = path.resolve( this.cwd, filename );

            var script : ScriptAdapter = this._scripts.get( filename );

            if( script !== void 0 ) {

                if( close ) {
                    script.close();
                }

                return delete this._scripts.delete( filename );
            }

            return false;
        }

        public call( filename : string, ...args : any[] ) : Promise<any> {
            return this.apply( filename, args );
        }

        public apply( filename : string, args : any[] ) : Promise<any> {
            return this.add( filename ).apply( args );
        }

        public once( filename : string, ...args : any[] ) : Reference {
            return this.apply_once( filename, args );
        }

        public call_once( filename : string, ...args : any[] ) : Reference {
            return this.apply_once( filename, args );
        }

        public apply_once( filename : string, args : any[] ) : Reference {
            return this.add( filename ).apply_once( args );
        }

        public get( filename : string ) : ScriptAdapter {
            filename = path.resolve( this.cwd, filename );

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
