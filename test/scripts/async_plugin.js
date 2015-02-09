/**
 * Created by novacrazy on 2/6/2015.
 */

module.exports = {
    load: function(id, require, onLoad, config) {
        setImmediate( function() {
            onLoad.fromText( "module.exports = {value: 42}" );
        } );
    }
};
