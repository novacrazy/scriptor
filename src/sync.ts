/**
 * Created by novacrazy on 12/25/2014.
 */

import fs = require('fs');
import util = require('util');
import assert = require('assert');
import url = require('url');
import path = require('path');
import events = require('events');

import Module = require('./Module');
import Common = require('./common');
import MapAdapter = require('./map');

module Scriptor {
    export var this_module : Module.IModule = <any>module;

    export var default_dependencies : string[] = Common.default_dependencies;

    export var default_max_recursion : number = Common.default_max_recursion;

    export var extensions : {[ext : string] : ( module : Module.IModule, filename : string ) => void} = {};

    export function enableCustomExtensions( enable : boolean = true ) {
        if( enable ) {
            extensions['.js'] = ( module : Module.IModule, filename : string ) => {
                var content = fs.readFileSync( filename, 'utf8' );
                module._compile( Common.injectAMD( Common.stripBOM( content ) ), filename );
            };

        } else {
            delete extensions['.js'];
        }
    }

    export function disableCustomExtensions() {
        enableCustomExtensions( false );
    }

    /**** BEGIN SECTION SCRIPT ****/

    export interface IScriptBase extends Module.IModulePublic {
        imports : {[key : string] : any};
        reference( ...args : any[] ) : Reference;
        reference_apply( args : any[] ) : Reference;
        include( filename : string, load? : boolean ) : Script;
    }

    export interface IDefineFunction {
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => any ) : void;
        ( id : string, deps : string[], factory : {[key : string] : any} ) : void;
        ( deps : string[], factory : ( ...deps : any[] ) => any ) : void;
        ( deps : string[], factory : {[key : string] : any} ) : void;
        ( factory : ( ...deps : any[] ) => any ) : void;
        ( factory : {[key : string] : any} ) : void;
    }

    export interface IAMDScriptBase {
        require( path : string ) : any;
        //overloads that can't be here because it would conflict with Module.IModule declarations
        //require( id : string[], cb? : ( deps : any[] ) => any, ecb? : (err : any) => any ) : any[];
        //require( id : string, cb? : ( deps : any ) => any, ecb? : (err : any) => any ) : any;

        define : IDefineFunction;
    }

    export interface IScriptModule extends IScriptBase, Module.IModule, IAMDScriptBase, events.EventEmitter {
        //Empty, just merges the interfaces
    }

    //Basically, ScriptBase is an abstraction to allow better 'multiple' inheritance
    //Since single inheritance is the only thing supported, a mixin has to be put into the chain, rather than,
    //well, mixed in. So ScriptBase just handles the most basic Script functions
    export class ScriptBase extends events.EventEmitter {
        protected _script : IScriptModule;
        protected _recursion : number = 0;
        protected _maxRecursion : number = default_max_recursion;

        public imports : {[key : string] : any} = {};

        constructor( parent : Module.IModule ) {
            super();

            this._script = <any>(new Module.Module( null, parent ));
        }

        //Wrap it before you tap it.
        //No, but really, it's important to protect against errors in a generic way
        protected _callWrapper( func : Function, this_arg : any = this, args : any[] = [] ) : any {
            //Just in case, always use recursion protection
            if( this._recursion > this._maxRecursion ) {
                throw new RangeError( util.format( 'Script recursion limit reached at %d for script %s', this._recursion, this.filename ) );
            }

            try {
                //This is placed in the try-block so the release is mirrored in the finally block
                this._recursion++;

                return func.apply( this_arg, args );

            } catch( e ) {
                if( e instanceof SyntaxError ) {
                    this.unload();
                }

                throw e;

            } finally {
                //release recurse
                this._recursion--;
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

            this.emit( 'unload' );

            this._script.loaded = false;
            this._script.exports = {};

            return was_loaded;
        }

        public reload() : boolean {
            var was_loaded : boolean = this.loaded;

            //Force it to reload and recompile the script.
            this._callWrapper( this.do_load );

            //If a Reference depends on this script, then it should be updated when it reloads
            //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
            this.emit( 'change', 'change', this.filename );

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
                Common.removeFromParent( this._script );

                //Remove _script from current object
                return delete this._script;

            } else {
                this._script.filename = null;
            }
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public include( filename : string ) : Script {
            return null;
        }
    }

    export class AMDScript extends ScriptBase implements IAMDScriptBase {
        protected _defineCache : Map<string, any[]> = MapAdapter.createMap<any[]>();
        protected _loadCache : Map<string, any> = MapAdapter.createMap<any>();

        public require : ( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) => any;
        public define : IDefineFunction;

        private _init() {
            var require = ( ...args : any[] ) => {
                return this._require.apply( this, args );
            };

            require['toUrl'] = ( filepath : string ) => {
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

            require['defined'] = ( id : string ) => {
                return this._loadCache.has( normalize( id ) );
            };

            require['specified'] = ( id : string ) => {
                return this._defineCache.has( normalize( id ) );
            };

            require['undef'] = ( id : string ) => {
                id = normalize( id );

                this._loadCache.delete( id );
                this._defineCache.delete( id );

                return this;
            };

            //This is not an anonymous so stack traces make a bit more sense
            require['onError'] = function onErrorDefault( err : any ) {
                throw err; //default error
            };

            this.require = require;

            var define = ( ...args : any[] ) => {
                return this._define.apply( this, args );
            };

            define['require'] = require;

            this.define = define;
        }

        constructor( parent : Module.IModule ) {
            super( parent );

            this._init();
        }

        //This always returns false for the synchronous build.
        get pending() : boolean {
            return false;
        }

        protected _runFactory( id : string,
                               deps : string[],
                               factory : ( ...deps : any[] ) => any ) : any {
            if( id !== void 0 ) {
                this._loadCache.delete( id ); //clear before running. Will remained cleared in the event of error
            }

            if( typeof factory === 'function' ) {
                return factory.apply( this._script.exports, this._require( deps ) );

            } else {
                return factory;
            }
        }

        //Overloads, which can differ from Module.IModule
        protected _require( path : string ) : any;
        protected _require( id : string[], cb? : ( deps : any[] ) => any, ecb? : ( err : any ) => any ) : any[];
        protected _require( id : string, cb? : ( deps : any ) => any, ecb? : ( err : any ) => any ) : any;

        //Implementation, and holy crap is it huge
        protected _require( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) : any {
            var normalize = path.resolve.bind( null, this.baseUrl );

            var had_error : boolean = false;

            var onError = ( _id : any, type : string, err : any ) => {
                err = Common.normalizeError( _id, type, err );

                had_error = true;

                if( typeof errcb === 'function' ) {
                    errcb( err );

                } else {
                    this.require['onError']( err );
                }
            };

            var result : any;

            if( Array.isArray( id ) ) {
                //We know it's an array, so just cast it to one to appease TypeScript
                var ids : string[] = <any>id;

                //Love this line
                result = ids.map( _id => this._require( _id ) );

            } else {
                assert.strictEqual( typeof id, 'string', 'require id must be a string or array of strings' );

                //Plugins ARE supported, but they have to work like a normal module
                if( id.indexOf( '!' ) !== -1 ) {

                    //modules to be loaded through an AMD loader transform
                    var parts : string[] = id.split( '!', 2 );

                    var plugin_id : string = parts[0];

                    var plugin : any;

                    if( plugin_id === 'include' ) {
                        plugin = {
                            load: ( id, require, _onLoad, config ) => {
                                var script = this.include( id );

                                if( script !== null && script !== void 0 ) {
                                    _onLoad( script );

                                } else {
                                    _onLoad( new Script( id, this._script ) );
                                }
                            }
                        }

                    } else {
                        plugin = this._require( parts[0] );
                    }

                    assert( plugin !== void 0 && plugin !== null, 'Invalid AMD plugin' );

                    id = parts[1];

                    if( plugin.normalize ) {
                        id = plugin.normalize( id, normalize );

                    } else if( id.charAt( 0 ) === '.' ) {
                        id = normalize( id );
                    }

                    if( !this._loadCache.has( id ) ) {
                        assert.strictEqual( typeof plugin.load, 'function', '.load function on AMD plugin not found' );

                        var onLoad : any = ( value : any ) => {
                            this._loadCache.set( id, value );

                            if( typeof cb === 'function' ) {
                                cb( value );
                            }
                        };

                        onLoad.fromText = ( text : string ) => {
                            //Exploit Scriptor as much as possible
                            onLoad( Scriptor.compile( text ).exports() );
                        };

                        onLoad.error = onError.bind( null, id, 'scripterror' );

                        //For the sync build, set this to undefined just to make it known the result is out-of-order
                        this._loadCache.set( id, void 0 );

                        //Since onload is a closure, it 'this' is implicitly bound with TypeScript
                        plugin.load( id, this.require, onLoad, {} );
                    }

                    result = this._loadCache.get( id );

                } else if( id.charAt( 0 ) === '.' ) {
                    //relative modules
                    id = normalize( id );

                    //If possible, take advantage of a manager
                    var script = this.include( id );

                    if( script === null || script === void 0 ) {
                        //If no manager is available, use a normal require
                        result = this._require( id );

                    } else {
                        script.maxRecursion = this.maxRecursion;

                        result = script.exports();
                    }

                } else {

                    if( id === 'require' ) {
                        result = this.require;

                    } else if( id === 'exports' ) {
                        result = this._script.exports;

                    } else if( id === 'module' ) {
                        result = this._script;

                    } else if( id === 'imports' ) {
                        result = Object.freeze( this.imports );

                    } else if( this._loadCache.has( id ) ) {
                        result = this._loadCache.get( id );

                    } else if( this._defineCache.has( id ) ) {
                        result = this._runFactory.apply( this, this._defineCache.get( id ) );

                        this._loadCache.set( id, result );

                    } else {
                        //In a closure so the try-catch block doesn't prevent optimization of the rest of the function
                        result = (() => {
                            try {
                                //Since _script.require isn't overwritten, we can access it directly for normal stuff
                                return this._script.require( id );

                            } catch( err ) {
                                onError( id, 'nodefine', err );
                            }
                        })();
                    }
                }
            }

            //Do NOT call the callback if an error occurred. The errcb will be called independently.
            if( typeof cb === 'function' && !had_error ) {
                if( Array.isArray( result ) ) {
                    cb.apply( null, result );

                } else {
                    cb.call( null, result );
                }

            } else {
                //If there was an error, this will be undefined, so it's the same as not returning anything
                return result;
            }
        }

        //implementation
        protected _define( /*...*/ ) : any {
            var define_args : any[] = Common.parseDefine.apply( null, arguments );

            var id : string = define_args[0];

            if( id !== void 0 ) {
                assert.notStrictEqual( id.charAt( 0 ), '.', 'module identifiers cannot be relative paths' );

                this._defineCache.set( id, define_args );

            } else {
                var result = this._runFactory.apply( this, define_args );

                //Allows for main factory to not return anything.
                //for use with require(['exports']) and so forth, nothing is returned
                if( result !== null && result !== void 0 ) {
                    this._script.exports = result;
                }

                return result;
            }
        }

        public unload() : boolean {
            var res : boolean = super.unload();

            //unload also clears defines and requires
            this._defineCache.clear();
            this._loadCache.clear();

            return res;
        }
    }

    export class Script extends AMDScript implements IScriptBase {

        protected _watcher : fs.FSWatcher;

        get watched() : boolean {
            return this._watcher !== void 0;
        }

        constructor( filename? : string, parent? : Module.IModule ) {
            if( parent === void 0 ) {
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
        protected do_load() {
            this.unload();

            this.do_setup();

            var ext = path.extname( this.filename ) || '.js';

            if( extensions.hasOwnProperty( ext ) ) {
                this._script.paths = Module.Module._nodeModulePaths( path.dirname( this.filename ) );

                extensions[ext]( this._script, this.filename );

                this._script.loaded = true;

            } else {
                this._script.load( this._script.filename );
            }

            this.emit( 'loaded', this.loaded );
        }

        public exports() : any {
            if( !this.loaded ) {
                this._callWrapper( this.do_load );
            }

            return this._script.exports;
        }

        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        public call( ...args : any[] ) : any {
            return this.apply( args );
        }

        public apply( args : any[] ) : any {
            //This will ensure it is loaded (safely) and return the exports
            var main : any = this.exports();

            if( typeof main === 'function' ) {
                return this._callWrapper( main, null, args );

            } else {
                return main;
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

                            this.emit( 'change', event, filename );

                        } else if( event === 'rename' && filename !== this.filename ) {
                            var old_filename = this._script.filename;

                            //A simple rename doesn't change file content, so just change the filename
                            //and leave the script loaded
                            this._script.filename = filename;

                            this.emit( 'rename', old_filename, filename );
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

        public source() : string {
            var src : string;

            if( this._source instanceof ReferenceBase ) {
                src = this._source.value();

                assert.strictEqual( typeof src, 'string', 'Reference source must return string as value' );

            } else {
                src = this._source;
            }

            return Common.stripBOM( src );
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

                this._script._compile( this.source(), this.filename );

                this._script.loaded = true;

                this.emit( 'loaded', this.loaded );
            }
        }

        protected do_load() {
            this.unload();

            this.do_setup();

            this.do_compile();
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

            //When a script is renamed, it should be reassigned in the manager
            //Otherwise, when it's accessed at the new location, the manager just creates a new script
            this.on( 'rename', ( event, oldname, newname ) => {
                console.log( oldname, newname );
                manager.scripts.set( newname, manager.scripts.get( oldname ) );
                manager.scripts.delete( oldname );
            } );
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
        ( left : IReference, right : IReference ) : any;
    }

    export var identity : ITransformFunction = ( left : IReference, right : IReference ) => {
        return left.value();
    };

    export interface IReference extends NodeJS.EventEmitter {
        value() : any;
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

        public value() : any {
            //Evaluation should only be performed here.
            //The inclusion of the _ran variable is because this script is always open to reference elsewhere,
            //so _ran keeps track of if it has been ran for this particular set or arguments and value regardless
            //of where else it has been evaluated
            if( !this._ran ) {
                this._value = this._script.apply( this._args );

                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }

                this._ran = true;
            }

            return this._value;
        }

        get ran() : boolean {
            return this._ran;
        }

        get closed() : boolean {
            return this._script === void 0;
        }

        static resolve( value : any ) : IReference {
            return new ResolvedReference( value );
        }

        static join( left : IReference, right : IReference, transform? : ITransformFunction ) : IReference {
            return new JoinedTransformReference( left, right, transform );
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
                delete this._args;
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

        public value() : any {
            if( !this._ran ) {
                this._value = this._transform( this._ref, null );

                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }

                this._ran = true;
            }

            return this._value;
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

        public value() : any {
            //If anything needs to be re-run, re-run it
            if( !this._ran ) {
                this._value = this._transform( this._left, this._right );

                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }

                this._ran = true;
            }

            return this._value;
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
        constructor( value : any ) {
            super();

            if( typeof value === 'object' ) {
                this._value = Object.freeze( value );

            } else {
                this._value = value;
            }

            this._ran = true;
        }

        get closed() : boolean {
            return !this._ran;
        }

        get ran() : boolean {
            return this._ran;
        }

        public value() : any {
            return this._value;
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

        get scripts() : Map<string, ScriptAdapter> {
            return this._scripts;
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
                script = new ScriptAdapter( this, null, this._parent );

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

        public call( filename : string, ...args : any[] ) : any {
            return this.apply( filename, args );
        }

        public apply( filename : string, args : any[] ) : any {
            return this.add( filename ).apply( args );
        }

        public reference( filename : string, ...args : any[] ) : Reference {
            return this.reference_apply( filename, args );
        }

        public reference_apply( filename : string, args : any[] ) : Reference {
            return this.add( filename ).reference( args );
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
