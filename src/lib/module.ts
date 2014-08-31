/**
 * Created by novacrazy on 8/12/14.
 */

/// <reference path="../reference.ts" />

//Taken from: https://github.com/joyent/node/blob/v0.10.30-release/lib/module.js

import Utility = require('./utility');

module Module {

    export interface IModuleStaticInternal {
        _contextLoad: boolean;
        _cache: Utility.HashTable<any>;
        _pathCache: Utility.HashTable<string>;
        _extensions: Utility.HashTable<any>;

        globalPaths: string[];

        wrap: ( script : string ) => string;
        wrapper: string[];

        _debug: ( message? : any ) => void;

        _realpathCache: Utility.HashTable<string>;

        _findPath: ( request : string, paths : string[] ) => string;
        _nodeModulePaths: ( from : string ) => string[];
        _resolveLookupPaths: ( request : string, parent : IModule ) => any[];
        _load: ( request : string, parent : IModule, isMain : boolean ) => Utility.HashTable<any>;
        _resolveFilename: ( request : string, parent : IModule ) => string;

        requireRepl: () => Utility.HashTable<any>;

        runMain: () => void;

        _initPaths: () => void;

    }


    export interface IModuleStatic extends IModuleStaticInternal {
        new( id? : string, parent? : IModule ) : IModule;
    }

    export interface IModuleInternal {
        load: ( filename : string ) => void;
        require: ( path : string ) => Utility.HashTable<any>;
        paths: string[];
        _compile: ( content : string, filename : string ) => any;
    }

    export interface IModule extends IModuleInternal {
        id : string;
        exports : Utility.HashTable<any>;
        parent : IModule;
        filename? : string;
        loaded : boolean;
        children : IModule[];
    }

    //Also happens to match the backwards compatibility in the 'module' module
    export var Module : IModuleStatic = <any>require( 'module' );

    export interface IScriptModule extends IModule {
        imports: Utility.HashTable<any>;
        module: IScriptModule;
        require: typeof require;
    }

    export var amdefine : Function = require( 'amdefine' );

    export class ScriptModule extends Module implements IScriptModule {

        //DO ASSIGN
        public imports : Utility.HashTable<any>;
        public module : IScriptModule = <ScriptModule>(this);
        public require : typeof require = require;
        public define : ( id? : string, deps? : string[], factory : Function ) => void;

        constructor( id? : string, parent? : IModule ) {
            super( id, parent );

            this.define = amdefine( this, parent );
        }

        //DO NOT ASSIGN, CREATED BY SUPER
        public id : string;
        public exports : Utility.HashTable<any>;
        public parent : IModule;
        public filename : string;
        public loaded : boolean;
        public children : IModule[];

        //DO NOT ASSIGN, INHERITED FROM SUPER
        public load : ( filename : string ) => void;
        public require : ( path : string ) => Utility.HashTable<any>;
        public paths : string[];
        public _compile : ( content : string, filename : string ) => any;
    }
}

export = Module;
