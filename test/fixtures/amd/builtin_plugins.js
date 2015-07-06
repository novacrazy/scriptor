/**
 * Created by Aaron on 7/6/2015.
 */

define( ['assert', 'promisify!crypto', 'crypto'], function*( assert, cryptoAsync, crypto ) {
    assert.notStrictEqual( cryptoAsync, crypto );
    assert.strictEqual( cryptoAsync.randomBytes, crypto.randomBytes );
    assert.strictEqual( typeof cryptoAsync.randomBytesAsync, 'function' );

    var k = yield cryptoAsync.randomBytesAsync( 10 );

    assert( Buffer.isBuffer( k ) );
    assert.strictEqual( k.length, 10 );
} );
