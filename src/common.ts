/**
 * Created by novacrazy on 1/18/2015.
 */

import Module = require('./Module');
import path = require('path');

module ScriptorCommon {

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

    export function stripBOM( content : string ) {
        // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
        // because the buffer-to-string conversion in `fs.readFileSync()`
        // translates it to FEFF, the UTF-16 BOM.
        if( content.charCodeAt( 0 ) === 0xFEFF ) {
            content = content.slice( 1 );
        }
        return content;
    }

    export var AMD_Header = "if(typeof define !== 'function' " +
                            "&& typeof module.define === 'function') {" +
                            "\n\tvar define = module.define;" +
                            "\n}\n";

    export function injectAMD( content : string ) : string {
        return AMD_Header + content;
    }

    export function injectAMDAndStripBOM( content : string ) : string {
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

    //These *could* be changed is someone really wanted to, but there isn't a reason for it
    export var default_dependencies : string[] = ['require', 'exports', 'module', 'imports'];
}

export = ScriptorCommon;
