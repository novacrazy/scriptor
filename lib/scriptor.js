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
var vm = require( 'vm' );
var fs = require( 'fs' );
var path = require( 'path' );

var Injector = require( './injector' );
var Utility = require( './utility' );

/*
 * Overview of how this is supposed to work:
 *
 * Type T is extended from IBaseScriptContext
 *   T is what the function is exposed to when compiled and run
 *
 *
 * */
var Scriptor;
(function(Scriptor) {
    Scriptor.DefaultScriptManagerOptions = {
        useGlobal:   true,
        useInjector: true,
        useVM:       true
    };

    var ScriptManager = (function(_super) {
        __extends( ScriptManager, _super );
        function ScriptManager(options) {
            _super.call( this );

            this.options = Utility.defaults( options || {}, Scriptor.DefaultScriptManagerOptions );
        }

        ScriptManager.prototype.createNewContext = function(filename) {
        };

        ScriptManager.prototype._vmCompile = function(source, filename) {
            var context = this.createNewContext( filename );

            try {
                vm.runInContext( source, context, filename );
            } catch( e ) {
                this.emit( 'error', e );
            } finally {
                return context.exports;
            }
        };

        ScriptManager.prototype._functionCompile = function(source, filename) {
            var context = this.createNewContext( filename );

            var keys = Object.keys( context );

            var func, result;

            try {
                func = new Function( keys, source );

                var values = Array( keys.length );

                for( var i = 0, ii = values.length; i < ii; i++ ) {
                    values[i] = context[keys[i]];
                }

                func.apply( null, values );
            } catch( e ) {
                this.emit( 'error', e );
            } finally {
                return context.exports;
            }
        };

        ScriptManager.prototype._doCompile = function(source, filename) {
            var scriptOut;

            if( this.options.useVM ) {
                scriptOut = this._vmCompile( source, filename );
            } else {
                scriptOut = this._functionCompile( source, filename );
            }

            if( typeof scriptOut === 'function' ) {
            }
        };

        ScriptManager.prototype._addInjector = function(exportedScript) {
            return Injector.Create( exportedScript );
        };

        ScriptManager.prototype._updateScript = function(event, filename) {
            this._doLoadScript( filename, this._doCompile.bind( this ) );
        };

        ScriptManager.prototype._doLoadScript = function(filename, cb) {
            var _this = this;
            fs.readFile( filename, 'utf8', function(err, content) {
                if( err ) {
                    _this.emit( 'error', err );
                } else {
                    if( !_this.watchers[filename] ) {
                        _this.watchers[filename] =
                        fs.watch( filename, { persistent: false }, _this._updateScript.bind( _this ) );
                    }

                    cb( content );
                }
            } );
        };

        ScriptManager.prototype.runScript = function(filename, parameters) {
            filename = path.resolve( filename );

            var script = this.scripts[filename];

            if( script != null ) {
                if( typeof script === 'function' ) {
                    return script.call( null, parameters );
                } else {
                    return script;
                }
            } else {
                this._doLoadScript( filename, function() {
                } );
            }
        };
        return ScriptManager;
    })( events.EventEmitter );
    Scriptor.ScriptManager = ScriptManager;
})( Scriptor || (Scriptor = {}) );

module.exports = Scriptor;
