/**
 * Created by novacrazy on 8/9/14.
 */
/// <reference path="../reference.ts" />
var Scriptor = require( './../lib/scriptor' );

var manager;

describe( 'creating a new ScriptManager', function() {
    it( 'should succeed', function() {
        manager = new Scriptor.ScriptManager();

        manager.useGlobal = true;
    } );
} );
