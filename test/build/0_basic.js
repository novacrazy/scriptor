/**
 * Created by Aaron on 7/5/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var tests = function tests( Scriptor, build ) {
    describe( 'exports (' + build + ' build)', function() {
        it( 'should have exported a Script class', function() {
            _assert2.default.strictEqual( typeof Scriptor.Script, 'function', 'No Script class exported' );
        } );

        it( 'should have exported a SourceScript class', function() {
            _assert2.default.strictEqual( typeof Scriptor.SourceScript, 'function', 'No SourceScript class exported' );
        } );

        it( 'should have exported a TextScript class', function() {
            _assert2.default.strictEqual( typeof Scriptor.TextScript, 'function', 'No TextScript class exported' );
        } );

        it( 'should have exported a compile function', function() {
            _assert2.default.strictEqual( typeof Scriptor.compile, 'function', 'No compile function exported' );
        } );

        it( 'should have exported a load function', function() {
            _assert2.default.strictEqual( typeof Scriptor.load, 'function', 'No load function exported' );
        } );

        it( 'should have exported a Manager class', function() {
            _assert2.default.strictEqual( typeof Scriptor.Manager, 'function', 'No Manager class exported' );
        } );

        it( 'should have exported a Reference class', function() {
            _assert2.default.strictEqual( typeof Scriptor.Reference, 'function', 'No Reference class exported' );
        } );

        it( 'should have exported a bluebird Promise class', function() {
            _assert2.default.strictEqual( typeof Scriptor.Promise, 'function', 'No Promise class exported' );
            _assert2.default.strictEqual( Scriptor.Promise, _bluebird2.default, 'Exported Promise is not bluebird' );
        } );

        it( 'should have exported a addYieldHandler function', function() {
            _assert2.default.strictEqual( typeof Scriptor.addYieldHandler, 'function',
                                          'No addYieldHandler function exported' );
        } );
    } );
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
