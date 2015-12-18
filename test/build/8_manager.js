'use strict';

var _map = require( 'babel-runtime/core-js/map' );

var _map2 = _interopRequireDefault( _map );

var _runner = require( './runner.js' );

var _module = require( 'module' );

var _module2 = _interopRequireDefault( _module );

var _path = require( 'path' );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/7/2015.
 */

var tests = function tests( Scriptor, build ) {
    describe( 'Managers (' + build + ' build)', function() {
        var Manager = Scriptor.Manager;
        var Script = Scriptor.Script;

        var manager = void 0;

        describe( 'Creating a manager', function() {
            manager = new Manager( module );

            it( 'should result in an empty manager with a parent module', function() {
                (0, _assert2.default)( manager.parent instanceof _module2.default );
                _assert2.default.strictEqual( manager.parent.parent, module );
                (0, _assert2.default)( manager.scripts instanceof _map2.default );
                _assert2.default.strictEqual( manager.scripts.size, 0 );
            } );

            it( 'should set cwd to process.cwd', function() {
                _assert2.default.strictEqual( manager.cwd(), process.cwd() );
            } );

            it( 'should allow changing cwd', function() {
                manager.chdir( './fixtures' );

                _assert2.default.strictEqual( manager.cwd(), (0, _path.resolve)( process.cwd(), './fixtures' ) );
            } );
        } );

        describe( 'Add simple scripts through a manager instance', function() {
            it( 'should return the Script instance when passed a path relative to the cwd', function() {
                var script = manager.add( 'empty.js' );

                (0, _assert2.default)( script instanceof Script );
                _assert2.default.strictEqual( script.filename,
                    (0, _path.resolve)( process.cwd(), './fixtures/empty.js' ) );
            } );
        } );
    } );
};

(0, _runner.runTests)( 'compat', tests );
(0, _runner.runTests)( 'modern', tests );
