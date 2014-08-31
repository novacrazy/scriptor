/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import events = require('events');
import vm = require('vm');
import fs = require('fs');
import path = require('path');

import Injector = require('./injector');
import Utility = require('./utility');
import Module = require('./module');

/*
 * Overview of how this is supposed to work:
 *
 * Type T is extended from IBaseScriptContext
 *   T is what the function is exposed to when compiled and run
 *
 *
 * */

module Scriptor {

    export class ScriptManager<T> extends events.EventEmitter {

        private scripts : Utility.HashTable<Function>;
        private watchers : Utility.HashTable<fs.FSWatcher>;

        public imports : Utility.HashTable<any>;

        private _addInjector( exportedScript : Function ) : Injector.IInjectorFunction<T> {
            return Injector.Create<T>( exportedScript );
        }

        private _doLoadScript( filename : string, cb : ( script : string ) => void ) {

        }

        public runScript( filename : string, parameters : T ) {
            filename = path.resolve( filename );

            var script = this.scripts[filename];

            if ( script != null ) {

                if ( typeof script === 'function' ) {
                    return script.call( null, parameters );

                } else {
                    return script;
                }

            } else {

            }
        }

    }

}

export = Scriptor;
