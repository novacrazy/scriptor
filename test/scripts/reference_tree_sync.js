/**
 * Created by novacrazy on 2/15/2015.
 */

var Scriptor = require( './../../sync' );
var Ref = Scriptor.Reference;

var treeify = require( 'treeify' );

var refs = [];

for( var i = 0; i < 10; i++ ) {
    refs.push( Ref.resolve( i ) );
}

var tree = Ref.join_all( refs, function(left, right) {
    return left.value() + ', ' + right.value();
} );

console.log( tree.value() );

treeify.asLines( tree, true, true, function(line) {
    if( /_(right|left|value)/ig.test( line ) ) {
        console.log( line.replace( '_', '' ) );
    }
} );


