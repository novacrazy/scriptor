/**
 * Created by novacrazy on 2/6/2015.
 */

define( 'meaning of life', ['./async_plugin.js!'], function(result) {
    return result.value;
} );

define( ['meaning of life'], function(value) {
    return function() {
        return value;
    };
} );
