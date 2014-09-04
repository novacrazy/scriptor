/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import assert = require('assert');

import Scriptor = require('./../lib/scriptor');

import http = require('http');
import fs = require('fs');

interface IScriptParameters {
    request?: http.ServerRequest;
    response?: http.ServerResponse;
}

var manager : Scriptor.ScriptManager<IScriptParameters>;

describe( 'creating a new ScriptManager', () => {

    it( 'should provide default options', () => {

        manager = new Scriptor.ScriptManager<IScriptParameters>();
    } );
} );



describe( 'loading a simple script', () => {

    var scriptFile = './test/scripts/testScript.js';

    it( 'should load', () => {
        manager.preloadScript( scriptFile );
    } );

    it( 'should be able to run it', () => {

        var res = manager.runScript( scriptFile, {} );

        assert.equal( res, fs.readFileSync( scriptFile, 'utf8' ) );

    } );

} );
