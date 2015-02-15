/**
 * Created by novacrazy on 2/15/2015.
 */

var Scriptor = require( './../../async' );
var Ref = Scriptor.Reference;
var Promise = Scriptor.Promise;

var treeify = require( 'treeify' );

var refs = [];

for( var i = 1; i < 10; i++ ) {
    refs.push( Ref.resolve( i ) );
}

var tree = Ref.join_all( refs, function(left, right) {
    return Promise.join( left.value(), right.value(), function(left, right) {
        return left + ', ' + right;
    } );
} );

tree.value().then( function(value) {
    console.log( value );

} ).then( function() {
    treeify.asLines( tree, true, true, function(line) {
        if( /_(right|left|value)/ig.test( line ) ) {
            console.log( line.replace( '_', '' ) );
        }
    } );
} );


