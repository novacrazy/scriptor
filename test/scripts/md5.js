/**
 * Created by novacrazy on 2/5/2015.
 */

module.define( ['crypto'], function(crypto) {
    return function(message) {
        if( message === void 0 ) {
            message = 'Hello, World!';
        }

        return crypto.createHash( 'md5' ).update( message, 'utf-8' ).digest( 'hex' );
    }
} );
