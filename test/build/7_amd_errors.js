'use strict';

var _ = require( '../../' );

var _2 = _interopRequireDefault( _ );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/7/2015.
 */

describe( 'Script errors', function() {
    var Script = _2.default.Script;

    describe( 'simple script that throws an error the first time define is invoked', function() {
        var script = new Script( './test/fixtures/amd/error.js', module );

        it( 'should throw an error the first time', function( done ) {
            var hadError = false;

            script.exports().catch( function( err ) {
                (0, _assert2.default)( err instanceof Error );
                _assert2.default.deepEqual( script._script.exports, {} );
                (0, _assert2.default)( script.loaded );
                (0, _assert2.default)( script.pending );

                hadError = true;
            } ).then( function() {
                (0, _assert2.default)( hadError, 'No error was thrown' );
            } ).then( done, done );
        } );

        it( 'should succeed and finish loading the second time', function( done ) {
            script.exports().then( function( script_exports ) {
                _assert2.default.deepEqual( script_exports, {
                    test: 42
                } );
                (0, _assert2.default)( script.loaded );
                (0, _assert2.default)( !script.pending );
            } ).then( done );
        } );
    } );
} );
