/**
 * Created by novacrazy on 8/9/14.
 */
var Scriptor = require( './../lib/scriptor' );

var manager;

describe( 'creating a new ScriptManager', function() {
    it( 'should provide default options', function() {
        manager = new Scriptor.ScriptManager();
    } );
} );
