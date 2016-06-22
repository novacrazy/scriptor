"use strict";

var _ = require( "../../" );

var _2 = _interopRequireDefault( _ );

var _assert = require( "assert" );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/6/2015.
 */

describe( "AMD Scripts", function() {
    var Script = _2.default.Script;

    describe( 'simple script that requires a build-in module', function() {
        var script = new Script( './test/fixtures/amd/simple.js', module );

        it( 'should load without any issues', function( done ) {
            script.exports().then( function() {
                (0, _assert2.default)( script.loaded );
            } ).then( done );
        } );
    } );

    describe( 'using built-in plugins', function() {
        var script = new Script( './test/fixtures/amd/builtin_plugins.js', module );

        it( 'should load without any issues', function( done ) {
            script.exports().then( function() {
                (0, _assert2.default)( script.loaded );
            } ).then( done );
        } );
    } );
} );
