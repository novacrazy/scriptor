/**
 * Created by novacrazy on 4/15/2015.
 */

import Module = require('./Module');

module ScriptorTypes {
    export interface ISimpleMap<T> {
        [key : string] : T;
    }

    export interface ScriptorExtension<T> {
        ( module : Module.IModule, filename : string ) : T;
    }

    export interface IScriptBase<T, Script> extends Module.IModulePublic {
        imports : {[key : string] : any};
        reference( ...args : any[] ) : IReference<T>;
        reference_apply( args : any[] ) : IReference<T>;
        include( filename : string, load? : boolean ) : Script;
    }

    export interface IDefineFunction<T, TArray> {
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => any ) : void;
        ( id : string, deps : string[], factory : {[key : string] : any} ) : void;
        ( deps : string[], factory : ( ...deps : any[] ) => any ) : void;
        ( deps : string[], factory : {[key : string] : any} ) : void;
        ( factory : ( ...deps : any[] ) => any ) : void;
        ( factory : {[key : string] : any} ) : void;

        amd: {
            jQuery: boolean; //false
        };

        require : IRequireFunction<T, TArray>;
    }

    export interface IRequireFunction<T, TArray> {
        ( path : string ) : T;
        ( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) : T
        ( id : string[], cb? : ( ...deps : any[] ) => any, ecb? : ( err : any ) => any ) : TArray;
        ( id : string, cb? : ( deps : any ) => any, ecb? : ( err : any ) => any ) : T;

        toUrl( path : string ) : string;
        specified( id : string ) : boolean;
        defined( id : string ) : boolean;
        undef( id : string ) : void;
        onError( err : any ) : void;
        resolve( id : string ) : string;

        define : IDefineFunction<T, TArray>;
    }

    export interface IAMDScriptBase<T, TArray> {
        require : IRequireFunction<T, TArray>;
        define : IDefineFunction<T, TArray>;
    }

    export interface IReference<T> extends NodeJS.EventEmitter {
        value() : T;
        ran : boolean;
        closed : boolean;
        join( ref : IReference<T>, transform? : ITransformFunction<T> ) : IReference<T>;
        transform( transform? : ITransformFunction<T> )
        left() : IReference<T>;
        right() : IReference<T>;
        close( recursive? );
    }

    export interface ITransformFunction<T> {
        ( left : IReference<T>, right : IReference<T> ) : T;
    }

    export interface IScriptorPluginOnLoad<T> {
        ( value : any ) : void;
        fromText( text : string | IReference<T> ) : void;
        onError( err : any ) : void;
    }

    export interface IScriptorPlugin<T, TArray> {
        load( id : string,
              require : IRequireFunction<T, TArray>,
              _onLoad : IScriptorPluginOnLoad<T>,
              config? : any ) : void;

        normalize?( id : string, defaultNormalize : ( id : string ) => string ) : string;
    }
}

export = ScriptorTypes;
