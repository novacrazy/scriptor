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

var fs    = require( 'fs' );
var touch = require( 'touch' );

describe( "Script watching", function() {
    var Script = _2.default.Script;

    describe( 'simple script', function() {
        var script = new Script( './test/fixtures/watching/simple.js', module );

        it( 'should NOT be watching the file before load', function() {
            (0, _assert2.default)( !script.watched );
        } );

        it( 'should watch the file upon load', function() {
            (0, _assert2.default)( script.willWatch );
        } );

        it( 'should call the exported function and return the result', function( done ) {
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

        it( 'should trigger the change event when the file is modified', function( done ) {
            script.once( 'change', function() {
                done();
            } );

            touch( script.filename );
        } );

        it( 'should be unloaded after the change', function() {
            (0, _assert2.default)( !script.loaded );
        } );

        it( 'should be able to reload the script with the changes implicitly', function( done ) {
            script.exports().then( function( script_exports ) {
                _assert2.default.deepEqual( script_exports, {
                    test: 42
                } );
                (0, _assert2.default)( script.loaded );
            } ).then( done );
        } );

        it( 'should be able to unwatch a file', function() {
            script.unwatch();

            (0, _assert2.default)( !script.watched );
        } );

        it( 'should not unload if the file is changed when the script is not watched', function( done ) {
            var watcher = fs.watch( script.filename, function() {
                (0, _assert2.default)( script.loaded );
                watcher.close();
                done();
            } );

            touch( script.filename );
        } );
    } );
} );
