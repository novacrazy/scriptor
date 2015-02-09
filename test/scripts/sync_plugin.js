/**
 * Created by novacrazy on 2/6/2015.
 */

module.exports = {
    load: function(id, require, onLoad, config) {
        //onLoad({value: 42});
        onLoad.fromText( "module.exports = {value: 42}" );
    }
};
