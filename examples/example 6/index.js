var Scriptor = require( 'scriptor/async' );
var Reference = Scriptor.Reference;

var a = Reference.resolve( 'Hello, ' );
var b = Reference.resolve( 'World!' );

var ref = a.join( b, function*(left, right) {
    return (yield left.value()) + (yield right.value());
} );

ref.value().then( console.log ); //Hello, World!
