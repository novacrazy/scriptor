var Scriptor = require( 'scriptor/sync' );
var Reference = Scriptor.Reference;

var refs = [];

for( var i = 0; i < 10; i++ ) {
    refs.push( Reference.resolve( i ) );
}

var root = Reference.join_all( refs, function(left, right) {
    return left.value() + ', ' + right.value();
} );

console.log( root.value() ); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9
