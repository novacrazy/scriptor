/**
 * Created by Aaron on 7/6/2015.
 */

import Scriptor from "../../";
import assert from "assert";

describe( `Script loading`, function() {
    let Script = Scriptor.Script;

    describe( 'empty file', function() {
        let script = new Script( './test/fixtures/empty.js', module );

        it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {} );
                assert( script.loaded );

            } ).then( done, done );
        } );
    } );

    describe( 'simple script with CommonJS style exports', function() {
        let script = new Script( './test/fixtures/loading/commonjs_simple.js', module );

        it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {
                    test: 42
                } );
                assert( script.loaded );

            } ).then( done, done );
        } );
    } );

    describe( 'simple script with simple AMD style factory exports', function() {
        let script = new Script( './test/fixtures/loading/amd_simple.js', module );

        it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {
                    test: 42
                } );
                assert( script.loaded );

            } ).then( done, done );
        } );

        it( 'should be watching the file after load', function() {
            assert( script.watched );
        } );
    } );

    describe( 'simple script with AMD strict style factory exports', function() {
        let script = new Script( './test/fixtures/loading/amd_strict.js', module );

        it( 'should load the file upon calling it (lazy evaluation)', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {
                    'default':  {
                        test: 42
                    },
                    __esModule: true
                } );
                assert( script.loaded );

            } ).then( done, done );
        } );

        it( 'should be watching the file after load', function() {
            assert( script.watched );
        } );
    } );
} );