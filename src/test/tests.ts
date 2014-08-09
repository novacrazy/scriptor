/**
 * Created by novacrazy on 8/9/14.
 */

/// <reference path="../reference.ts" />

import Scriptor = require('./../lib/scriptor');

var manager : Scriptor.ScriptManager;

describe( 'creating a new ScriptManager', () => {

    it( 'should succeed', () => {

        manager = new Scriptor.ScriptManager();

        manager.useGlobal = true;

    } );

} );
