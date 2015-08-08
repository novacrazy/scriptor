//index.js
var Scriptor = require( 'scriptor/async' );
Scriptor.enableCustomExtensions(); //Enable asynchronous file loading and AMD injection

var main = new Scriptor.Script( 'app.js' );

main.call().then( function( app ) {
    app.listen( 8080 );
} );
