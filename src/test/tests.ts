/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import assert = require('assert');

import Scriptor = require('./../lib/scriptor');

import http = require('http');

interface IScriptParameters {
    request: http.ServerRequest;
    response: http.ServerResponse;
}

var manager : Scriptor.ScriptManager<IScriptParameters>;

describe( 'creating a new ScriptManager', () => {

    it( 'should provide default options', () => {

        manager = new Scriptor.ScriptManager<IScriptParameters>();

    } );

} );
