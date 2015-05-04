/**
 * Created by novacrazy on 1/18/2015.
 */

import Module = require('./Module');
import Types = require('./types');
import path = require('path');

import _ = require('lodash');

module ScriptorCommon {

    export type stringOrBuffer = string | Buffer;

    export function isAbsolutePath( filepath : string ) : boolean {
        if( typeof path.isAbsolute === 'function' ) {
            return path.isAbsolute( filepath );

        } else {
            //just a little cheat for older node versions
            return path.normalize( filepath ) === path.resolve( filepath );
        }
    }

    export function isAbsoluteOrRelative( filepath : string ) : boolean {
        return filepath.charAt( 0 ) === '.' || isAbsolutePath( filepath );
    }

    //Helper function to bind a function to an object AND retain any attached values
    //Also bounds a variable number of arguments to the function, which is neat.
    //The 'to' arguments is in ...args
    export function bind( func : Function, ...args : any[] ) {
        var res = Function.prototype.bind.apply( func, args );

        //This assumes sub-functions can handle their own scopes
        //or are closures that take that into account
        for( var i in func ) {
            if( func.hasOwnProperty( i ) ) {
                res[i] = func[i];
            }
        }

        return res;
    }

    export function parseDefine( id : any, deps : any, factory : any ) {
        //This argument parsing code is taken from amdefine
        if( Array.isArray( id ) ) {
            factory = deps;
            deps = id;
            id = void 0;

        } else if( typeof id !== 'string' ) {
            factory = id;
            id = deps = void 0;
        }

        if( deps !== void 0 && !Array.isArray( deps ) ) {
            factory = deps;
            deps = void 0;
        }

        if( deps === void 0 ) {
            deps = default_dependencies;

        } else {
            deps = deps.concat( default_dependencies )
        }

        return [id, deps, factory];
    }

    export function normalizeError( id : any, type : string, err : any = {} ) {
        if( Array.isArray( err.requireModules )
            && !Array.isArray( id )
            && err.requireModules.indexOf( id ) === -1 ) {
            err.requireModules.push( id );

        } else {
            err.requireModules = Array.isArray( id ) ? id : [id];
        }

        err.requireType = err.requireType || type;

        err.message = (err.message || '') + ' - ' + id;

        return err;
    }

    export function removeFromParent( script : Module.IModule ) {
        var parent : Module.IModule = script.parent;

        if( parent !== void 0 && parent !== null ) {
            for( var _i in parent.children ) {
                //Find which child is this._script, delete it and remove the (now undefined) reference
                if( parent.children.hasOwnProperty( _i ) && parent.children[_i] === script ) {
                    delete parent.children[_i];
                    parent.children.splice( _i, 1 );
                    break;
                }
            }
        }
    }

    export function stripBOM( content : stringOrBuffer ) : stringOrBuffer {
        // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
        // because the buffer-to-string conversion in `fs.readFileSync()`
        // translates it to FEFF, the UTF-16 BOM.
        if( Buffer.isBuffer( content ) && content.length >= 2
            && (content[0] === 0xFE && content[1] === 0xFF) ) {
            content = content.slice( 2 );

        } else if( typeof content === 'string' && content.charCodeAt( 0 ) === 0xFEFF ) {
            content = content.slice( 1 );
        }

        return content;
    }

    export var AMD_Header : Buffer = new Buffer( "if(typeof define !== 'function' && typeof module.define === 'function') {var define = module.define;}" );

    export function injectAMD( content : stringOrBuffer, encoding : string = 'utf-8' ) : stringOrBuffer {
        if( Buffer.isBuffer( content ) ) {
            return Buffer.concat( [AMD_Header, <Buffer>content] );

        } else if( typeof content === 'string' ) {
            return AMD_Header.toString( encoding ) + content;

        } else {
            return content;
        }
    }

    export function injectAMDAndStripBOM( content : stringOrBuffer ) : stringOrBuffer {
        return injectAMD( stripBOM( content ) );
    }

    export function shallowCloneObject( obj : any ) {
        var newObj = Object.create( null );

        for( var it in obj ) {
            if( obj.hasOwnProperty( it ) ) {
                newObj[it] = obj[it];
            }
        }

        return newObj;
    }

    export var default_max_recursion : number = 9;

    export var default_debounceMaxWait : number = 50; //50ms

    //These *could* be changed is someone really wanted to, but there isn't a reason for it
    export var default_dependencies : string[] = ['require', 'exports', 'module', 'imports'];

    export type IAMDConfig = Types.IAMDConfig;

    export var default_AMDConfig : IAMDConfig = {
        paths: {}
    };

    export function normalizeAMDConfig( config : IAMDConfig, baseUrl? : string ) : IAMDConfig {
        var isObject = _.isObject( config ) && !Array.isArray( config );

        if( isObject ) {
            config = _.defaults<IAMDConfig, IAMDConfig>( _.cloneDeep( config ), default_AMDConfig );

        } else {
            return _.cloneDeep( default_AMDConfig );
        }


        //Make sure paths is an object
        if( !_.isObject( config.paths ) || Array.isArray( config.paths ) ) {
            config.paths = default_AMDConfig.paths;

        } else {
            //Normalize paths
            for( let it in config.paths ) {
                if( config.paths.hasOwnProperty( it ) ) {
                    let p = config.paths[it];

                    if( typeof p !== 'string' ) {
                        delete config.paths[it];

                    } else if( typeof baseUrl === 'string' && p.charAt( 0 ) === '.' ) {
                        config.paths[it] = path.resolve( baseUrl, p );
                    }
                }
            }
        }

        return config;
    }
}

export = ScriptorCommon;
