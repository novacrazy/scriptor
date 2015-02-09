/**
 * Created by novacrazy on 2/5/2015.
 */

define( 'meaning of life', ['./sync_plugin.js!'], function(result) {
    return result.value;
} );

define( ['meaning of life'], function(value) {
    return function() {
        return value;
    }
} );
