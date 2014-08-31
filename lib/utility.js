/**
 * Created by novacrazy on 8/11/14.
 */
var assert = require( 'assert' );

var Utility;
(function(Utility) {
    function cloneObject(src) {
        assert.equal( typeof src, 'object' );

        var result = {};

        for( var it in src ) {
            if( src.hasOwnProperty( it ) ) {
                result[it] = src[it];
            }
        }

        return result;
    }

    Utility.cloneObject = cloneObject;

    function extend(src, ext) {
        assert.equal( typeof src, 'object' );
        assert.equal( typeof ext, 'object' );

        var result = cloneObject( src );

        for( var it in ext ) {
            if( ext.hasOwnProperty( it ) ) {
                result[it] = ext[it];
            }
        }

        return result;
    }

    Utility.extend = extend;

    function defaults(src, def) {
        assert.equal( typeof src, 'object' );
        assert.equal( typeof def, 'object' );

        var result = cloneObject( src );

        for( var it in def ) {
            if( def.hasOwnProperty( it ) && !src.hasOwnProperty( it ) ) {
                result[it] = def[it];
            }
        }

        return result;
    }

    Utility.defaults = defaults;
})( Utility || (Utility = {}) );

module.exports = Utility;
