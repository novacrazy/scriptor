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
'use strict';

exports.__esModule = true;
exports.Logger     = exports.LogLevel = void 0;

var _classCallCheck2 = require( 'babel-runtime/helpers/classCallCheck' );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _createClass2 = require( 'babel-runtime/helpers/createClass' );

var _createClass3 = _interopRequireDefault( _createClass2 );

var _possibleConstructorReturn2 = require( 'babel-runtime/helpers/possibleConstructorReturn' );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( 'babel-runtime/helpers/inherits' );

var _inherits3 = _interopRequireDefault( _inherits2 );

var _freeze = require( 'babel-runtime/core-js/object/freeze' );

var _freeze2 = _interopRequireDefault( _freeze );

var _typeof2 = require( 'babel-runtime/helpers/typeof' );

var _typeof3 = _interopRequireDefault( _typeof2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _events = require( 'events' );

var _util = require( 'util' );

var _util2 = _interopRequireDefault( _util );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

function Enum( values ) {
    (0, _assert2.default)(
        (typeof values === 'undefined' ? 'undefined' : (0, _typeof3.default)( values )) === 'object' &&
        !Array.isArray( values ), 'Enum values must be an object' );

    var result = {};

    for( var it in values ) {
        if( values.hasOwnProperty( it ) ) {
            var value = values[it];

            result[it]    = value;
            result[value] = it;
        }
    }

    return (0, _freeze2.default)( result );
}
/**
 * Created by Aaron on 7/5/2015.
 */

var LogLevel = exports.LogLevel = Enum( {
    LOG_ERROR:   -2,
    LOG_SILENT:  -1,
    LOG_WARN:    0,
    LOG_NORMAL:  0,
    LOG_INFO:    1,
    LOG_VERBOSE: 2
} );

function print_message( level, message ) {
}

var Logger = exports.Logger = function( _EventEmitter ) {
    (0, _inherits3.default)( Logger, _EventEmitter );

    function Logger() {
        var level = arguments.length <= 0 || arguments[0] === void 0 ? LogLevel.LOG_NORMAL : arguments[0];
        (0, _classCallCheck3.default)( this, Logger );

        var _this = (0, _possibleConstructorReturn3.default)( this, _EventEmitter.call( this ) );

        _this._level = null;


        _this.level = level;
        return _this;
    }

    Logger.prototype.error = function error( format ) {
        for( var _len = arguments.length, args = Array( _len > 1 ? _len - 1 : 0 ), _key = 1; _key < _len; _key++ ) {
            args[_key - 1] = arguments[_key];
        }

        this.do_log( LogLevel.LOG_ERROR, 'ERROR: ' + format, args );
    };

    Logger.prototype.warn = function warn( format ) {
        for( var _len2 = arguments.length, args = Array( _len2 > 1 ? _len2 - 1 : 0 ), _key2 = 1; _key2 < _len2;
             _key2++ ) {
            args[_key2 - 1] = arguments[_key2];
        }

        this.do_log( LogLevel.LOG_WARN, 'WARNING: ' + format, args );
    };

    Logger.prototype.log = function log( format ) {
        for( var _len3 = arguments.length, args = Array( _len3 > 1 ? _len3 - 1 : 0 ), _key3 = 1; _key3 < _len3;
             _key3++ ) {
            args[_key3 - 1] = arguments[_key3];
        }

        this.do_log( LogLevel.LOG_NORMAL, 'LOG: ' + format, args );
    };

    Logger.prototype.info = function info( format ) {
        for( var _len4 = arguments.length, args = Array( _len4 > 1 ? _len4 - 1 : 0 ), _key4 = 1; _key4 < _len4;
             _key4++ ) {
            args[_key4 - 1] = arguments[_key4];
        }

        this.do_log( LogLevel.LOG_INFO, 'INFO: ' + format, args );
    };

    Logger.prototype.verbose = function verbose( format ) {
        for( var _len5 = arguments.length, args = Array( _len5 > 1 ? _len5 - 1 : 0 ), _key5 = 1; _key5 < _len5;
             _key5++ ) {
            args[_key5 - 1] = arguments[_key5];
        }

        this.do_log( LogLevel.LOG_VERBOSE, 'VERBOSE: ' + format, args );
    };

    Logger.prototype.do_log = function do_log( level, format, args ) {
        if( level <= this.level ) {
            var message = _util2.default.format.apply( _util2.default, [format].concat( args ) );

            if( level === LogLevel.LOG_ERROR ) {
                console.error( message );
            } else if( level === LogLevel.LOG_WARN ) {
                console.warn( message );
            } else {
                console.log( message );
            }

            this.emit( LogLevel[level], message );
        }
    };

    (0, _createClass3.default)( Logger, [{
        key: 'level',
        get: function get() {
            return this._level;
        },
        set: function set( value ) {
            value = Math.floor( value );

            (0, _assert2.default)( !isNaN( value ), 'level must be a number' );

            this._level = value;
        }
    }] );
    return Logger;
}( _events.EventEmitter );
