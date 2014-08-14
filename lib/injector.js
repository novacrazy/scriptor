/**
 * Created by novacrazy on 6/17/14.
 */
var Injector;
(function(Injector) {
    var strip = /function\s*\w*\((.*?)\)\s*\{\s*((.|[\n\r\u2028\u2029])*?)\s*\}/i;

    function Create(func, hint, defaultValue) {
        "use strict";

        var undefined;

        if( typeof func === 'function' ) {
            var m = strip.exec( func.toString() );

            var native;

            if( m != null && (!(native = m[2].trim() == '[native code]') || Array.isArray( hint )) ) {
                var function_arguments = (native ? hint : m[1].replace( /\s+/g, '' ).split( ',' ));

                var result = (function(values) {
                    if( typeof values === 'object' ) {
                        var toApply = [];

                        for( var i = 0, ii = function_arguments.length; i < ii; i++ ) {
                            var toInsert = values[function_arguments[i]];

                            if( toInsert === undefined ) {
                                toInsert = defaultValue;
                            }

                            toApply.push( toInsert );
                        }

                        return func.apply( this, toApply );
                    } else {
                        throw new TypeError( 'Injector function takes an object' );
                    }
                });

                result.orderOf = function(order) {
                    if( Array.isArray( order ) ) {
                        var args = Array.prototype.slice.call( arguments, 1 );

                        var toApply = [];

                        for( var i = 0, ii = function_arguments.length; i < ii; i++ ) {
                            var index = order.indexOf( function_arguments[i] );

                            if( index != -1 && args.length > index ) {
                                toApply.push( args[index] );
                            } else {
                                toApply.push( defaultValue );
                            }
                        }

                        return func.apply( this, toApply );
                    } else {
                        throw new TypeError( "order must be an array of strings" );
                    }
                };

                result.original = func;

                return result;
            } else {
                throw new Error( 'Cannot automatically inject values into built-in functions unless hinted' );
            }
        } else {
            throw new TypeError( 'Inject can only work on functions' );
        }
    }

    Injector.Create = Create;
})( Injector || (Injector = {}) );

module.exports = Injector;