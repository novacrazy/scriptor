'use strict';

var _runner = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/7/2015.
 */

var tests = function tests( Scriptor, build ) {
    describe( 'References (' + build + ' build)', function() {
        var Reference = Scriptor.Reference;
        var Script = Scriptor.Script;
    } );
};

(0, _runner.runTests)( 'compat', tests );
(0, _runner.runTests)( 'modern', tests );
