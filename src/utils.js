/**
 * Created by Aaron on 7/4/2015.
 */

import Promise from 'bluebird';

import * as _ from 'lodash';

import {isAbsolute, resolve, posix as path} from 'path';

import {AMD_Header, default_dependencies} from './defaults.js';

let AMD_Header_Buffer = new Buffer( AMD_Header );

export function isAbsolutePath( filepath ) {
    if( typeof isAbsolute === 'function' ) {
        return isAbsolute( filepath );

    } else {
        return normalize( filepath ) === resolve( filepath );
    }
}

export function isAbsoluteOrRelative( filepath ) {
    return filepath.charAt( 0 ) === '.' || isAbsolutePath( filepath );
}

export function bind( func, ...args ) {
    let bound = func.bind( ...args );

    //This assumes sub-functions can handle their own scopes
    //or are closures that take that into account
    for( let it in func ) {
        if( func.hasOwnProperty( it ) ) {
            bound[it] = func[it];
        }
    }

    return bound;
}

export function stripBOM( content ) {
    // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
    // because the buffer-to-string conversion in `fs.readFileSync()`
    // translates it to FEFF, the UTF-16 BOM.
    if( Buffer.isBuffer( content ) && content.length >= 2 && (content[0] === 0xFE && content[1] === 0xFF) ) {
        content = content.slice( 2 );

    } else if( typeof content === 'string' && content.charCodeAt( 0 ) === 0xFEFF ) {
        content = content.slice( 1 );
    }

    return content;
}

export function injectAMD( content ) {
    if( Buffer.isBuffer( content ) ) {
        return Buffer.concat( [AMD_Header_Buffer, content] );

    } else if( typeof content === 'string' ) {
        return AMD_Header + content;

    } else {
        return content;
    }
}

export function injectAMDAndStripBOM( content ) {
    return injectAMD( stripBOM( content ) );
}

export function parseDefine( id, deps, factory ) {
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

export function isThenable( obj ) {
    return obj !== void 0 && obj !== null && (obj instanceof Promise || typeof obj.then === 'function');
}

export function tryPromise( value ) {
    if( isThenable( value ) ) {
        return value;

    } else {
        return Promise.resolve( value );
    }
}

export function tryReject( func, context, ...args ) {
    try {
        return tryPromise( func.apply( context, args ) );

    } catch( err ) {
        return Promise.reject( err );
    }
}

//Taken from tj/co
export function isGenerator( obj ) {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}
//Taken from tj/co
export function isGeneratorFunction( obj ) {
    if( !obj.constructor ) {
        return false;

    } else if( 'GeneratorFunction' === obj.constructor.name ||
               'GeneratorFunction' === obj.constructor.displayName ) {
        return true;

    } else {
        return isGenerator( obj.constructor.prototype );
    }
}

function isNull( value ) {
    return value === null || value === void 0;
}

function toPosix( filepath ) {
    return filepath.replace( '\\', '/' );
}

export function parseDeps( deps, paths ) {
    if( _.isObject( deps ) && !Array.isArray( deps ) ) {
        return _.map( deps, function( v, k ) {

            //If deps have a specified path, use that instead, but only if it hasn't already been defined
            if( !paths[k] ) {
                paths[k] = v;
            }

            return k;
        } );

    } else if( !Array.isArray( deps ) ) {
        return [/*No valid dependencies*/];

    } else {
        return deps;
    }
}

export function normalizeConfig( config ) {
    var isObject = _.isObject( config ) && !Array.isArray( config );

    var defaultConfig = {
        baseUrl: '.' + path.sep, //String
        paths:   {},   //Object
        deps:    [],   //Array
        shim:    {}    //Object
    };

    if( isObject ) {
        config = _.defaults( config, defaultConfig );

    } else {
        return defaultConfig;
    }

    //Normalize baseUrl
    if( typeof config.baseUrl === 'string' ) {
        config.baseUrl = path.normalize( toPosix( config.baseUrl ) );

    } else {
        config.baseUrl = defaultConfig.baseUrl;
    }

    //Make sure paths is an object
    if( !_.isObject( config.paths ) || Array.isArray( config.paths ) ) {
        config.paths = defaultConfig.paths;
    }

    //Make sure shim is an object
    if( !_.isObject( config.shim ) || Array.isArray( config.shim ) ) {
        config.shim = defaultConfig.shim;
    }

    //Normalize deps
    config.deps = parseDeps( config.deps, config.paths );

    //Normalize shims
    config.shim = _.chain( config.shim ).mapValues( function( shim ) {
        if( Array.isArray( shim ) ) {
            return {
                deps: parseDeps( shim, config.paths )
            };

        } else if( _.isObject( shim ) && typeof shim.exports === 'string' ) {
            return {
                deps:    parseDeps( shim.deps, config.paths ),
                exports: shim.exports
            };
        }

    } ).omit( isNull ).value();

    //Normalize paths
    config.paths = _.chain( config.paths ).mapValues( function( p ) {
        if( typeof p === 'string' ) {
            return toPosix( p );
        }

    } ).omit( isNull ).value();

    return config;
}
