/**
 * Created by novacrazy on 6/17/14.
 */

module.exports = require( './ts_build/sync.js' );

module.exports.bin = function() {
    return require( './bin/scriptor.js' ).apply( null, arguments );
};
