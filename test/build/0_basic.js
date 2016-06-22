"use strict";

var _typeof2 = require( "babel-runtime/helpers/typeof" );

var _typeof3 = _interopRequireDefault( _typeof2 );

var _ = require( "../../" );

var _2 = _interopRequireDefault( _ );

var _assert = require( "assert" );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( "bluebird" );

var _bluebird2 = _interopRequireDefault( _bluebird );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

describe( "exports", function() {
    it( 'should have exported a Script class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.Script ), 'function',
            'No Script class exported' );
    } );

    it( 'should have exported a SourceScript class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.SourceScript ), 'function',
            'No SourceScript class exported' );
    } );

    it( 'should have exported a TextScript class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.TextScript ), 'function',
            'No TextScript class exported' );
    } );

    it( 'should have exported a compile function', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.compile ), 'function',
            'No compile function exported' );
    } );

    it( 'should have exported a load function', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.load ), 'function',
            'No load function exported' );
    } );

    it( 'should have exported a Manager class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.Manager ), 'function',
            'No Manager class exported' );
    } );

    it( 'should have exported a Reference class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.Reference ), 'function',
            'No Reference class exported' );
    } );

    it( 'should have exported a bluebird Promise class', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.Promise ), 'function',
            'No Promise class exported' );
        _assert2.default.strictEqual( _2.default.Promise, _bluebird2.default, 'Exported Promise is not bluebird' );
    } );

    it( 'should have exported a few utility functions', function() {
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.utils ), 'object', 'No utilities exported' );
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.utils.stripBOM ), 'function',
            'Missing utility "stripBOM"' );
        _assert2.default.strictEqual( (0, _typeof3.default)( _2.default.utils.injectAMD ), 'function',
            'Missing utility "stripBOM"' );
    } );
} );
/**
 * Created by Aaron on 7/5/2015.
 */
