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

describe( 'TextScripts', function() {
    var TextScript = _2.default.TextScript;

    describe( 'simple file with hello world', function() {
        var script = new TextScript( './test/fixtures/text/hello.txt', module );

        it( 'should not export anything', function( done ) {
            script.exports().then( function( script_exports ) {
                _assert2.default.deepEqual( script_exports, {} );
                (0, _assert2.default)( script.loaded );
            } ).then( done );
        } );

        it( 'should give the text as the script source', function( done ) {
            script.source( 'utf-8' ).then( function( src ) {
                _assert2.default.strictEqual( src.trim(), 'Hello, World!' );
            } ).then( done );
        } );
    } );
} );
