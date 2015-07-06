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
/**
 * Created by Aaron on 7/3/2015.
 */

'use strict';

var _getIterator = require( 'babel-runtime/core-js/get-iterator' )['default'];

var _Object$keys = require( 'babel-runtime/core-js/object/keys' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );
exports['default'] = addYieldHandler;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _utilsJs = require( './utils.js' );

//Taken from tj/co
function objectToPromise( obj ) {
    var results = new obj.constructor();
    var promises = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;

    var _iteratorError = void 0;

    try {
        for( var _iterator = _getIterator( _Object$keys( obj ) ), _step;
             !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true ) {
            var key = _step.value;

            var promise = toPromise.call( this, obj[key] );

            if( promise && (0, _utilsJs.isThenable)( promise ) ) {
                defer( promise, key );
            } else {
                results[key] = obj[key];
            }
        }
    } catch( err ) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if( !_iteratorNormalCompletion && _iterator['return'] ) {
                _iterator['return']();
            }
        } finally {
            if( _didIteratorError ) {
                throw _iteratorError;
            }
        }
    }

    return _bluebird2['default'].all( promises ).then( function() {
        return results;
    } );

    function defer( promise, key ) {
        // predefine the key in the result
        results[key] = void 0;

        promises.push( promise.then( function( res ) {
            return results[key] = res;
        } ) );
    }
}

//Taken from tj/co
function resolveGenerator( gen ) {
    var _this = this;

    return new _bluebird2['default']( function( resolve, reject ) {

        //Just in case
        if( typeof gen === 'function' ) {
            gen = gen();
        }

        if( !gen || !(0, _utilsJs.isGenerator)( gen ) ) {
            return _bluebird2['default'].resolve( gen );
        } else {
            (function() {
                var onFulfilled = function onFulfilled( res ) {
                    try {
                        next( gen.next( res ) );
                    } catch( e ) {
                        return reject( e );
                    }
                };

                var onRejected = function onRejected( err ) {
                    try {
                        next( gen['throw']( err ) );
                    } catch( e ) {
                        return reject( e );
                    }
                };

                var next = function next( ret ) {
                    if( ret.done ) {
                        return resolve( ret.value );
                    } else {
                        var value = toPromise.call( _this, ret.value );

                        if( (0, _utilsJs.isThenable)( value ) ) {
                            return value.then( onFulfilled )['catch']( onRejected );
                        } else {
                            return onRejected( new TypeError( 'You may only yield a function, promise, generator, array, or object, '
                                                              + 'but the following object was passed: "'
                                                              + String( ret.value ) + '"' ) );
                        }
                    }
                };

                onFulfilled();
            })();
        }
    } );
}

function toPromise( value ) {
    var _this2 = this;

    if( (0, _utilsJs.isThenable)( value ) ) {
        return value;
    } else if( Array.isArray( value ) ) {
        return _bluebird2['default'].all( value.map( toPromise, this ) );
    } else if( typeof value === 'object' ) {
        if( (0, _utilsJs.isGenerator)( value ) ) {
            return resolveGenerator.call( this, value );
        } else {
            return objectToPromise.call( this, value );
        }
    } else if( typeof value === 'function' ) {
        if( (0, _utilsJs.isGeneratorFunction)( value ) ) {
            return _bluebird2['default'].coroutine( value )();
        } else {
            //Thunks
            return new _bluebird2['default']( function( resolve, reject ) {
                try {
                    value.call( _this2, function( err, res ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( res );
                        }
                    } );
                } catch( err ) {
                    reject( err );
                }
            } );
        }
    } else {
        return _bluebird2['default'].resolve( value );
    }
}

var addedYieldHandler = false;

function addYieldHandler() {
    if( !addedYieldHandler ) {
        _bluebird2['default'].coroutine.addYieldHandler( function( value ) {
            try {
                return toPromise.call( this, value );
            } catch( err ) {
                return _bluebird2['default'].reject( err );
            }
        } );

        addedYieldHandler = true;
    }
}

module.exports = exports['default'];
