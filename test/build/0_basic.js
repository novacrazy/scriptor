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
    } );
};

_runnerJs.runTests( 'compat', tests );
_runnerJs.runTests( 'modern', tests );
