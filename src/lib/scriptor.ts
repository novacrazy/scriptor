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

    export class ScriptManager<T> extends events.EventEmitter {

        private scripts : HashTable<Module.IModule>;
        private watchers : HashTable<fs.FSWatcher>;

        public imports : HashTable<any>;

        private addScript( filename : string ) : any {

            var script : Module.IModule = new Module.Module( path.basename( filename ) );

            script['imports'] = this.imports;
            script['define'] = AMD.amdefine( script );

            script.load( filename );

            this.scripts[filename] = script;

            var watcher = fs.watch( filename, {
                persistent: false
            } );

            this.watchers[filename] = watcher;

            //This is agnostic to the filename changes
            watcher.addListener( 'change', ( event : string, filename : string ) => {
                script.loaded = false;
                script.load( filename );
            } );

            var old_filename = filename;

            watcher.addListener( 'rename', ( event : string, new_filename : string ) => {
                script.loaded = false;
                script.load( new_filename );

                this.scripts[new_filename] = this.scripts[old_filename];
                delete this.scripts[old_filename];

                this.watchers[new_filename] = this.watchers[old_filename];
                delete this.watchers[old_filename];

                old_filename = new_filename;
            } );

            return script;
        }

        public runScript( filename : string, parameters : T ) {
            filename = path.resolve( filename );

            var script = this.scripts[filename];

            if ( script == null ) {
                script = this.addScript( filename );
            }

            if ( typeof script.exports === 'function' ) {
                return script.exports.call( null, parameters );

            } else {
                throw new Error( 'No main function found in script ' + filename );
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
