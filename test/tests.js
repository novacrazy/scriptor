/**
 * Created by novacrazy on 8/9/14.
 */
/// <reference path="../reference.ts" />
var assert = require( 'assert' );

var Scriptor = require( './../lib/scriptor' );

var fs = require( 'fs' );

var manager;

describe( 'creating a new ScriptManager', function() {
    it( 'should provide default options', function() {
        manager = new Scriptor.ScriptManager();
    } );
} );

describe( 'loading a simple script', function() {
    var scriptFile = './test/scripts/testScript.js';

    it( 'should load', function() {
        manager.preloadScript( scriptFile );
    } );

    it( 'should be able to run it', function() {
        var res = manager.runScript( scriptFile, {} );

        assert.equal( res, fs.readFileSync( scriptFile, 'utf8' ) );
    } );
} );
