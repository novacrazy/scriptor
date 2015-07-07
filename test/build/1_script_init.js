/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var Module = require( 'module' );

var tests = function tests( Scriptor, build ) {
    describe( 'Script initialization (' + build + ' build)', function() {
        var Script = Scriptor.Script;

        describe( 'Creating a new Script without default filename', function() {
            var script;

            it( 'should create a new Script instance', function() {
                script = new Script( module );

                (0, _assert2.default)( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                (0, _assert2.default)( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                _assert2.default.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                (0, _assert2.default)( !script.loaded );
            } );

            it( 'should NOT be watching a file', function() {
                (0, _assert2.default)( !script.watched );
            } );

            it( 'should NOT be ready to watch the file upon load', function() {
                (0, _assert2.default)( !script.willWatch );
            } );
        } );

        describe( 'Creating a new Script with filename and module', function() {
            var script,
                name = './test/fixtures/empty.js';

            it( 'should create a new Script instance', function() {
                script = new Script( './test/fixtures/empty.js', module );

                (0, _assert2.default)( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                (0, _assert2.default)( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                _assert2.default.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                (0, _assert2.default)( !script.loaded );
            } );

            it( 'should NOT be watching the file', function() {
                (0, _assert2.default)( !script.watched );
            } );

            it( 'should be ready to watch the file upon load', function() {
                (0, _assert2.default)( script.willWatch );
            } );
        } );
    } );
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
