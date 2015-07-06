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
    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
