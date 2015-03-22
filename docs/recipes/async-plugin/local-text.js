/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['promisify!fs'], function(fs) {
    return {
        load: function(name, require, onLoad, config) {
            fs.readFileAsync( name, 'utf-8' ).then( onLoad );
        }
    };
} );
