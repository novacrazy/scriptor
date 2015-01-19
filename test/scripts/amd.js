/**
 * Created by novacrazy on 12/18/2014.
 */

module.define( 'md5', ['crypto'], function(crypto) {
    return function(message) {
        return crypto.createHash( 'md5' ).update( message, 'utf8' ).digest( 'hex' );
    }
} );

module.define( 'will-fail', function(require) {
    require( 'doesnotexist', function(dne) {
    }, function(err) {
        console.log( err );
    } );
} );

module.define( ['./plugin_test.js!assert', 'crypto', './readme scripts/a.json', 'will-fail'],
    function(assert, crypto, a, wf, require) {

        assert( assert.loaded );

        require( 'md5', function(md5) {
            console.log( 'after', md5( 'tests' ) );
        } );

        console.log( 'before', module.define.require.toUrl( './test' ) );

        return function(message) {
            if( typeof message !== 'string' ) {
                message = 'Hello, ' + a.Hello;
            }

            return crypto.createHash( 'md5' ).update( message, 'utf8' ).digest( 'hex' );
        };

    } );
