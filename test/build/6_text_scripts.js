/**
 * Created by Aaron on 7/7/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var tests = function tests( Scriptor, build ) {
    describe( 'TextScripts (' + build + ' build)', function() {
        var TextScript = Scriptor.TextScript;

        describe( 'simple file with hello world', function() {
            var script = new TextScript( './test/fixtures/text/hello.txt', module );

            it( 'should not export anything', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {} );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );

            it( 'should give the text as the script source', function( done ) {
                script.source( 'utf-8' ).then( function( src ) {
                    _assert2.default.strictEqual( src.trim(), 'Hello, World!' );
                } ).then( done );
            } );
        } );
    } );
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
