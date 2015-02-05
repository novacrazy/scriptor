/**
 * Created by novacrazy on 1/2/2015.
 */

module.exports = function() {
    console.log( 'recursing...' );
    return module.reference( './recurse.js' );
};
