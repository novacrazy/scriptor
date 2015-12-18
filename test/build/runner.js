'use strict';

exports.__esModule = true;
exports.runTests = runTests;

var _getIterator2 = require( 'babel-runtime/core-js/get-iterator' );

var _getIterator3 = _interopRequireDefault( _getIterator2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/6/2015.
 */

_bluebird2.default.longStackTraces();

function runTests( build, tests ) {
    (0, _assert2.default)( build === 'compat' || build === 'modern', 'Only modern and compat builds are supported' );

    var Scriptor = void 0;

    describe( 'requiring ' + build + ' build', function() {
        Scriptor = require( '../../build/' + build + '/index.js' ).default;
    } );

    if( typeof tests === 'function' ) {
        tests( Scriptor, build );
    } else if( Array.isArray( tests ) ) {
        for( var _iterator = tests, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ? _iterator :
                                                                                               (0, _getIterator3.default)(
                                                                                                   _iterator ); ; ) {
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

            (0, _assert2.default)( typeof test === 'function', 'tests must be a function or array of functions' );

            test( Scriptor, build );
        }
    } else {
        throw new TypeError( 'tests must be a function or array of functions' );
    }
}
