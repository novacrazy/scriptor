/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import events = require('events');
import vm = require('vm');
import fs = require('fs');
import path = require('path');

import Injector = require('./injector');
import Module = require('./Module');
import AMD = require('./define');

module Scriptor {

    export interface HashTable<T> {
        [key: string] : T;
    }

    export interface IScriptModule extends Module.IModule {
        imports : any;
        define : AMD.IDefine;
    }
    
    export class ScriptManager<T> extends events.EventEmitter {

        private scripts : HashTable<IScriptModule> = {};
        private watchers : HashTable<fs.FSWatcher> = {};

        public parent : Module.IModule;

        public imports : HashTable<any>;

        constructor( superParent? : Module.IModule ) {
            super();

            this.parent = new Module.Module( 'ScriptManager', superParent );
        }

        private addScript( filename : string ) : IScriptModule {

            //Some type erasure here to force cast Module.IModule into IScriptModule
            var script : IScriptModule = <any>(new Module.Module( path.basename( filename ), this.parent ));

            this.loadScript( script, filename );

            this.scripts[filename] = script;

            /*
             * The process should not be kept open just because it's watching a file
             * */
            var watcher = fs.watch( filename, {
                persistent: false
            } );

            this.watchers[filename] = watcher;

            //This is agnostic to the filename changes
            watcher.addListener( 'change', ( event : string, filename : string ) => {
                this.loadScript( script, filename );
            } );

            var old_filename = filename;

            watcher.addListener( 'rename', ( event : string, new_filename : string ) => {
                this.loadScript( script, new_filename );
                
                this.scripts[new_filename] = this.scripts[old_filename];
                delete this.scripts[old_filename];

                this.watchers[new_filename] = this.watchers[old_filename];
                delete this.watchers[old_filename];

                old_filename = new_filename;
            } );

            return script;
        }

        private loadScript( script : IScriptModule, filename? : string ) : IScriptModule {
            script.loaded = false;

            script.imports = this.imports;
            script.define = AMD.amdefine( script );

            script.load( filename != null ? filename : script.filename );

            return script;
        }

        public runScript( filename : string, parameters : T ) {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            if ( script == null ) {
                script = this.addScript( filename );
            }

            if ( typeof script.exports === 'function' ) {
                return script.exports.call( null, parameters );

            } else {
                throw new Error( 'No main function found in script ' + filename );
            }
        }

        public preloadScript( filename : string ) {
            filename = path.resolve( filename );

            var script : IScriptModule = this.scripts[filename];

            if ( script == null ) {
                this.addScript( filename );
            }
        }

        public reloadScript( filename : string ) {
            var watcher = this.watchers[filename];

            if ( watcher != null ) {
                watcher.emit( 'change', 'change', filename );

            } else {
                this.addScript( filename );
            }
        }

        public clear() {
            for ( var it in this.watchers ) {
                if ( this.watchers.hasOwnProperty( it ) ) {
                    this.watchers[it].close();
                }
            }

            this.watchers = {};
            this.scripts = {};
        }
    }
}

export = Scriptor;
