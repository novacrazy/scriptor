/**
 * Created by Aaron on 7/5/2015.
 */

import Scriptor from "../../";
import assert from "assert";
import Promise from "bluebird";


describe( `exports`, function() {
    it( 'should have exported a Script class', function() {
        assert.strictEqual( typeof Scriptor.Script, 'function', 'No Script class exported' );
    } );

    it( 'should have exported a SourceScript class', function() {
        assert.strictEqual( typeof Scriptor.SourceScript, 'function', 'No SourceScript class exported' );
    } );

    it( 'should have exported a TextScript class', function() {
        assert.strictEqual( typeof Scriptor.TextScript, 'function', 'No TextScript class exported' );
    } );

    it( 'should have exported a compile function', function() {
        assert.strictEqual( typeof Scriptor.compile, 'function', 'No compile function exported' );
    } );

    it( 'should have exported a load function', function() {
        assert.strictEqual( typeof Scriptor.load, 'function', 'No load function exported' );
    } );

    it( 'should have exported a Manager class', function() {
        assert.strictEqual( typeof Scriptor.Manager, 'function', 'No Manager class exported' );
    } );

    it( 'should have exported a Reference class', function() {
        assert.strictEqual( typeof Scriptor.Reference, 'function', 'No Reference class exported' );
    } );

    it( 'should have exported a bluebird Promise class', function() {
        assert.strictEqual( typeof Scriptor.Promise, 'function', 'No Promise class exported' );
        assert.strictEqual( Scriptor.Promise, Promise, 'Exported Promise is not bluebird' );
    } );

    it( 'should have exported a few utility functions', function() {
        assert.strictEqual( typeof Scriptor.utils, 'object', 'No utilities exported' );
        assert.strictEqual( typeof Scriptor.utils.stripBOM, 'function', 'Missing utility "stripBOM"' );
        assert.strictEqual( typeof Scriptor.utils.injectAMD, 'function', 'Missing utility "stripBOM"' );
    } );
} );