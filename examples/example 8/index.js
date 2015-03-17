//index.js
var Scriptor = require( 'scriptor/sync' );

var manager = new Scriptor.Manager( module );

var res = manager.call( 'something.js' );

console.log( res.value ); //100
