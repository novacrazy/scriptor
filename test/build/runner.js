/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _getIterator = require( 'babel-runtime/core-js/get-iterator' ).default;

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

Object.defineProperty( exports, '__esModule', {
    value: true
} );
exports.runTests = runTests;

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

_bluebird2.default.longStackTraces();

function runTests( build, tests ) {
    (0, _assert2.default)( build === 'compat' || build === 'modern', 'Only modern and compat builds are supported' );

    var Scriptor = undefined;

    describe( 'requiring ' + build + ' build', function() {
        Scriptor = require( '../../build/' + build + '/index.js' );
    } );

    if( typeof tests === 'function' ) {
        tests( Scriptor, build );
    } else if( Array.isArray( tests ) ) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;

        var _iteratorError = void 0;

        try {
            for( var _iterator = _getIterator( tests ), _step;
                 !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true ) {
                var test = _step.value;

                (0, _assert2.default)( typeof test === 'function', 'tests must be a function or array of functions' );

                test( Scriptor, build );
            }
        } catch( err ) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion && _iterator['return'] ) {
                    _iterator['return']();
                }
            } finally {
                if( _didIteratorError ) {
                    throw _iteratorError;
                }
            }
        }
    } else {
        throw new TypeError( 'tests must be a function or array of functions' );
    }
}
