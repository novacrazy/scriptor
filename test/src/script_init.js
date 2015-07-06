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
    describe( `Script initialization (${build} build)`, () => {
        let Script = Scriptor.Script;

        describe( 'Creating a new Script without default filename', function() {
            var script;

            it( 'should create a new Script instance', function() {
                script = new Script( module );

                assert( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                assert( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                assert.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                assert( !script.loaded );
            } );

            it( 'should NOT be watching a file', function() {
                assert( !script.watched );
            } );
        } );

        describe( 'Creating a new Script with filename and module', function() {
            var script, name = './test/fixtures/empty.js';

            it( 'should create a new Script instance', function() {
                script = new Script( name, module );

                assert( script instanceof Script );
            } );

            it( 'should have created a new Module instance internally', function() {
                assert( script._script instanceof Module );
            } );

            it( 'should use provided module as parent', function() {
                assert.strictEqual( script.parent, module );
            } );

            it( 'should not be loaded', function() {
                assert( !script.loaded );
            } );

            it( 'should be watching the file', function() {
                assert( script.watched );
            } );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
