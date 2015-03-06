/**
 * Created by novacrazy on 1/17/2015.
 */

module.exports = require( './build/async.js' );

module.exports.Promise = require( 'bluebird' );

module.exports.bin = function() {
    return require( './bin/scriptor.js' ).apply( null, arguments );
};
