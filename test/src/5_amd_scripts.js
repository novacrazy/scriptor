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
    describe( `AMD Scripts (${build} build)`, () => {
        let Script = Scriptor.Script;

        describe( 'simple script that requires a build-in module', function() {
            let script = new Script( './test/fixtures/amd/simple.js', module );

            it( 'should load without any issues', function( done ) {
                script.exports().then( function() {
                    assert( script.loaded );

                } ).then( done );
            } );
        } );

        describe( 'using built-in plugins', function() {
            let script = new Script( './test/fixtures/amd/builtin_plugins.js', module );

            it( 'should load without any issues', function( done ) {
                script.exports().then( function() {
                    assert( script.loaded );

                } ).then( done );
            } );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );