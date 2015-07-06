/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var Module = require( 'module' );
var path = require( 'path' );
var fs = require( 'fs' );
//Draws from the same node_modules folder, so they should be exact
var touch = require( 'touch' );

var tests = function tests( Scriptor, build ) {
    describe( 'Script initialization (' + build + ' build)', function() {
        var Script = Scriptor.Script;

        describe( 'Creating a new Script without default filename', function() {
            var script;

            it( 'should create a new Script instance', function() {
                script = new Script( module );

                _assert2.default( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                _assert2.default( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                _assert2.default.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                _assert2.default( !script.loaded );
            } );

            it( 'should NOT be watching a file', function() {
                _assert2.default( !script.watched );
            } );
        } );

        describe( 'Creating a new Script with filename and module', function() {
            var script,
                name = './test/build/fixtures/scripts/empty.js';

            it( 'should create a new Script instance', function() {
                script = new Script( './test/build/fixtures/scripts/empty.js', module );

                _assert2.default( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                _assert2.default( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                _assert2.default.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                _assert2.default( !script.loaded );
            } );

            it( 'should be watching the file', function() {
                _assert2.default( script.watched );
            } );
        } );
    } );
};

_runnerJs.runTests( 'compat', tests );
_runnerJs.runTests( 'modern', tests );
