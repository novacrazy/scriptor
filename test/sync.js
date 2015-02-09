/**
 * Created by novacrazy on 2/3/2015.
 */

var assert = require( 'assert' );
var Module = require( 'module' );
var path = require( 'path' );
var fs = require( 'fs' );
var touch = require( 'touch' );

var common = require( './scripts/common' );

process.on( 'uncaughtexception', console.error );

var Scriptor = require( './../' );

describe( 'new Manager()', function() {

    var manager;

    it( 'should instantiate a new manager', function() {
        manager = new Scriptor.Manager( module );

        assert( manager instanceof Scriptor.Manager );
    } );

    it( 'should have created a new Module to be the parent of managed scripts', function() {
        assert( manager.parent instanceof Module );
    } );

    it( 'should have used this module as grandparent', function() {
        assert.strictEqual( manager.parent.parent, module );
    } );

    it( 'should set cwd to process.cwd', function() {
        assert.strictEqual( manager.cwd, process.cwd() );
    } );

    it( 'should allow changing cwd', function() {
        manager.chdir( './scripts' );

        assert.strictEqual( manager.cwd, path.resolve( process.cwd(), './scripts' ) );
    } );

    describe( 'manager behavior', function() {
        it( 'should use ES6 maps when available, falling back to Objects if not', function() {
            if( Map !== void 0 ) {
                assert( manager._scripts instanceof Map );

            } else {
                assert( manager._scripts instanceof Object );
            }
        } );

        it( 'should freeze script map', function() {
            assert( Object.isFrozen( manager.scripts ) );
        } );
    } );
} );

describe( 'new Script() without any arguments', function() {
    var script;

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script();

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use default module as parent', function() {
        assert.strictEqual( script.parent, Scriptor.this_module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should not be watching a file', function() {
        assert( !script.watched );
    } );
} );

describe( 'new Script() without default filename', function() {
    var script;

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should not be watching a file', function() {
        assert( !script.watched );
    } );
} );

describe( 'new Script() with filename and module', function() {
    var script, name = './test/scripts/empty.js';

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( name, module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should be watching the file', function() {
        assert( script.watched );
    } );

    it( 'should load the file upon calling it (lazy execution)', function() {
        var script_exports = script.exports();

        assert.deepEqual( script_exports, {} );
        assert( script.loaded );
    } );

    it( 'should trigger the change event when the file is modified', function(done) {
        script.once( 'change', function() {
            done();
        } );

        touch.sync( name );
    } );

    it( 'should be unloaded after script change', function() {
        assert( !script.loaded );
    } );

    it( 'should be able to reload the script with the changes implicitly', function() {
        var script_exports = script.exports();

        assert.deepEqual( script_exports, {} );
        assert( script.loaded );
    } );

    it( 'should be able to unwatch a file', function() {
        script.unwatch();

        assert( !script.watched );
    } );

    it( 'should not unload if the file is changed when the script is not watched', function(done) {
        var watcher = fs.watch( name, function() {
            assert( script.loaded );
            watcher.close();
            done();
        } );

        touch.sync( name );
    } );
} );

describe( 'A simple MD5 script with AMD exporting', function() {
    var script, name = './test/scripts/md5.js';

    var message = 'Hello, World!';

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( name, module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should be watching a file', function() {
        assert( script.watched );
    } );

    it( 'should load the file upon calling it (lazy execution)', function() {
        script.exports();

        assert( script.loaded );
    } );

    it( 'should have exported the main function', function() {
        var script_exports = script.exports();

        assert.strictEqual( typeof script_exports, 'function' );
    } );

    it( 'should execute the main function', function() {
        var result = script.call( message );

        assert.strictEqual( result, common.md5( message ) );
    } );

    it( 'should use default arguments (in the script)', function() {
        var result = script.call();

        assert.strictEqual( result, common.md5( message ) );
    } );
} );

describe( 'Another simple MD5 script with AMD exporting', function() {
    var script, name = './test/scripts/simple.js';

    var message = 'Hello, World!';

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( name, module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should be watching a file', function() {
        assert( script.watched );
    } );

    it( 'should load the file upon calling it (lazy execution)', function() {
        script.exports();

        assert( script.loaded );
    } );

    it( 'should have exported the main function', function() {
        var script_exports = script.exports();

        assert.strictEqual( typeof script_exports, 'function' );
    } );

    it( 'should execute the main function', function() {
        var result = script.call( message );

        assert.strictEqual( result, common.md5( message ) );
    } );

    it( 'should use default arguments (in the script)', function() {
        var result = script.call();

        assert.strictEqual( result, common.md5( message ) );
    } );
} );

describe( 'Scriptor with custom extensions', function() {

    var script, name = './test/scripts/inject_test.js';

    Scriptor.enableCustomExtensions();

    it( 'should have installed custom extension functions', function() {
        assert.strictEqual( typeof Scriptor.extensions['.js'], 'function' );
    } );

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( name, module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should be watching a file', function() {
        assert( script.watched );
    } );

    it( 'should load the file upon calling it (lazy execution)', function() {
        script.exports();

        assert( script.loaded );
    } );

    it( 'should have exported the main function', function() {
        var script_exports = script.exports();

        assert.deepEqual( script_exports, {} );
    } );

    it( 'should execute the main function', function() {
        var result = script.call();

        assert.deepEqual( result, {} );
    } );
} );

describe( 'Advanced Script with synchronous plugin', function() {
    var script, name = './test/scripts/advanced_sync.js';

    it( 'should create a new Script instance', function() {
        script = new Scriptor.Script( name, module );

        assert( script instanceof Scriptor.Script );
    } );

    it( 'should use provided module as parent', function() {
        assert.strictEqual( script.parent, module );
    } );

    it( 'should not be loaded', function() {
        assert( !script.loaded );
    } );

    it( 'should be watching a file', function() {
        assert( script.watched );
    } );

    it( 'should load the file upon calling it (lazy execution)', function() {
        script.exports();

        assert( script.loaded );
    } );

    it( 'should have exported the main function', function() {
        var script_exports = script.exports();

        assert.strictEqual( typeof script_exports, 'function' );
    } );

    it( 'should execute the main function', function() {
        var result = script.call();

        assert.strictEqual( result, 42 );
    } );

    describe( 'Script utility functions', function() {
        it( 'should be able to use AMD functions embedded in require and define', function(done) {
            assert.strictEqual( script.define.require, script.require );

            assert.strictEqual( typeof script.require.onError, 'function' );
            assert.strictEqual( typeof script.require.undef, 'function' );
            assert.strictEqual( typeof script.require.specified, 'function' );
            assert.strictEqual( typeof script.require.defined, 'function' );

            script.require.undef( 'meaning of life' );

            script.require( 'meaning of life', function() {
                assert( false, "undef should have removed this id" );
                done();

            }, function(err) {
                assert( err instanceof Error, "error given should be a standard Error object" );
                done();
            } );
        } );
    } );
} );
