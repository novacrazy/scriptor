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
    describe( `Script calling (${build} build)`, () => {
        let Script = Scriptor.Script;

        describe( 'empty file', function() {
            let script = new Script( './test/fixtures/empty.js', module );

            it( 'should not execute anything but just return the empty exports', function( done ) {
                script.call().then( function( result ) {
                    assert.deepEqual( result, {} );
                    assert( script.loaded );

                } ).then( done );
            } );
        } );

        describe( 'simple module.exports = function(){...}', function() {
            let script = new Script( './test/fixtures/calling/simple.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call().then( function( result ) {
                    assert.deepEqual( result, {
                        towel: "Don't Forget Yours"
                    } );
                    assert( script.loaded );

                } ).then( done );
            } );
        } );

        describe( 'coroutine as main function', function() {
            let script = new Script( './test/fixtures/calling/coroutine.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call().then( function( result ) {
                    assert.deepEqual( result, 42 );
                    assert( script.loaded );

                } ).then( done );
            } );
        } );

        describe( 'passing arguments to main function', function() {
            let script = new Script( './test/fixtures/calling/arguments.js', module );

            it( 'should call the exported function and return the result', function( done ) {
                script.call( 'test' ).then( function( result ) {
                    assert.deepEqual( result, 'Hello' );

                    assert( script.loaded );

                } ).then( done );
            } );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
