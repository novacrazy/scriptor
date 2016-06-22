"use strict";

var _ = require( "../../" );

var _2 = _interopRequireDefault( _ );

var _assert = require( "assert" );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/6/2015.
 */

var Module = require( 'module' );

describe( "Script initialization", function() {
    var Script = _2.default.Script;

    describe( 'Creating a new Script without default filename', function() {
        var script;

        it( 'should create a new Script instance', function() {
            script = new Script( module );

            (0, _assert2.default)( script instanceof Script );
        } );

        it( 'should have created a new Module instance internally', function() {
            (0, _assert2.default)( script._script instanceof Module );
        } );

        it( 'should use provided module as parent', function() {
            _assert2.default.strictEqual( script.parent, module );
        } );

        it( 'should not be loaded', function() {
            (0, _assert2.default)( !script.loaded );
        } );

        it( 'should NOT be watching a file', function() {
            (0, _assert2.default)( !script.watched );
        } );

        it( 'should NOT be ready to watch the file upon load', function() {
            (0, _assert2.default)( !script.willWatch );
        } );
    } );

    describe( 'Creating a new Script with filename and module', function() {
        var script,
            name = './test/fixtures/empty.js';

        it( 'should create a new Script instance', function() {
            script = new Script( name, module );

            (0, _assert2.default)( script instanceof Script );
        } );

        it( 'should have created a new Module instance internally', function() {
            (0, _assert2.default)( script._script instanceof Module );
        } );

        it( 'should use provided module as parent', function() {
            _assert2.default.strictEqual( script.parent, module );
        } );

        it( 'should not be loaded', function() {
            (0, _assert2.default)( !script.loaded );
        } );

        it( 'should NOT be watching the file', function() {
            (0, _assert2.default)( !script.watched );
        } );

        it( 'should be ready to watch the file upon load', function() {
            (0, _assert2.default)( script.willWatch );
        } );
    } );
} );
