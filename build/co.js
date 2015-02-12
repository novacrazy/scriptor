/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Aaron Trent
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
"use strict";
/**
 * Created by novacrazy on 2/12/2015.
 */
var Promise = require( 'bluebird' );
var AsyncHelpers = require( './async_helpers' );
/*
 * Most of this is simply copied from tj/co for use in Scriptor with bluebird promises
 * and adapted to also execute normal functions or whatever fine
 * */
var slice = Array.prototype.slice;
var ScriptorCo;
(function(ScriptorCo) {
    function wrap(fn) {
        return function() {
            return co.call( this, fn.apply( this, arguments ) );
        };
    }

    ScriptorCo.wrap = wrap;
    function co(gen, args) {
        var _this = this;
        if( typeof gen === 'function' ) {
            var res = gen.apply( this, args );
            if( isGeneratorFunction( gen ) || isGenerator( res ) ) {
                gen = res;
            }
            else {
                return AsyncHelpers.tryPromise( res );
            }
        }
        else {
            return AsyncHelpers.tryPromise( gen );
        }
        return new Promise( function(resolve, reject) {
            var next, onFulfilled, onRejected;
            onFulfilled = function(res) {
                var ret;
                try {
                    ret = gen.next( res );
                }
                catch( e ) {
                    return reject( e );
                }
                next( ret );
            };
            onRejected = function(err) {
                var ret;
                try {
                    ret = gen.throw( err );
                }
                catch( e ) {
                    return reject( e );
                }
                next( ret );
            };
            next = function(ret) {
                if( ret.done ) {
                    return resolve( ret.value );
                }
                var value = toPromise.call( _this, ret.value );
                if( value && AsyncHelpers.isThenable( value ) ) {
                    return value.then( onFulfilled, onRejected );
                }
                return onRejected( new TypeError( 'You may only yield a function, promise, generator, array, or object, '
                                                  + 'but the following object was passed: "' + String( ret.value )
                                                  + '"' ) );
            };
            onFulfilled();
        } );
    }

    ScriptorCo.co = co;
    function toPromise(obj) {
        if( !obj || AsyncHelpers.isThenable( obj ) ) {
            return AsyncHelpers.tryPromise( obj );
        }
        else if( isGeneratorFunction( obj ) || isGenerator( obj ) ) {
            return co.call( this, obj );
        }
        else if( 'function' === typeof obj ) {
            return thunkToPromise.call( this, obj );
        }
        else if( Array.isArray( obj ) ) {
            return arrayToPromise.call( this, obj );
        }
        else if( isObject( obj ) ) {
            return objectToPromise.call( this, obj );
        }
        else {
            return AsyncHelpers.tryPromise( obj );
        }
    }

    function thunkToPromise(fn) {
        var _this = this;
        return new Promise( function(resolve, reject) {
            fn.call( _this, function(err, res) {
                if( err ) {
                    return reject( err );
                }
                else if( arguments.length > 2 ) {
                    res = slice.call( arguments, 1 );
                }
                resolve( res );
            } );
        } );
    }

    function arrayToPromise(obj) {
        return Promise.all( obj.map( toPromise, this ) );
    }

    function objectToPromise(obj) {
        var results = new obj.constructor();
        var keys = Object.keys( obj );
        var promises = [];
        for( var i = 0; i < keys.length; i++ ) {
            var key = keys[i];
            var promise = toPromise.call( this, obj[key] );
            if( promise && AsyncHelpers.isThenable( promise ) ) {
                defer( promise, key );
            }
            else {
                results[key] = obj[key];
            }
        }
        return Promise.all( promises ).then( function() {
            return results;
        } );
        function defer(promise, key) {
            // predefine the key in the result
            results[key] = void 0;
            promises.push( promise.then( function(res) {
                results[key] = res;
            } ) );
        }
    }

    function isGenerator(obj) {
        return 'function' === typeof obj.next && 'function' === typeof obj.throw;
    }

    function isGeneratorFunction(obj) {
        var constructor = obj.constructor;
        var proto = constructor.prototype;
        var name = constructor.displayName || constructor.name;
        var nameLooksRight = 'GeneratorFunction' === name;
        var methodsLooksRight = 'function' === typeof proto.next && 'function' === typeof proto.throw;
        return nameLooksRight || methodsLooksRight;
    }

    function isObject(val) {
        return Object === val.constructor;
    }
})( ScriptorCo || (ScriptorCo = {}) );
module.exports = ScriptorCo;
