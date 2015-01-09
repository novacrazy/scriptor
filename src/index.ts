/**
 * Created by novacrazy on 12/25/2014.
 */

import fs = require('fs');
import assert = require('assert');
import path = require('path');
import events = require('events');

import Module = require('./Module');
import AMD = require('./define');

module Scriptor {
    export var this_module : Module.IModule = <any>module;

    /**** BEGIN SECTION SCRIPT ****/

    export interface IScriptBase extends Module.IModulePublic {
        imports : {[key : string] : any};
        reference( filename : string, ...args : any[] ) : any;
        reference_apply( filename : string, args : any[] ) : any;
        reference_once( filename : string, ...args : any[] ) : Reference;
        include( filename : string, load? : boolean ) : Script;
    }

    export interface IScriptModule extends IScriptBase, Module.IModule {
        define : AMD.IDefine;
        change();
    }

    export class Script extends events.EventEmitter implements IScriptBase {

        protected _script : IScriptModule;
        protected _watcher : fs.FSWatcher;
        protected _recurse : number = 0;
        protected _maxRecursion : number = 1;

        public _referee : Reference;

        public imports : {[key : string] : any} = {};

        get exports() : any {
            return this._script.exports;
        }

        get id() : string {
            return this._script.id;
        }

        //Allow id to be set because it isn't very important
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

        get watched() : boolean {
            return this._watcher !== void 0;
        }

        //Only allow getting the filename, setting should be done through .load
        get filename() : string {
            return this._script.filename;
        }

        set maxRecursion( value : number ) {
            //JSHint doesn't like bitwise operators
            this._maxRecursion = Math.floor( value );

            assert( !isNaN( this._maxRecursion ), 'maxRecursion must be set to a number' );
        }

        get maxRecursion() : number {
            return this._maxRecursion;
        }

        //Basically an alias for the real script's require
        public require( path : string ) : any {
            return this._script.require( path );
        }

        constructor( filename? : string, parent : Module.IModule = this_module ) {
            super();

            //Create a new Module without an id. It will be set later
            this._script = <any>(new Module.Module( null, parent ));

            if( filename !== void 0 && filename !== null ) {
                this.load( filename );
            }
        }

        protected do_setup() {
            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );

            //This creates a new define function every time the script is loaded
            //attempting to reuse an old one complained about duplicate internal state and so forth
            this._script.define = AMD.amdefine( this._script );

            //bind all these to this because calling them inside the script might do something weird.
            //probably not, but still
            this._script.reference = this.reference.bind( this );
            this._script.reference_apply = this.reference_apply.bind( this );
            this._script.reference_once = this.reference_once.bind( this );
            this._script.include = this.include.bind( this );
            this._script.change = () => {
                //triggers reset of References
                this.emit( 'change', 'change', this.filename );
            }
        }

        protected do_load() {
            this.unload();

            this.do_setup();

            this._script.load( this._script.filename );

            this.emit( 'loaded', this.loaded );
        }

        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        public call( ...args : any[] ) : any {
            return this.apply( args );
        }

        //This is kept small because the try-catch block prevents any optimization
        public apply( args : any[] ) : any {
            //Just in case, always use recursion protection
            if( this._recurse++ > this._maxRecursion ) {
                throw new RangeError( 'Script recursion limit reached' );
            }

            if( !this.loaded ) {
                this.do_load();
            }

            try {
                var main : any = this.exports;

                if( typeof main === 'function' ) {
                    return main.apply( null, args );

                } else {
                    return main;
                }

            } catch( e ) {
                if( e instanceof SyntaxError ) {
                    this.unload();
                }

                throw e;

            } finally {
                //release recurse
                --this._recurse;
            }
        }

        public call_once( ...args : any[] ) : Reference {
            return this.apply_once( args );
        }

        public apply_once( args : any[] ) : Reference {
            if( this._referee !== void 0 ) {
                return this._referee;

            } else {
                this._referee = new Reference( this, args );

                return this._referee;
            }
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference( filename : string ) : any {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_apply( filename : string, args : any[] ) : any {
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

        public unload() : boolean {
            var was_loaded : boolean = this.loaded;

            this._script.loaded = false;

            return was_loaded;
        }

        public reload() : boolean {
            var was_loaded : boolean = this.loaded;

            //If a Reference depends on this script, then it should be updated when it reloads
            //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
            this.emit( 'change', 'change', this.filename );

            //Force it to reload and recompile the script.
            this.do_load();

            return was_loaded;
        }

        public watch() : boolean {
            if( !this.watched ) {
                var watcher : fs.FSWatcher = this._watcher = fs.watch( this.filename, {
                    persistent: false
                } );

                watcher.on( 'change', ( event : string, filename : string ) => {
                    //path.resolve doesn't like nulls, so this has to be done first
                    if( filename === null && event === 'rename' ) {
                        this.close( false );

                    } else {

                        filename = path.resolve( path.dirname( this.filename ), filename );

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
                    this.unload();

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

        get watched() : boolean {
            return this._onChange === void 0;
        }

        get source() : string {
            var src : string;

            if( Reference.isReference( this._source ) ) {
                src = this._source.value();

                assert.strictEqual( typeof src, 'string', 'Reference source must return string as value' );

            } else {
                src = this._source;
            }

            //strip BOM
            if( src.charCodeAt( 0 ) === 0xFEFF ) {
                src = src.slice( 1 );
            }

            return src;
        }

        constructor( src? : any, parent : Module.IModule = this_module ) {
            super();

            if( src !== void 0 && src !== null ) {
                this.load( src );
            }
        }

        protected do_compile() {
            if( !this.loaded ) {
                assert.notStrictEqual( this._source, void 0, 'Source must be set to compile' );

                this._script._compile( this.source, this.filename );

                this._script.loaded = true;
            }
        }

        protected do_load() {
            this.unload();

            this.do_setup();

            this.do_compile();

            this.emit( 'loaded', this.loaded );
        }

        public load( src : any, watch : boolean = true ) : SourceScript {
            this.close( false );

            assert( typeof src === 'string' || Reference.isReference( src ), 'Source must be a string or Reference' );

            this._source = src;

            if( watch ) {
                this.watch();
            }

            this.emit( 'change', 'change', this.filename );

            return this;
        }

        public watch() : boolean {
            if( !this.watched && Reference.isReference( this._source ) ) {

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
            if( this.watched && Reference.isReference( this._source ) ) {
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
        public reference( filename : string, ...args : any[] ) {
            return this.reference_apply( filename, args );
        }

        //This is kind of funny it's so simple
        public reference_apply( filename : string, args : any[] ) : any {
            //include is used instead of this.manager.apply because include takes into account
            //relative includes/references
            return this.include( filename, false ).apply( args );
        }

        //Basically, whatever arguments you give this the first time it's called is all you get
        public reference_once( filename : string, ...args : any[] ) : Reference {
            var real_filename : string = path.resolve( path.dirname( this.filename ), filename );

            return this.manager.add( real_filename ).apply_once( args );
        }

        public include( filename : string, load : boolean = false ) : ScriptAdapter {
            //make sure filename can be relative to the current script
            var real_filename : string = path.resolve( path.dirname( this.filename ), filename );

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

    /**** BEGIN SECTION REFEREE ****/

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
        protected _value : any;
        protected _ran : boolean = false;

        public static isReference( _ref : IReference ) : boolean {
            return _ref instanceof ReferenceBase || _ref instanceof Reference || _ref instanceof TransformReference ||
                   _ref instanceof JoinedTransformReference;
        }
    }

    export class Reference extends ReferenceBase implements IReference {
        constructor( private _script : Script, private _args : any[] ) {
            super();

            //Just mark this referee as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this referee would still not be run
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
                delete this._script._referee;
                delete this._script; //Doesn't really delete it, just removes it from this
            }
        }
    }

    export class TransformReference extends ReferenceBase implements IReference {
        constructor( private _ref : IReference, private _transform : ITransformFunction ) {
            super();

            assert( Reference.isReference( _ref ), 'transform will only work on References' );
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
            assert( Reference.isReference( _left ) &&
                    Reference.isReference( _right ), 'join will only work on References' );
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

    /**** BEGIN SECTION MANAGER ****/

    export class Manager {

        private _scripts : {[key : string] : ScriptAdapter} = {};

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
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            if( script === void 0 ) {
                script = new ScriptAdapter( this, filename, this._parent );

                this._scripts[filename] = script;
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
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            if( script !== void 0 ) {

                if( close ) {
                    script.close();
                }

                return delete this._scripts[filename];
            }

            return false;
        }

        public call( filename : string, ...args : any[] ) : any {
            return this.apply( filename, args );
        }

        public apply( filename : string, args : any[] ) : any {
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            //By default add the script to the manager to make lookup faster in the future
            if( script === void 0 ) {
                return this.add( filename ).apply( args );

            } else {
                return script.apply( args );
            }
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
            filename = path.resolve( filename );

            return this._scripts[filename];
        }

        //Make closing optional for the same reason as .remove
        public clear( close : boolean = true ) {
            for( var _i in this._scripts ) {
                if( this._scripts.hasOwnProperty( _i ) ) {
                    if( close ) {
                        this._scripts[_i].close();
                    }

                    delete this._scripts[_i];
                }
            }

            //Set _scripts to a clean object
            this._scripts = {};
        }
    }

    /**** END SECTION MANAGER ****/
}

export = Scriptor;
