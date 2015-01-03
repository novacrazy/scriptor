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

    export interface IScriptBase extends Module.IModulePublic {
        imports : {[key : string] : any};
        reference( filename : string, ...args : any[] ) : any;
        reference_apply( filename : string, args : any[] ) : any;
        reference_once( filename : string, ...args : any[] ) : Referee;
        include( filename : string ) : Script;
    }

    export interface IScriptModule extends IScriptBase, Module.IModule {
        define : AMD.IDefine;
    }

    export class Script extends events.EventEmitter implements IScriptBase {

        private _script : IScriptModule;
        private _watcher : fs.FSWatcher = null;
        private _recurse : number = 0;
        private _maxRecursion : number = 1;

        public imports : {[key : string] : any} = {};

        get exports() : {[key : string] : any} {
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
            return this._watcher != null;
        }

        //Only allow getting the filename, setting should be done through .load
        get filename() : string {
            return this._script.filename;
        }

        set maxRecursion( value : number ) {
            this._maxRecursion = value | 0;
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

            if( filename != null ) {
                this.load( filename );
            }
        }

        private do_load() {
            this._script.loaded = false;

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

            this._script.load( this._script.filename );

            this.emit( 'loaded', this.loaded );
        }

        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        public call( ...args : any[] ) : any {
            return this.apply( args );
        }

        //This is kept small because the try-catch block prevents any optimization
        public apply( args : any[] ) : any {
            try {
                //Just in case, always use recursion protection
                if( this._recurse++ > this._maxRecursion ) {
                    throw new RangeError( "Script recursion limit reached" );
                }

                if( !this.loaded ) {
                    this.do_load();
                }

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

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference( filename : string ) : any {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_apply( filename : string, args : any[] ) : any {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_once( filename : string ) : Referee {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public include( filename : string ) : Script {
            return null;
        }

        public load( filename : string, watch : boolean = false ) : Script {
            filename = path.resolve( filename );

            this.id = path.basename( filename );

            this._script.filename = filename;

            if( watch ) {
                this.watch();
            }

            //Although this seems counter-intuitive,
            //the lazy loading dictates it must be in an unloaded state before a new script is compiled/run
            //This is a just-in-case thing in-case the module was already loaded when .load was called
            this.unload();

            return this;
        }

        public unload() : boolean {
            var was_loaded : boolean = this.loaded;

            this._script.loaded = false;

            return was_loaded;
        }

        public reload() : boolean {
            var was_loaded : boolean = this.loaded;

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
                    filename = path.resolve( path.dirname( this.filename ), filename );

                    if( event === 'change' && this.loaded ) {
                        this.unload();

                    } else if( event === 'rename' && filename != this.filename ) {
                        //filename will be null if the file was deleted
                        if( filename != null ) {
                            //A simple rename doesn't change file content, so just change the filename
                            //and leave the script loaded
                            this._script.filename = filename;

                        } else {
                            //if the file was deleted, there is nothing we can do so just mark it unloaded.
                            //The next call to do_load will give an error akin to require's errors
                            this.unload();
                            this.unwatch();

                            this._script.filename = null;
                        }
                    }

                    this.emit( 'change', event, filename );
                } );

                return true;
            }

            return false;
        }

        public unwatch() : boolean {
            if( this.watched ) {
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();
                this._watcher = null;

                return true;
            }

            return false;
        }

        public close( permanent : boolean = true ) {
            this.unload();
            this.unwatch();

            if( permanent ) {

                //Remove _script from parent
                if( this.parent != null ) {
                    var children : Module.IModule[] = this.parent.children;

                    for( var _i in children ) {
                        //Find which child is this._script, delete it and remove the (now undefined) reference
                        if( children.hasOwnProperty( _i ) && children[_i] === this._script ) {
                            delete children[_i];
                            children.splice( _i, 1 );
                        }
                    }
                }

                //Remove _script from current object
                delete this['_script'];
                this._script = null;
            }
        }
    }

    export class ScriptAdapter extends Script {
        //If the script is referred to by reference_once, this is set, allowing it to keep track of this script
        public referee : Referee = null;

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
            return this.include( filename ).apply( args );
        }

        //Basically, whatever arguments you give this the first time it's called is all you get
        public reference_once( filename : string, ...args : any[] ) : Referee {
            var real_filename : string = path.resolve( path.dirname( this.filename ), filename );

            //I didn't want to use this.include because it forces evaluation.
            //With the Referee class, evaluation is only when .value is accessed
            var script : ScriptAdapter = this.manager.add( real_filename );

            //Use the existing one in the script or create a new one (which will attach itself)
            if( script.referee != null ) {
                return script.referee;

            } else {
                return new Referee( script, args );
            }
        }

        public include( filename : string ) : ScriptAdapter {
            //make sure filename can be relative to the current script
            var real_filename : string = path.resolve( path.dirname( this.filename ), filename );

            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script : ScriptAdapter = this.manager.add( real_filename );

            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( !script.loaded ) {
                script.reload();
            }

            return script;
        }
    }

    export interface ITransform {
        ( prev : IReferee, ref : IReferee ) : any;
    }

    export var default_transform : ITransform = ( prev : IReferee, ref : IReferee ) => {
        return ref.value();
    };

    export interface IReferee extends NodeJS.EventEmitter {
        value() : any;
        ran : boolean;
        join( ref : IReferee, transform? : ITransform ) : JoinedReferee;
    }

    export class RefereeBase extends events.EventEmitter {
        protected _value : any = null;
        protected _ran : boolean = false;
    }

    export class Referee extends RefereeBase implements IReferee {
        constructor( private _script : ScriptAdapter, private _args : any[] ) {
            super();

            //Just mark this referee as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this referee would still not be run
            this._script.on( 'change', ( event : string, filename : string ) => {
                if( this._ran ) {
                    this._ran = false;

                    this.emit( 'change', event, filename );
                }
            } );

            this._script.referee = this;
        }

        public value() : any {
            //Evaluation should only be performed here.
            //The inclusion of the _ran variable is because this script is always open to reference elsewhere,
            //so _ran keeps track of if it has been ran for this particular set or arguments and value regardless
            //of where else it has been evaluated
            if( !this._ran || !this._script.loaded ) {
                this._value = this._script.apply( this._args );

                this._ran = true;
            }

            return this._value;
        }

        get ran() : boolean {
            return this._ran;
        }

        //Just to make it so Referee.script = include('something else') is impossible
        get script() : ScriptAdapter {
            return this._script;
        }

        public join( ref : IReferee, transform? : ITransform ) : JoinedReferee {
            return new JoinedReferee( ref, this, transform );
        }
    }

    export class JoinedReferee extends RefereeBase implements IReferee {
        constructor( private _prev : IReferee, private _ref : IReferee,
                     private _transform : ITransform = default_transform ) {
            super();

            //Just to prevent stupid mistakes
            assert.notEqual( _prev, _ref, "Cannot join to self" );

            //This has to be a closure because the two emitters down below
            //tend to call this with themselves as this
            var onChange = ( event : string, filename : string ) => {
                this.emit( 'change', event, filename );

                this._ran = false;
            };

            _prev.on( 'change', onChange );
            _ref.on( 'change', onChange );
        }

        public value() : any {
            //If anything needs to be re-run, re-run it
            if( !(this._ran && this._prev.ran && this._ref.ran) ) {
                this._value = this._transform( this._prev, this._ref );

                this._ran = true;
            }

            return this._value;
        }

        get ran() : boolean {
            return this._ran;
        }

        public join( ref : IReferee, transform? : ITransform ) : JoinedReferee {
            return new JoinedReferee( ref, this, transform );
        }

        //This two aren't in the docs, but might be useful at some point.
        get prev() : IReferee {
            return this._prev;
        }

        get ref() : IReferee {
            return this._ref;
        }
    }

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

            if( script == null ) {
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

            if( script != null ) {

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
            if( script == null ) {
                return this.add( filename ).apply( args );

            } else {
                return script.apply( args );
            }
        }

        public once( filename : string, ...args : any[] ) : Referee {
            return this.once_apply( filename, args );
        }

        public once_apply( filename : string, args : any[] ) : Referee {
            var script : ScriptAdapter = this.add( filename );

            if( script.referee != null ) {
                return script.referee;

            } else {
                return new Referee( script, args );
            }
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
}

export = Scriptor;
