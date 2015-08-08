/**
 * Created by Aaron on 7/7/2015.
 */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _runnerJs = require( './runner.js' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var tests = function tests( Scriptor, build ) {
    describe( 'References (' + build + ' build)', function() {
        var Reference = Scriptor.Reference;
        var Script = Scriptor.Script;
    } );
};

(0, _runnerJs.runTests)( 'compat', tests );
(0, _runnerJs.runTests)( 'modern', tests );
