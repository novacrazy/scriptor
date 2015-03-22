//index.js
var assert = require( 'assert' );
var Scriptor = require( 'scriptor/sync' );

var main = new Scriptor.Script( 'test.js' );
assert.strictEqual( main.exports(), 42 );
