/**
 * Created by novacrazy on 12/15/2014.
 */

import fs = require('fs');
import assert = require('assert');
import path = require('path');

import Module = require('./Module');
import AMD = require('./define');

/*
 *   Rules for scripts:
 *
 *   Lazy evaluation on all scripts, watched or not.
 *
 *   If being watched, a change or rename will not recompile the
 *   script if it was not already loaded, preserving laziness.
 *
 *   watch_script and unwatch_script will not not evaluate a script or overwrite an old script.
 *
 *   watch_script will call add_script, but does not evaluate.
 *
 *   run_script is the only function that will evaluate a script and its main function.
 *
 *   If the script is changed, it the script is marked as unloaded, and will be re-evaluated
 *   the next time run_script is called on that script.
 *
 *   If the script is renamed, nothing is changed except internal state for lookups.
 *
 *   reload_script forces re-evaluation of the script, but does not call the main function.
 *
 *   If not already added, reload_script will add the script.
 *
 *   reload_script can set up watchers for a script
 *
 *   remove_script closes watchers and deletes the script from memory
 *
 *   clear removes everything, and closes all watchers
 *
 * */

module Scriptor {

    var debug = require( 'debug' )( 'scriptor' );

    export interface IScriptModuleBase {
        imports : {[key: string] : any};
    }

    export interface IScriptModule extends IScriptModuleBase, Module.IModule {
        define : AMD.IDefine;
        reference : ( filename : string ) => any;
        exports : {[key: string] : any};
    }

    export class ScriptManager implements IScriptModuleBase {

        private scripts : {[key: string] : IScriptModule} = {};
        private watchers : {[key: string] : fs.FSWatcher} = {};

        public parent : Module.IModule;

        private _imports : {[key: string] : any} = {};

        get imports() : {[key: string] : any} {
            return this._imports;
        }

        constructor( grandParent? : Module.IModule ) {
            this.parent = new Module.Module( 'ScriptManager', grandParent );
        }

        private do_make_script( filename : string ) : IScriptModule {
            debug( 'making script' );

            var id : string = path.basename( filename );

            var script : IScriptModule = <any>(new Module.Module( id, this.parent ));

            //set this before loading (even though it'll be overwritten)
            script.filename = filename;

            return script;
        }

        private do_load_script( script : IScriptModule ) : IScriptModule {
            debug( 'loading script' );

            script.loaded = false;

            //Prevent the script from deleting imports, but it is allowed to interact with them
            script.imports = Object.freeze( this.imports );

            //Incorporate AMD for the created module, allow reuse of existing define if reloading
            script.define = script.define || AMD.amdefine( script );

            //Allows a script to call another script
            script.reference = ( ref_filename : string, ...parameters : any[] ) => {
                var real_filename : string = path.resolve( path.dirname( script.filename ), ref_filename );

                return this.run_script_apply( real_filename, parameters );
            };

            script.load( script.filename );

            return script;
        }

        private attach_watchers( script : IScriptModule ) : void {

            assert( script.filename != null );

            //Watchers should only live as long as the rest of the program
            var watcher : fs.FSWatcher = fs.watch( script.filename, {
                persistent: false
            } );

            this.watchers[script.filename] = watcher;

            watcher.on( 'change', ( event : string, filename : string ) => {
                filename = path.resolve( path.dirname( script.filename ) + path.sep + filename );

                if( event === 'change' && script.loaded ) {
                    script.loaded = false;

                    debug( 'script changed' )

                } else if( event === 'rename' && filename != script.filename ) {

                    var old_filename : string = script.filename;

                    this.scripts[filename] = this.scripts[old_filename];
                    this.watchers[filename] = this.watchers[old_filename];

                    delete this.scripts[old_filename];
                    delete this.watchers[old_filename];

                    debug( 'script renamed from %s to %s', script.filename, filename );
                }
            } );
        }

        public has_script( filename : string ) : boolean {
            filename = path.resolve( filename );

            return this.scripts[filename] != null;
        }

        public loaded_script( filename : string ) : boolean {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            return script != null && script.loaded;
        }

        public add_script( filename : string, watch : boolean = true ) : void {
            filename = path.resolve( filename );

            var script : IScriptModule = this.do_make_script( filename );

            if( watch ) {
                this.attach_watchers( script );
            }

            this.scripts[filename] = script;
        }

        /*Separated out so exceptions don't prevent optimizations */
        private do_run_script( script : IScriptModule, parameters : any[] ) : any {
            debug( 'running script' );

            var main : any = script.exports;

            try {
                if( typeof main === 'function' ) {
                    return main.apply( null, parameters );

                } else {
                    return main;
                }

            } catch( e ) {
                //Mark script as unloaded so syntax errors can be fixed in unwatched files before re-running
                if( e instanceof SyntaxError ) {
                    script.loaded = false;
                }

                throw e;
            }
        }

        public run_script( filename : string, ...parameters : any[] ) : any {
            return this.run_script_apply( filename, parameters );
        }

        public run_script_apply( filename : string, parameters : any[] ) : any {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            //Make scropt from scratch if it doesn't exist
            if( script == null ) {
                script = this.do_make_script( filename );
            }

            //lazily load/compile script if not done already
            if( !script.loaded ) {
                this.do_load_script( script );
            }

            return this.do_run_script( script, parameters );
        }

        //Basically add_script that forces reloading and watching
        public reload_script( filename : string ) {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            if( script == null ) {
                this.add_script( filename, false );

                script = this.scripts[filename];
            }

            this.do_load_script( script );
        }

        public watch_script( filename : string ) {
            filename = path.resolve( filename );

            if( this.watchers[filename] == null ) {
                var script : IScriptModule = this.scripts[filename];

                if( script != null ) {
                    this.attach_watchers( script );

                } else {
                    this.add_script( filename, true );
                }
            }
        }

        public unwatch_script( filename : string ) {
            filename = path.resolve( filename );

            var watcher : fs.FSWatcher = this.watchers[filename];

            if( watcher != null ) {
                watcher.close();

                delete this.watchers[filename];
            }
        }

        public remove_script( filename : string ) : boolean {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            if( script != null ) {
                var watcher : fs.FSWatcher = this.watchers[filename];

                if( watcher != null ) {
                    watcher.close();
                    delete this.scripts[filename];
                }

                return delete this.watchers[filename];
            }

            return false;
        }

        public clear() {
            for( var it in this.watchers ) {
                if( this.watchers.hasOwnProperty( it ) ) {
                    this.watchers[it].close();
                }
            }

            this.watchers = {};
            this.scripts = {};
        }
    }
}

export = Scriptor;
