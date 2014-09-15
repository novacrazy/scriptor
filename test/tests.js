/**
 * Created by novacrazy on 8/9/14.
 */
/// <reference path="../reference.ts" />
var assert = require( 'assert' );

var Scriptor = require( './../lib/scriptor' );

var http = require( 'http' );
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
        var res = manager.runScript( scriptFile );

        assert.equal( res, fs.readFileSync( scriptFile, 'utf8' ) );
    } );
} );

describe( 'loading a more complex script', function() {
    var scriptFile = './test/scripts/testServer.js';

    it( 'should start a server and listen on port 8080', function(done) {
        manager.runScript( scriptFile, done );
    } );

    it( 'should handle a request', function(done) {
        http.request( 'http://localhost:8080', function(res) {
            res.setEncoding( 'utf8' );

            var chunks = "";

            res.on( 'data', function(chunk) {
                chunks += chunk;
            } );

            res.on( 'end', function() {
                if( chunks === 'Hello, World!\n' ) {
                    done();
                } else {
                    done( new Error( 'Mismatch' ) );
                }
            } );

            res.on( 'error', function(err) {
                done( err );
            } );
        } ).end();
    } );
} );
