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
        reference_once( filename : string, ...args : any[] ) : Referee;
        include( filename : string ) : Script;
    }

    export interface IScriptModule extends IScriptBase, Module.IModule {
        define : AMD.IDefine;
    }

    export class Script extends events.EventEmitter implements IScriptBase {

        private _script : IScriptModule;
        private _watcher : fs.FSWatcher = null;

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

        //Basically an alias for the real script's require
        public require( path : string ) : any {
            return this._script.require( path );
        }

        constructor( filename? : string, parent : Module.IModule = this_module ) {
            super();

            this._script = <any>(new Module.Module( null, parent ));

            if( filename != null ) {
                this.load( filename );
            }
        }

        private do_load() {
            this._script.loaded = false;

            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );

            this._script.define = AMD.amdefine( this._script );

            this._script.reference = this.reference.bind( this );
            this._script.reference_once = this.reference_once.bind( this );
            this._script.include = this.include.bind( this );

            var loaded = this._script.load( this._script.filename );

            this.emit( 'loaded', loaded );
        }

        //simply abuses TypeScript's variable arguments feature
        public call( ...args : any[] ) : any {
            return this.apply( args );
        }

        public apply( args : any[] ) : any {
            if( !this.loaded ) {
                this.do_load();
            }

            var main : any = this.exports;

            try {
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
            }
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference( filename : string ) : any {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public include( filename : string ) : Script {
            return null;
        }

        //Returns null unless using the Manager, which creates a special derived class that overrides this
        public reference_once( filename : string ) : Referee {
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
                    filename = path.resolve( path.dirname( this.filename ) + path.sep + filename );

                    if( event === 'change' && this.loaded ) {
                        this.unload();

                    } else if( event === 'rename' && filename != this.filename ) {
                        this._script.filename = filename;
                    }

                    this.emit( 'change', event, filename );
                } );

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

        public unwatch() : boolean {
            if( this.watched ) {
                this._watcher.close();
                this._watcher = null;

                return true;
            }

            return false;
        }
    }

    export class ScriptAdapter extends Script {
        constructor( public manager : Manager, filename : string, parent : Module.IModule ) {
            super( filename, parent );
        }

        public reference( filename : string, ...args : any[] ) : any {
            return this.include( filename ).apply( args );
        }

        public include( filename : string ) : ScriptAdapter {
            var real_filename : string = path.resolve( path.dirname( this.filename ), filename );

            var script : ScriptAdapter = this.manager.add( real_filename, true );

            if( !script.loaded ) {
                script.reload();
            }

            return script;
        }

        public reference_once( filename : string, ...args : any[] ) : Referee {
            return new Referee( this.include( filename ), args );
        }
    }

    export class Referee {
        private _value : any = null;

        constructor( public script : ScriptAdapter, private _args : any[] ) {
            script.on( 'change', ( event : string, filename : string ) => {
                this._value = this.script.apply( this._args );
            } );
        }

        get value() : any {
            if( !this.script.loaded ) {
                this._value = this.script.apply( this._args );
            }

            return this._value;
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

        public run( filename : string, ...args : any[] ) : any {
            return this.apply( filename, args );
        }

        public apply( filename : string, args : any[] ) : any {
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            if( script == null ) {
                return this.add( filename ).apply( args );

            } else {
                return script.apply( args );
            }
        }

        public add( filename : string, watch : boolean = false ) : ScriptAdapter {
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            if( script == null ) {
                script = new ScriptAdapter( this, filename, this._parent );

                this._scripts[filename] = script;
            }

            if( watch ) {
                script.watch();
            }

            return script;
        }

        public remove( filename : string ) : boolean {
            filename = path.resolve( filename );

            var script : ScriptAdapter = this._scripts[filename];

            if( script != null ) {
                script.close();

                return delete this._scripts[filename];
            }

            return false;
        }

        public get( filename : string ) : ScriptAdapter {
            filename = path.resolve( filename );

            return this._scripts[filename];
        }

        public clear() {
            for( var _i in this._scripts ) {
                if( this._scripts.hasOwnProperty( _i ) ) {
                    this._scripts[_i].close();
                    delete this._scripts[_i];
                }
            }

            this._scripts = {};
        }
    }
}

export = Scriptor;
