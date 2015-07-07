/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var tests = function tests( Scriptor, build ) {
    describe( 'Script loading (' + build + ' build)', function() {
        var Script = Scriptor.Script;

        describe( 'empty file', function() {
            var script = new Script( './test/fixtures/empty.js', module );

            it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {} );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );

        describe( 'simple script with CommonJS style exports', function() {
            var script = new Script( './test/fixtures/loading/commonjs_simple.js', module );

            it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {
                        test: 42
                    } );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );

        describe( 'simple script with simple AMD style factory exports', function() {
            var script = new Script( './test/fixtures/loading/amd_simple.js', module );

            it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {
                        test: 42
                    } );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );

            it( 'should be watching the file after load', function() {
                (0, _assert2.default)( script.watched );
            } );
        } );

        describe( 'simple script with AMD strict style factory exports', function() {
            var script = new Script( './test/fixtures/loading/amd_strict.js', module );

            it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {
                        'default':  {
                            test: 42
                        },
                        __esModule: true
                    } );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );

            it( 'should be watching the file after load', function() {
                (0, _assert2.default)( script.watched );
            } );
        } );
    } );
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
