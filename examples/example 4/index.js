var Scriptor = require( 'scriptor/sync' );
var Reference = Scriptor.Reference;

var ref = Reference.resolve( 32 );

ref = ref.transform( function(left) {
    return left.value() + 10;
} );

console.log( ref.value() ); //42
