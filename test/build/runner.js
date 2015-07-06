/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var _getIterator = require( 'babel-runtime/core-js/get-iterator' ).default;

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

exports.__esModule = true;
exports.runTests = runTests;

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

function runTests( build, tests ) {
    _assert2.default( build === 'compat' || build === 'modern', 'Only modern and compat builds are supported' );

    var Scriptor = undefined;

    describe( 'requiring ' + build + ' build', function() {
        Scriptor = require( '../../build/' + build + '/index.js' );
    } );

    if( typeof tests === 'function' ) {
        tests( Scriptor, build );
    } else if( Array.isArray( tests ) ) {
        for( var _iterator = tests, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ? _iterator :
                                                                                               _getIterator( _iterator ); ; ) {
            var _ref;

            if( _isArray ) {
                if( _i >= _iterator.length ) {
                    break;
                }
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if( _i.done ) {
                    break;
                }
                _ref = _i.value;
            }

            var test = _ref;

            _assert2.default( typeof test === 'function', 'tests must be a function or array of functions' );

            test( Scriptor, build );
        }
    } else {
        throw new TypeError( 'tests must be a function or array of functions' );
    }
}
