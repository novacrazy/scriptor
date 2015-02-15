/**
 * Created by novacrazy on 12/25/2014.
 */
declare module ScriptorModule {
    interface IModuleStaticInternal {
        _contextLoad: boolean;
        _cache: {
            [key: string]: any;
        };
        _pathCache: {
            [key: string]: string;
        };
        _extensions: {
            [key: string]: any;
        };
        globalPaths: string[];
        wrap: ( script : string ) => string;
        wrapper: string[];
        _debug: ( message? : any ) => void;
        _realpathCache: {
            [key: string]: string;
        };
        _findPath: ( request : string, paths : string[] ) => string;
        _nodeModulePaths: ( from : string ) => string[];
        _resolveLookupPaths: ( request : string, parent : IModule ) => any[];
        _load: ( request : string, parent : IModule, isMain? : boolean ) => any;
        _resolveFilename: ( request : string, parent : IModule ) => string;
        requireRepl: () => any;
        runMain: () => void;
        _initPaths: () => void;
    }
    interface IModuleStatic extends IModuleStaticInternal {
        new ( id? : string, parent? : IModule ): IModule;
    }
    interface IModuleInternal {
        load( filename : string ): void;
        paths: string[];
        _compile( content : string, filename : string ): any;
        loaded: boolean;
    }
    interface IModulePublic {
        filename?: string;
        id: string;
        exports: any;
        require( path : string ): any;
        parent?: IModule;
        children: IModule[];
    }
    interface IModule extends IModuleInternal, IModulePublic {
    }
    var Module : IModuleStatic;
}

declare module ScriptorMapAdapter {
    class ObjectMap<V> implements Map<string, V> {
        private _map;
        size : number;

        clear() : void;
        delete( key : string ) : boolean;
        entries() : any[][];
        forEach( cb : ( element : V, key : string, map : ObjectMap<V> ) => any, thisArg : any ) : void;
        get( key : string ) : V;
        has( key : string ) : boolean;
        set( key : string, value : V ) : ObjectMap<V>;
        keys() : string[];
        values() : V[];
    }
    function createMap<V>() : Map<string, V>;
}

declare module ScriptorCommon {
    function bind( func : Function, ...args : any[] ) : any;
    function parseDefine( id : any, deps : any, factory : any ) : any[];
    function normalizeError( id : any, type : string, err? : any ) : any;
    function removeFromParent( script : ScriptorModule.IModule ) : void;
    function stripBOM( content : string ) : string;
    var AMD_Header : string;

    function injectAMD( content : string ) : string;
    function shallowCloneObject( obj : any ) : any;
    var default_max_recursion : number;
    var default_dependencies : string[];
}

declare module "scriptor/sync" {
    import fs = require('fs');
    import events = require('events');

    var this_module : ScriptorModule.IModule;
    var default_dependencies : string[];
    var default_max_recursion : number;
    var extensions : {
        [ext: string]: ( module : ScriptorModule.IModule, filename : string ) => void;
    };

    function enableCustomExtensions( enable? : boolean ) : void;
    function disableCustomExtensions() : void;
    /**** BEGIN SECTION SCRIPT ****/
    interface IScriptBase extends ScriptorModule.IModulePublic {
        imports: {
            [key: string]: any;
        };
        reference( ...args : any[] ): Reference;
        reference_apply( args : any[] ): Reference;
        include( filename : string, load? : boolean ): Script;
    }
    interface IDefineFunction {
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => any ): void;
        ( id : string, deps : string[], factory : {
            [key: string]: any;
        } ): void;
        ( deps : string[], factory : ( ...deps : any[] ) => any ): void;
        ( deps : string[], factory : {
            [key: string]: any;
        } ): void;
        ( factory : ( ...deps : any[] ) => any ): void;
        ( factory : {
            [key: string]: any;
        } ): void;
    }
    interface IAMDScriptBase {
        require( path : string ): any;
        define: IDefineFunction;
    }
    interface IScriptModule extends IScriptBase, ScriptorModule.IModule, IAMDScriptBase, events.EventEmitter {
    }
    class ScriptBase extends events.EventEmitter {
        imports : {
            [key: string]: any;
        };

        constructor( parent : ScriptorModule.IModule );
        id : string;
        children : ScriptorModule.IModule[];
        parent : ScriptorModule.IModule;
        loaded : boolean;
        filename : string;
        baseUrl : string;
        maxRecursion : number;

        unload() : boolean;
        reload() : boolean;
        unwatch() : boolean;
        close( permanent? : boolean ) : boolean;
        include( filename : string ) : Script;
    }
    class AMDScript extends ScriptBase implements IAMDScriptBase {
        require : ( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) => any;
        define : IDefineFunction;

        constructor( parent : ScriptorModule.IModule );
        pending : boolean;

        unload() : boolean;
    }
    class Script extends AMDScript implements IScriptBase {
        watched : boolean;

        constructor( filename? : string, parent? : ScriptorModule.IModule );
        exports() : any;
        call( ...args : any[] ) : any;
        apply( args : any[] ) : any;
        reference( ...args : any[] ) : Reference;
        reference_apply( args : any[] ) : Reference;
        load( filename : string, watch? : boolean ) : Script;
        watch( persistent? : boolean ) : boolean;
        unwatch() : boolean;
    }
    class SourceScript extends Script {
        filename : string;
        baseUrl : string;
        watched : boolean;

        source() : string;
        constructor( src? : any, parent? : ScriptorModule.IModule );
        load( src : any, watch? : boolean ) : SourceScript;
        watch() : boolean;
        unwatch() : boolean;
    }
    class ScriptAdapter extends Script {
        manager : Manager;

        constructor( manager : Manager, filename : string, parent : ScriptorModule.IModule );
        include( filename : string, load? : boolean ) : ScriptAdapter;
    }
    function load( filename : string, watch? : boolean ) : Script;
    function compile( src : any, watch? : boolean ) : SourceScript;
    /**** END SECTION SCRIPT ****/
    /**** BEGIN SECTION REFERENCE ****/
    interface ITransformFunction {
        ( left : IReference, right : IReference ): any;
    }
    var identity : ITransformFunction;
    interface IReference extends NodeJS.EventEmitter {
        value(): any;
        ran: boolean;
        closed: boolean;
        join( ref : IReference, transform? : ITransformFunction ): IReference;
        transform( transform? : ITransformFunction ): any;
        left(): IReference;
        right(): IReference;
        close( recursive? : any ): any;
    }
    class ReferenceBase extends events.EventEmitter {
    }
    class Reference extends ReferenceBase implements IReference {
        constructor( _script : Script, _args : any[] );
        value() : any;
        ran : boolean;
        closed : boolean;

        static resolve( value : any ) : IReference;
        static join( left : IReference, right : IReference, transform? : ITransformFunction ) : IReference;
        static join_all( refs : IReference[], transform? : ITransformFunction ) : IReference;
        static transform( ref : IReference, transform? : ITransformFunction ) : TransformReference;
        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close() : void;
    }
    class TransformReference extends ReferenceBase implements IReference {
        constructor( _ref : IReference, _transform : ITransformFunction );
        value() : any;
        ran : boolean;
        closed : boolean;

        join( ref : IReference, transform? : ITransformFunction ) : any;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close( recursive? : boolean ) : void;
    }
    class JoinedTransformReference extends ReferenceBase implements IReference {
        constructor( _left : IReference, _right : IReference, _transform? : ITransformFunction );
        value() : any;
        ran : boolean;
        closed : boolean;

        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close( recursive? : boolean ) : void;
    }
    class ResolvedReference extends ReferenceBase implements IReference {
        constructor( value : any );
        closed : boolean;
        ran : boolean;

        value() : any;
        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close() : void;
    }
    /**** BEGIN SECTION MANAGER ****/
    class Manager {
        cwd : string;

        chdir( value : string ) : string;
        parent : ScriptorModule.IModule;
        scripts : Map<string, ScriptAdapter>;

        constructor( grandParent? : ScriptorModule.IModule );
        add( filename : string, watch? : boolean ) : ScriptAdapter;
        remove( filename : string, close? : boolean ) : boolean;
        call( filename : string, ...args : any[] ) : any;
        apply( filename : string, args : any[] ) : any;
        reference( filename : string, ...args : any[] ) : Reference;
        reference_apply( filename : string, args : any[] ) : Reference;
        get( filename : string ) : ScriptAdapter;
        clear( close? : boolean ) : void;
    }
}

declare module "scriptor/async" {
    import fs = require('fs');
    import events = require('events');
    import Promise = require('bluebird');

    var this_module : ScriptorModule.IModule;
    var default_dependencies : string[];
    var default_max_recursion : number;
    var extensions : {
        [ext: string]: ( module : ScriptorModule.IModule, filename : string ) => Promise<any>;
    };

    function enableCustomExtensions( enable? : boolean ) : void;
    function disableCustomExtension() : void;
    /**** BEGIN SECTION SCRIPT ****/
    interface IScriptBase extends ScriptorModule.IModulePublic {
        imports: {
            [key: string]: any;
        };
        reference( ...args : any[] ): Reference;
        reference_apply( args : any[] ): Reference;
        include( filename : string, load? : boolean ): Script;
    }
    interface IDefineFunction {
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => any ): void;
        ( id : string, deps : string[], factory : {
            [key: string]: any;
        } ): void;
        ( deps : string[], factory : ( ...deps : any[] ) => any ): void;
        ( deps : string[], factory : {
            [key: string]: any;
        } ): void;
        ( factory : ( ...deps : any[] ) => any ): void;
        ( factory : {
            [key: string]: any;
        } ): void;
    }
    interface IAMDScriptBase {
        require( path : string ): any;
        define: IDefineFunction;
    }
    interface IScriptModule extends IScriptBase, ScriptorModule.IModule, IAMDScriptBase, events.EventEmitter {
    }
    class ScriptBase extends events.EventEmitter {
        imports : {
            [key: string]: any;
        };

        constructor( parent : ScriptorModule.IModule );
        id : string;
        children : ScriptorModule.IModule[];
        parent : ScriptorModule.IModule;
        loaded : boolean;
        filename : string;
        baseUrl : string;
        maxRecursion : number;

        unload() : boolean;
        reload() : boolean;
        unwatch() : boolean;
        close( permanent? : boolean ) : boolean;
        include( filename : string ) : Script;
    }
    class AMDScript extends ScriptBase implements IAMDScriptBase {
        require : ( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) => Promise<any>;
        define : IDefineFunction;

        constructor( parent : ScriptorModule.IModule );
        pending : boolean;

        unload() : boolean;
    }
    class Script extends AMDScript implements IScriptBase {
        watched : boolean;

        constructor( filename? : string, parent? : ScriptorModule.IModule );
        exports() : Promise<any>;
        call( ...args : any[] ) : Promise<any>;
        apply( args : any[] ) : Promise<any>;
        reference( ...args : any[] ) : Reference;
        reference_apply( args : any[] ) : Reference;
        load( filename : string, watch? : boolean ) : Script;
        watch( persistent? : boolean ) : boolean;
        unwatch() : boolean;
    }
    class SourceScript extends Script {
        filename : string;
        baseUrl : string;
        watched : boolean;

        source() : Promise<string>;
        constructor( src? : any, parent? : ScriptorModule.IModule );
        load( src : any, watch? : boolean ) : SourceScript;
        watch() : boolean;
        unwatch() : boolean;
    }
    class ScriptAdapter extends Script {
        manager : Manager;

        constructor( manager : Manager, filename : string, parent : ScriptorModule.IModule );
        include( filename : string, load? : boolean ) : ScriptAdapter;
    }
    function load( filename : string, watch? : boolean ) : Script;
    function compile( src : any, watch? : boolean ) : SourceScript;
    /**** END SECTION SCRIPT ****/
    /**** BEGIN SECTION REFERENCE ****/
    interface ITransformFunction {
        ( left : IReference, right : IReference ): Promise<any>;
    }
    var identity : ITransformFunction;
    interface IReference extends NodeJS.EventEmitter {
        value(): Promise<any>;
        ran: boolean;
        closed: boolean;
        join( ref : IReference, transform? : ITransformFunction ): IReference;
        transform( transform? : ITransformFunction ): any;
        left(): IReference;
        right(): IReference;
        close( recursive? : any ): any;
    }
    class ReferenceBase extends events.EventEmitter {
    }
    class Reference extends ReferenceBase implements IReference {
        constructor( _script : Script, _args : any[] );
        value() : Promise<any>;
        ran : boolean;
        closed : boolean;

        static join( left : IReference, right : IReference, transform? : ITransformFunction ) : IReference;
        static resolve( value : any ) : IReference;
        static join_all( refs : IReference[], transform? : ITransformFunction ) : IReference;
        static transform( ref : IReference, transform? : ITransformFunction ) : TransformReference;
        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close() : void;
    }
    class TransformReference extends ReferenceBase implements IReference {
        constructor( _ref : IReference, _transform : ITransformFunction );
        value() : Promise<any>;
        ran : boolean;
        closed : boolean;

        join( ref : IReference, transform? : ITransformFunction ) : any;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close( recursive? : boolean ) : void;
    }
    class JoinedTransformReference extends ReferenceBase implements IReference {
        constructor( _left : IReference, _right : IReference, _transform? : ITransformFunction );
        value() : Promise<any>;
        ran : boolean;
        closed : boolean;

        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close( recursive? : boolean ) : void;
    }
    class ResolvedReference extends ReferenceBase implements IReference {
        constructor( value : any );
        closed : boolean;
        ran : boolean;

        value() : Promise<any>;
        join( ref : IReference, transform? : ITransformFunction ) : IReference;
        transform( transform? : ITransformFunction ) : any;
        left() : IReference;
        right() : IReference;
        close() : void;
    }
    /**** BEGIN SECTION MANAGER ****/
    class Manager {
        cwd : string;

        chdir( value : string ) : string;
        parent : ScriptorModule.IModule;
        scripts : Map<string, ScriptAdapter>;

        constructor( grandParent? : ScriptorModule.IModule );
        add( filename : string, watch? : boolean ) : ScriptAdapter;
        remove( filename : string, close? : boolean ) : boolean;
        call( filename : string, ...args : any[] ) : Promise<any>;
        apply( filename : string, args : any[] ) : Promise<any>;
        reference( filename : string, ...args : any[] ) : Reference;
        reference_apply( filename : string, args : any[] ) : Reference;
        get( filename : string ) : ScriptAdapter;
        clear( close? : boolean ) : void;
    }
}
