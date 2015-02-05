/**
 * Created by novacrazy on 2/3/2015.
 */

var crypto = require( 'crypto' );

exports.md5 = function(message) {
    return crypto.createHash( 'md5' ).update( message, 'utf-8' ).digest( 'hex' );
};
