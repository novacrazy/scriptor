/**
 * Created by Aaron on 7/6/2015.
 */


import {runTests} from './runner.js';

import assert from 'assert';

var Module = require( 'module' );


let tests = ( Scriptor, build ) => {
    describe( `Script initialization (${build} build)`, function() {
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

            it( 'should NOT be ready to watch the file upon load', function() {
                assert( !script.willWatch );
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

            it( 'should NOT be watching the file', function() {
                assert( !script.watched );
            } );

            it( 'should be ready to watch the file upon load', function() {
                assert( script.willWatch );
            } );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
