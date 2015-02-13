/**
 * Created by novacrazy on 2/12/2015.
 */

define( ['promisify!fs', 'assert'], function*(fs, assert, require) {
    var file = yield fs.readFileAsync( './test/scripts/empty.js', 'utf-8' );

    var assert2 = yield require( 'assert' );

    assert.strictEqual( assert, assert2 );

    return file;
} );
