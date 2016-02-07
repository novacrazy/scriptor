/**
 * Created by Aaron on 7/7/2015.
 */

import Scriptor from "../../";
import Module from "module";
import {resolve} from "path";
import assert from "assert";

describe( `Managers`, function() {
    let {Manager, Script} = Scriptor;

    let manager;

    describe( 'Creating a manager', function() {
        manager = new Manager( module );

        it( 'should result in an empty manager with a parent module', function() {
            assert( manager.parent instanceof Module );
            assert.strictEqual( manager.parent.parent, module );
            assert( manager.scripts instanceof Map );
            assert.strictEqual( manager.scripts.size, 0 );
        } );

        it( 'should set cwd to process.cwd', function() {
            assert.strictEqual( manager.cwd(), process.cwd() );
        } );

        it( 'should allow changing cwd', function() {
            manager.chdir( './fixtures' );

            assert.strictEqual( manager.cwd(), resolve( process.cwd(), './fixtures' ) );
        } );
    } );

    describe( 'Add simple scripts through a manager instance', function() {
        it( 'should return the Script instance when passed a path relative to the cwd', function() {
            let script = manager.add( 'empty.js' );

            assert( script instanceof Script );
            assert.strictEqual( script.filename, resolve( process.cwd(), './fixtures/empty.js' ) );
        } );
    } );
} );