/**
 * Created by novacrazy on 8/9/14.
 */
var __extends = this.__extends || function(d, b) {
    for( var p in b ) {
        if( b.hasOwnProperty( p ) ) {
            d[p] = b[p];
        }
    }
    function __() {
        this.constructor = d;
    }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../reference.ts" />
var events = require( 'events' );

var fs = require( 'fs' );
var path = require( 'path' );

var Module = require( './Module' );
var AMD = require( './define' );

var Scriptor;
(function(Scriptor) {
    var ScriptManager = (function(_super) {
        __extends( ScriptManager, _super );
        function ScriptManager(superParent) {
            _super.call( this );
            this.scripts = {};
            this.watchers = {};

            this.parent = new Module.Module( 'ScriptManager', superParent );
        }

        ScriptManager.prototype.addScript = function(filename) {
            var _this = this;
            //Some type erasure here to force cast Module.IModule into IScriptModule
            var script = (new Module.Module( path.basename( filename ), this.parent ));

            this.loadScript( script, filename );

            this.scripts[filename] = script;

            /*
             * The process should not be kept open just because it's watching a file
             * */
            var watcher = fs.watch( filename, {
                persistent: false
            } );

            this.watchers[filename] = watcher;

            //This is agnostic to the filename changes
            watcher.addListener( 'change', function(event, filename) {
                _this.loadScript( script, filename );
            } );

            var old_filename = filename;

            watcher.addListener( 'rename', function(event, new_filename) {
                _this.loadScript( script, new_filename );

                _this.scripts[new_filename] = _this.scripts[old_filename];
                delete _this.scripts[old_filename];

                _this.watchers[new_filename] = _this.watchers[old_filename];
                delete _this.watchers[old_filename];

                old_filename = new_filename;
            } );

            return script;
        };

        ScriptManager.prototype.loadScript = function(script, filename) {
            script.loaded = false;

            script.imports = this.imports;
            script.define = AMD.amdefine( script );

            script.load( filename != null ? filename : script.filename );

            return script;
        };

        ScriptManager.prototype.runScript = function(filename) {
            var parameters = [];
            for( var _i = 0; _i < (arguments.length - 1); _i++ ) {
                parameters[_i] = arguments[_i + 1];
            }
            filename = path.resolve( filename );

            var script = this.scripts[filename];

            if( script == null ) {
                script = this.addScript( filename );
            }

            if( typeof script.exports === 'function' ) {
                return script.exports.apply( null, parameters );
            } else {
                throw new Error( 'No main function found in script ' + filename );
            }
        };

        ScriptManager.prototype.preloadScript = function(filename) {
            filename = path.resolve( filename );

            var script = this.scripts[filename];

            if( script == null ) {
                this.addScript( filename );
            }
        };

        ScriptManager.prototype.reloadScript = function(filename) {
            var watcher = this.watchers[filename];

            if( watcher != null ) {
                watcher.emit( 'change', 'change', filename );
            } else {
                this.addScript( filename );
            }
        };

        ScriptManager.prototype.clear = function() {
            for( var it in this.watchers ) {
                if( this.watchers.hasOwnProperty( it ) ) {
                    this.watchers[it].close();
                }
            }

            this.watchers = {};
            this.scripts = {};
        };
        return ScriptManager;
    })( events.EventEmitter );
    Scriptor.ScriptManager = ScriptManager;
})( Scriptor || (Scriptor = {}) );

module.exports = Scriptor;
