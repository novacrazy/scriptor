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

describe( "Script loading", function() {
    var Script = _2.default.Script;

    describe( 'empty file', function() {
        var script = new Script( './test/fixtures/empty.js', module );

        it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
            script.exports().then( function( script_exports ) {
                _assert2.default.deepEqual( script_exports, {} );
                (0, _assert2.default)( script.loaded );
            } ).then( done, done );
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
            } ).then( done, done );
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
            } ).then( done, done );
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
            } ).then( done, done );
        } );

        it( 'should be watching the file after load', function() {
            (0, _assert2.default)( script.watched );
        } );
    } );
} );
