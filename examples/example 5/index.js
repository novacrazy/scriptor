var Scriptor = require( 'scriptor/async' );
var Reference = Scriptor.Reference;

var ref = Reference.resolve( 'World!' );

ref = ref.transform( function*(left) {
    return 'Hello, ' + (yield left.value());
} );

ref.value().then( console.log ); //Hello, World!
