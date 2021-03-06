/**
 * Created by Aaron on 7/7/2015.
 */

import Scriptor from "../../";
import assert from "assert";

describe( `Script errors`, function() {
    let Script = Scriptor.Script;

    describe( 'simple script that throws an error the first time define is invoked', function() {
        let script = new Script( './test/fixtures/amd/error.js', module );

        it( 'should throw an error the first time', function( done ) {
            let hadError = false;

            script.exports().catch( function( err ) {
                assert( err instanceof Error );
                assert.deepEqual( script._script.exports, {} );
                assert( script.loaded );
                assert( script.pending );

                hadError = true;

            } ).then( function() {
                assert( hadError, 'No error was thrown' );

            } ).then( done, done );
        } );

        it( 'should succeed and finish loading the second time', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {
                    test: 42
                } );
                assert( script.loaded );
                assert( !script.pending );

            } ).then( done );
        } )
    } );
} );