/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var tests = function tests( Scriptor, build ) {
    describe( 'AMD Scripts (' + build + ' build)', function() {
        var Script = Scriptor.Script;

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
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
