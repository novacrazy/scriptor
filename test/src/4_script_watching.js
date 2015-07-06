/**
 * Created by Aaron on 7/6/2015.
 */

import {runTests} from './runner.js';

import assert from 'assert';

import Promise from 'bluebird';

var Module = require( 'module' );
var path = require( 'path' );
var fs = require( 'fs' );
//Draws from the same node_modules folder, so they should be exact
var touch = require( 'touch' );

let tests = ( Scriptor, build ) => {
    describe( `Script watching (${build} build)`, () => {
        let Script = Scriptor.Script;

        describe( 'simple script', function() {
            let script = new Script( './test/fixtures/watching/simple.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.exports().then( function( script_exports ) {
                    assert.deepEqual( script_exports, {
                        test: 42
                    } );
                    assert( script.loaded );

                } ).then( done );
            } );

            it( 'should trigger the change event when the file is modified', function( done ) {
                script.once( 'change', function() {
                    done();
                } );

                touch( script.filename );
            } );

            it( 'should be unloaded after the change', function() {
                assert( !script.loaded );
            } );

            it( 'should be able to reload the script with the changes implicitly', function( done ) {
                script.exports().then( function( script_exports ) {
                    assert.deepEqual( script_exports, {
                        test: 42
                    } );
                    assert( script.loaded );

                } ).then( done );
            } );

            it( 'should be able to unwatch a file', function() {
                script.unwatch();

                assert( !script.watched );
            } );

            it( 'should not unload if the file is changed when the script is not watched', function( done ) {
                var watcher = fs.watch( script.filename, function() {
                    assert( script.loaded );
                    watcher.close();
                    done();
                } );

                touch( script.filename );
            } );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );