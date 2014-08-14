/**
 * Created by novacrazy on 8/11/14.
 */

import assert = require('assert');

module Utility {

    export function cloneObject( src : any ) : any;

    export function cloneObject<T>( src : T ) : T {
        assert.equal( typeof src, 'object' );

        var result : T = <any>{};

        for ( var it in src ) {
            if ( src.hasOwnProperty( it ) ) {
                result[it] = src[it];
            }
        }

        return result;
    }

    export function extend( src : any, ext : any ) : any {
        assert.equal( typeof src, 'object' );
        assert.equal( typeof ext, 'object' );

        var result : any = cloneObject( src );

        for ( var it in ext ) {
            if ( ext.hasOwnProperty( it ) ) {
                result[it] = ext[it];
            }
        }

        return result;
    }

    export function defaults<T>( src : T, def : T ) : T {
        assert.equal( typeof src, 'object' );
        assert.equal( typeof def, 'object' );

        var result : T = cloneObject<T>( src );

        for ( var it in def ) {
            if ( def.hasOwnProperty( it ) && !src.hasOwnProperty( it ) ) {
                result[it] = def[it];
            }
        }

        return result;
    }

    export interface HashTable<T> {
        [key: string] : T;
    }
}

export = Utility;
