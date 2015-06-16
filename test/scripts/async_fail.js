/**
 * Created by novacrazy on 6/16/2015.
 */

var val = 1;

module.define( function() {
    if( val++ === 1 ) {
        throw new Error( 'fail' );
    }

    return {
        test: 42
    };
} );
