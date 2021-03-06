/**
 * Created by Aaron on 7/7/2015.
 */

import Scriptor from "../../";
import assert from "assert";

describe( `TextScripts`, function() {
    let TextScript = Scriptor.TextScript;

    describe( 'simple file with hello world', function() {
        let script = new TextScript( './test/fixtures/text/hello.txt', module );

        it( 'should not export anything', function( done ) {
            script.exports().then( function( script_exports ) {
                assert.deepEqual( script_exports, {} );
                assert( script.loaded );

            } ).then( done );
        } );

        it( 'should give the text as the script source', function( done ) {
            script.source( 'utf-8' ).then( src => {
                assert.strictEqual( src.trim(), 'Hello, World!' );

            } ).then( done );
        } );
    } );
} );