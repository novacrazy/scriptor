/**
 * Created by Aaron on 7/7/2015.
 */

var value = 1;

define( function() {
    if( value++ === 1 ) {
        throw new Error( 'fail' );
    }

    return {
        test: 42
    };
} );
