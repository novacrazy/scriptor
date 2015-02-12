/**
 * Created by novacrazy on 2/12/2015.
 */

import Promise = require('bluebird');

import AsyncHelpers = require('./async_helpers');

/*
 * Most of this is simply copied from tj/co for use in Scriptor with bluebird promises
 * and adapted to also execute normal functions or whatever fine
 * */

var slice = Array.prototype.slice;

module ScriptorCo {

    export function wrap( fn : Function ) {
        return function() {
            return co.call( this, fn.apply( this, arguments ) );
        }
    }

    export function co( gen : any, args : any[] ) {
        if( typeof gen === 'function' ) {
            var res = gen.apply( this, args );

            if( isGeneratorFunction( gen ) || isGenerator( res ) ) {
                gen = res;

            } else {
                return AsyncHelpers.tryPromise( res );
            }

        } else {
            return AsyncHelpers.tryPromise( gen );
        }

        return new Promise( ( resolve, reject ) => {

            var next, onFulfilled, onRejected;

            onFulfilled = ( res? : any ) => {
                var ret;
                try {
                    ret = gen.next( res );

                } catch( e ) {
                    return reject( e );
                }
                next( ret );
            };

            onRejected = ( err : Error ) => {
                var ret;
                try {
                    ret = gen.throw( err );

                } catch( e ) {
                    return reject( e );
                }
                next( ret );
            };

            next = ( ret : any ) => {
                if( ret.done ) {
                    return resolve( ret.value );
                }
                var value = toPromise.call( this, ret.value );
                if( value && AsyncHelpers.isThenable( value ) ) {
                    return value.then( onFulfilled, onRejected );
                }
                return onRejected( new TypeError( 'You may only yield a function, promise, generator, array, or object, '
                                                  + 'but the following object was passed: "' + String( ret.value ) +
                                                  '"' ) );
            };

            onFulfilled();
        } );

    }

    function toPromise( obj : any ) : Promise<any> {
        if( !obj || AsyncHelpers.isThenable( obj ) ) {
            return AsyncHelpers.tryPromise( obj );

        } else if( isGeneratorFunction( obj ) || isGenerator( obj ) ) {
            return co.call( this, obj );

        } else if( 'function' === typeof obj ) {
            return thunkToPromise.call( this, obj );

        } else if( Array.isArray( obj ) ) {
            return arrayToPromise.call( this, obj );

        } else if( isObject( obj ) ) {
            return objectToPromise.call( this, obj );

        } else {
            return AsyncHelpers.tryPromise( obj );
        }
    }

    function thunkToPromise( fn : Function ) : Promise<any> {
        return new Promise( ( resolve, reject ) => {
            fn.call( this, function( err, res ) {
                if( err ) {
                    return reject( err );

                } else if( arguments.length > 2 ) {
                    res = slice.call( arguments, 1 );
                }

                resolve( res );
            } );
        } );
    }

    function arrayToPromise( obj : any[] ) : Promise<any> {
        return Promise.all( obj.map( toPromise, this ) );
    }

    function objectToPromise( obj : any ) : Promise<any> {
        var results = new obj.constructor();
        var keys : string[] = Object.keys( obj );
        var promises = [];
        for( var i = 0; i < keys.length; i++ ) {
            var key = keys[i];
            var promise : Promise<any> = toPromise.call( this, obj[key] );
            if( promise && AsyncHelpers.isThenable( promise ) ) {
                defer( promise, key );
            } else {
                results[key] = obj[key];
            }
        }
        return Promise.all( promises ).then( function() {
            return results;
        } );

        function defer( promise, key ) {
            // predefine the key in the result
            results[key] = void 0;
            promises.push( promise.then( function( res ) {
                results[key] = res;
            } ) );
        }
    }

    function isGenerator( obj : any ) {
        return 'function' === typeof obj.next && 'function' === typeof obj.throw;
    }

    function isGeneratorFunction( obj : Function ) {
        var constructor : any = obj.constructor;
        var proto : any = constructor.prototype;
        var name = constructor.displayName || constructor.name;
        var nameLooksRight = 'GeneratorFunction' === name;
        var methodsLooksRight = 'function' === typeof proto.next &&
                                'function' === typeof proto.throw;
        return nameLooksRight || methodsLooksRight;
    }

    function isObject( val : any ) {
        return Object === val.constructor;
    }

}

export = ScriptorCo;
