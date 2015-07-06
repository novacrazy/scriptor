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
    describe( 'Script watching (' + build + ' build)', function() {
        var Script = Scriptor.Script;

        describe( 'simple script', function() {
            var script = new Script( './test/fixtures/watching/simple.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {
                        test: 42
                    } );
                    _assert2.default( script.loaded );
                } ).then( done );
            } );

            it( 'should trigger the change event when the file is modified', function( done ) {
                script.once( 'change', function() {
                    done();
                } );

                touch( script.filename );
            } );

            it( 'should be unloaded after the change', function() {
                _assert2.default( !script.loaded );
            } );

            it( 'should be able to reload the script with the changes implicitly', function( done ) {
                script.exports().then( function( script_exports ) {
                    _assert2.default.deepEqual( script_exports, {
                        test: 42
                    } );
                    _assert2.default( script.loaded );
                } ).then( done );
            } );

            it( 'should be able to unwatch a file', function() {
                script.unwatch();

                _assert2.default( !script.watched );
            } );

            it( 'should not unload if the file is changed when the script is not watched', function( done ) {
                var watcher = fs.watch( script.filename, function() {
                    _assert2.default( script.loaded );
                    watcher.close();
                    done();
                } );

                touch( script.filename );
            } );
        } );
    } );
};

_runnerJs.runTests( 'compat', tests );
_runnerJs.runTests( 'modern', tests );
