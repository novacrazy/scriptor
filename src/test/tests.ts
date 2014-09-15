/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import assert = require('assert');

import Scriptor = require('./../lib/scriptor');

import http = require('http');
import fs = require('fs');



var manager : Scriptor.ScriptManager;

describe( 'creating a new ScriptManager', () => {

    it( 'should provide default options', () => {

        manager = new Scriptor.ScriptManager();
    } );
} );


describe( 'loading a simple script', () => {

    var scriptFile = './test/scripts/testScript.js';

    it( 'should load', () => {
        manager.preloadScript( scriptFile );
    } );

    it( 'should be able to run it', () => {

        var res = manager.runScript( scriptFile );

        assert.equal( res, fs.readFileSync( scriptFile, 'utf8' ) );

    } );

} );

describe( 'loading a more complex script', () => {

    var scriptFile = './test/scripts/testServer.js';

    it( 'should start a server and listen on port 8080', ( done ) => {
        manager.runScript( scriptFile, done );
    } );

    it( 'should handle a request', ( done ) => {

        http.request( 'http://localhost:8080', ( res : http.ClientResponse ) => {

            res.setEncoding( 'utf8' );

            var chunks = "";

            res.on( 'data', function( chunk ) {
                chunks += chunk;
            } );

            res.on( 'end', () => {
                if ( chunks === 'Hello, World!\n' ) {
                    done();

                } else {
                    done( new Error( 'Mismatch' ) );
                }
            } );

            res.on( 'error', ( err ) => {
                done( err );
            } );

        } ).end();

    } )


} );
