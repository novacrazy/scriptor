/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import events = require('events');

module Scriptor {

    export interface HashTable<T> {
        [key: string] : T;
    }

    export interface IScriptFunction {
        () : any;
    }

    export interface ICompilerFunction {
        ( script : string, exports : HashTable<any> ) : IScriptFunction;
    }

    export interface IScriptManagerOptions {
        useGlobal? : boolean;
    }

    export class ScriptManager extends events.EventEmitter {

        private scripts : HashTable<IScriptFunction>;
        private compilers : HashTable<ICompilerFunction>;

        public useGlobal : boolean = true;

        public addCompiler( extension : string, compiler : ICompilerFunction ) {
            this.compilers[extension] = compiler;
        }

        constructor( options? : IScriptManagerOptions ) {
            super();

            if ( options != null ) {

                if ( options.useGlobal != null ) {
                    this.useGlobal = options.useGlobal;
                }
            }
        }

    }



}

export = Scriptor;
