'use strict';

var _runner = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/6/2015.
 */

var Module = require( 'module' );

var tests = function tests( Scriptor, build ) {
    describe( 'Script calling (' + build + ' build)', function() {
        var Script = Scriptor.Script;

        describe( 'empty file', function() {
            var script = new Script( './test/fixtures/empty.js', module );

            it( 'should not execute anything but just return the empty exports', function( done ) {
                script.call().then( function( result ) {
                    _assert2.default.deepEqual( result, {} );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );

        describe( 'simple module.exports = function(){...}', function() {
            var script = new Script( './test/fixtures/calling/simple.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call().then( function( result ) {
                    _assert2.default.deepEqual( result, {
                        towel: "Don't Forget Yours"
                    } );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );

        describe( 'coroutine as main function', function() {
            var script = new Script( './test/fixtures/calling/coroutine.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call().then( function( result ) {
                    _assert2.default.deepEqual( result, 42 );
                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );

        describe( 'passing arguments to main function', function() {
            var script = new Script( './test/fixtures/calling/arguments.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call( 'test' ).then( function( result ) {
                    _assert2.default.deepEqual( result, 'Hello' );

                    (0, _assert2.default)( script.loaded );
                } ).then( done );
            } );
        } );
    } );
};

(0, _runner.runTests)( 'compat', tests );
(0, _runner.runTests)( 'modern', tests );
