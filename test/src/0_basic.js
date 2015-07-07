/**
 * Created by Aaron on 7/5/2015.
 */

import {runTests} from './runner.js';

import assert from 'assert';

import Promise from 'bluebird';

let tests = ( Scriptor, build ) => {
    describe( `exports (${build} build)`, () => {
        it( 'should have exported a Script class', () => {
            assert.strictEqual( typeof Scriptor.Script, 'function', 'No Script class exported' );
        } );

        it( 'should have exported a SourceScript class', () => {
            assert.strictEqual( typeof Scriptor.SourceScript, 'function', 'No SourceScript class exported' );
        } );

        it( 'should have exported a TextScript class', () => {
            assert.strictEqual( typeof Scriptor.TextScript, 'function', 'No TextScript class exported' );
        } );

        it( 'should have exported a compile function', () => {
            assert.strictEqual( typeof Scriptor.compile, 'function', 'No compile function exported' );
        } );

        it( 'should have exported a load function', () => {
            assert.strictEqual( typeof Scriptor.load, 'function', 'No load function exported' );
        } );

        it( 'should have exported a Manager class', () => {
            assert.strictEqual( typeof Scriptor.Manager, 'function', 'No Manager class exported' );
        } );

        it( 'should have exported a Reference class', () => {
            assert.strictEqual( typeof Scriptor.Reference, 'function', 'No Reference class exported' );
        } );

        it( 'should have exported a bluebird Promise class', () => {
            assert.strictEqual( typeof Scriptor.Promise, 'function', 'No Promise class exported' );
            assert.strictEqual( Scriptor.Promise, Promise, 'Exported Promise is not bluebird' );
        } );

        it( 'should have exported a addYieldHandler function', () => {
            assert.strictEqual( typeof Scriptor.addYieldHandler, 'function', 'No addYieldHandler function exported' );
        } );

        it( 'should have exported a few utility functions', () => {
            assert.strictEqual( typeof Scriptor.utils, 'object', 'No utilities exported' );
            assert.strictEqual( typeof Scriptor.utils.stripBOM, 'function', 'Missing utility "stripBOM"' );
            assert.strictEqual( typeof Scriptor.utils.injectAMD, 'function', 'Missing utility "stripBOM"' );
        } );
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
