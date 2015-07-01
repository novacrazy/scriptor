/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aaron Trent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ****/
"use strict";
/**
 * Created by novacrazy on 2/11/2015.
 */
var __extends = this.__extends || function( d, b ) {
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
var util = require( 'util' );
var events = require( 'events' );
var ScriptorCLI;
(function( ScriptorCLI ) {
    (function( LogLevel ) {
        LogLevel[LogLevel["LOG_ERROR"] = -2] = "LOG_ERROR";
        LogLevel[LogLevel["LOG_WARN"] = 0] = "LOG_WARN";
        LogLevel[LogLevel["LOG_SILENT"] = -1] = "LOG_SILENT";
        LogLevel[LogLevel["LOG_NORMAL"] = 0] = "LOG_NORMAL";
        LogLevel[LogLevel["LOG_INFO"] = 1] = "LOG_INFO";
        LogLevel[LogLevel["LOG_VERBOSE"] = 2] = "LOG_VERBOSE";
    })( ScriptorCLI.LogLevel || (ScriptorCLI.LogLevel = {}) );
    var LogLevel = ScriptorCLI.LogLevel;
    var Logger = (function( _super ) {
        __extends( Logger, _super );
        function Logger( _level ) {
            _super.call( this );
            this._level = _level;
        }

        Object.defineProperty( Logger.prototype, "level", {
            get:          function() {
                return this._level;
            },
            enumerable:   true,
            configurable: true
        } );
        Logger.prototype.error = function( format ) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            this.do_log( LogLevel.LOG_ERROR, 'ERROR: ' + format, args );
        };
        Logger.prototype.warn = function( format ) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            this.do_log( LogLevel.LOG_WARN, 'WARNING: ' + format, args );
        };
        Logger.prototype.log = function( format ) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            this.do_log( LogLevel.LOG_NORMAL, 'LOG: ' + format, args );
        };
        Logger.prototype.info = function( format ) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            this.do_log( LogLevel.LOG_INFO, 'INFO: ' + format, args );
        };
        Logger.prototype.verbose = function( format ) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            this.do_log( LogLevel.LOG_VERBOSE, 'VERBOSE: ' + format, args );
        };
        Logger.prototype.do_log = function( level, format, args ) {
            if( level <= this.level ) {
                args.unshift( format );
                var message = util.format.apply( null, args );
                print_message( level, message );
                this.emit( LogLevel[level], message );
            }
        };
        return Logger;
    })( events.EventEmitter );
    ScriptorCLI.Logger = Logger;
    function print_message( level, message ) {
        switch( level ) {
            case LogLevel.LOG_ERROR:
                return console.error( message );
            case LogLevel.LOG_WARN:
                return console.warn( message );
            default:
                return console.log( message );
        }
    }

    ScriptorCLI.print_message = print_message;
})( ScriptorCLI || (ScriptorCLI = {}) );
module.exports = ScriptorCLI;
