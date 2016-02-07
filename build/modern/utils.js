/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aaron Trent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ****/
'use strict';

exports.__esModule           = true;
exports.isAbsolutePath       = isAbsolutePath;
exports.isAbsoluteOrRelative = isAbsoluteOrRelative;
exports.bind                 = bind;
exports.stripBOM             = stripBOM;
exports.injectAMD            = injectAMD;
exports.injectAMDAndStripBOM = injectAMDAndStripBOM;
exports.parseDefine          = parseDefine;
exports.isThenable           = isThenable;
exports.tryPromise           = tryPromise;
exports.tryReject            = tryReject;
exports.isGenerator          = isGenerator;
exports.isGeneratorFunction  = isGeneratorFunction;
exports.parseDeps            = parseDeps;
exports.normalizeConfig      = normalizeConfig;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _ = _interopRequireWildcard( _lodash );

var _path = require( 'path' );

var _defaults = require( './defaults.js' );

function _interopRequireWildcard( obj ) {
    if( obj && obj.__esModule ) {
        return obj;
    } else {
        var newObj = {};
        if( obj != null ) {
            for( var key in obj ) {
                if( Object.prototype.hasOwnProperty.call( obj, key ) ) {
                    newObj[key] = obj[key];
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/4/2015.
 */

var AMD_Header_Buffer = new Buffer( _defaults.AMD_Header );

function isAbsolutePath( filepath ) {
    if( typeof _path.isAbsolute === 'function' ) {
        return (0, _path.isAbsolute)( filepath );
    } else {
        return normalize( filepath ) === (0, _path.resolve)( filepath );
    }
}

function isAbsoluteOrRelative( filepath ) {
    return filepath.charAt( 0 ) === '.' || isAbsolutePath( filepath );
}

function bind( func ) {
    for( var _len = arguments.length, args = Array( _len > 1 ? _len - 1 : 0 ), _key = 1; _key < _len; _key++ ) {
        args[_key - 1] = arguments[_key];
    }

    var bound = func.bind.apply( func, args );

    //This assumes sub-functions can handle their own scopes
    //or are closures that take that into account
    for( var it in func ) {
        if( func.hasOwnProperty( it ) ) {
            bound[it] = func[it];
        }
    }

    return bound;
}

function stripBOM( content ) {
    // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
    // because the buffer-to-string conversion in `fs.readFileSync()`
    // translates it to FEFF, the UTF-16 BOM.
    if( Buffer.isBuffer( content ) && content.length >= 2 && content[0] === 0xFE && content[1] === 0xFF ) {
        content = content.slice( 2 );
    } else if( typeof content === 'string' && content.charCodeAt( 0 ) === 0xFEFF ) {
        content = content.slice( 1 );
    }

    return content;
}

function injectAMD( content ) {
    if( Buffer.isBuffer( content ) ) {
        return Buffer.concat( [AMD_Header_Buffer, content] );
    } else if( typeof content === 'string' ) {
        return _defaults.AMD_Header + content;
    } else {
        return content;
    }
}

function injectAMDAndStripBOM( content ) {
    return injectAMD( stripBOM( content ) );
}

function parseDefine( id, deps, factory ) {
    //This argument parsing code is taken from amdefine
    if( Array.isArray( id ) ) {
        factory = deps;
        deps    = id;
        id      = void 0;
    } else if( typeof id !== 'string' ) {
        factory = id;
        id      = deps = void 0;
    }

    if( deps !== void 0 && !Array.isArray( deps ) ) {
        factory = deps;
        deps    = void 0;
    }

    if( deps === void 0 ) {
        deps = _defaults.default_dependencies;
    } else {
        deps = deps.concat( _defaults.default_dependencies );
    }

    return [id, deps, factory];
}

function isThenable( obj ) {
    return obj !== void 0 && obj !== null && (obj instanceof _bluebird2.default || typeof obj.then === 'function');
}

function tryPromise( value ) {
    if( isThenable( value ) ) {
        return value;
    } else {
        return _bluebird2.default.resolve( value );
    }
}

function tryReject( func, context ) {
    try {
        for( var _len2 = arguments.length, args = Array( _len2 > 2 ? _len2 - 2 : 0 ), _key2 = 2; _key2 < _len2;
             _key2++ ) {
            args[_key2 - 2] = arguments[_key2];
        }

        return tryPromise( func.apply( context, args ) );
    } catch( err ) {
        return _bluebird2.default.reject( err );
    }
}

//Taken from tj/co
function isGenerator( obj ) {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}
//Taken from tj/co
function isGeneratorFunction( obj ) {
    if( !obj.constructor ) {
        return false;
    } else if( 'GeneratorFunction' === obj.constructor.name || 'GeneratorFunction' === obj.constructor.displayName ) {
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

function parseDeps( deps, paths ) {
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

function normalizeConfig( config ) {
    var isObject = _.isObject( config ) && !Array.isArray( config );

    var defaultConfig = {
        baseUrl: '.' + _path.posix.sep, //String
        paths:   {}, //Object
        deps:    [], //Array
        shim:    {} //Object
    };

    if( isObject ) {
        config = _.defaults( config, defaultConfig );
    } else {
        return defaultConfig;
    }

    //Normalize baseUrl
    if( typeof config.baseUrl === 'string' ) {
        config.baseUrl = _path.posix.normalize( toPosix( config.baseUrl ) );
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
