/**
 * Created by Aaron on 7/5/2015.
 */

'use strict';

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _toConsumableArray = require( 'babel-runtime/helpers/to-consumable-array' )['default'];

var _Object$freeze = require( 'babel-runtime/core-js/object/freeze' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _events = require( 'events' );

var _util = require( 'util' );

var _util2 = _interopRequireDefault( _util );

function Enum( values ) {
    (0, _assert2['default'])( typeof values === 'object' && !Array.isArray( values ), 'Enum values must be an object' );

    var result = {};

    for( var it in values ) {
        if( values.hasOwnProperty( it ) ) {
            var value = values[it];

            result[it] = value;
            result[value] = it;
        }
    }

    return _Object$freeze( result );
}

var LogLevel = Enum( {
    LOG_ERROR:   -2,
    LOG_SILENT:  -1,
    LOG_WARN:    0,
    LOG_NORMAL:  0,
    LOG_INFO:    1,
    LOG_VERBOSE: 2
} );

exports.LogLevel = LogLevel;
function print_message( level, message ) {
}

var Logger = (function( _EventEmitter ) {
    _inherits( Logger, _EventEmitter );

    function Logger() {
        var level = arguments.length <= 0 || arguments[0] === undefined ? LogLevel.LOG_NORMAL : arguments[0];

        _classCallCheck( this, Logger );

        _get( Object.getPrototypeOf( Logger.prototype ), 'constructor', this ).call( this );

        this._level = null;
        this.level = level;
    }

    _createClass( Logger, [
        {
            key:   'error',
            value: function error( format ) {
                for( var _len = arguments.length, args = Array( _len > 1 ? _len - 1 : 0 ), _key = 1; _key < _len;
                     _key++ ) {
                    args[_key - 1] = arguments[_key];
                }

                this.do_log( LogLevel.LOG_ERROR, 'ERROR: ' + format, args );
            }
        }, {
            key:   'warn',
            value: function warn( format ) {
                for( var _len2 = arguments.length, args = Array( _len2 > 1 ? _len2 - 1 : 0 ), _key2 = 1; _key2 < _len2;
                     _key2++ ) {
                    args[_key2 - 1] = arguments[_key2];
                }

                this.do_log( LogLevel.LOG_WARN, 'WARNING: ' + format, args );
            }
        }, {
            key:   'log',
            value: function log( format ) {
                for( var _len3 = arguments.length, args = Array( _len3 > 1 ? _len3 - 1 : 0 ), _key3 = 1; _key3 < _len3;
                     _key3++ ) {
                    args[_key3 - 1] = arguments[_key3];
                }

                this.do_log( LogLevel.LOG_NORMAL, 'LOG: ' + format, args );
            }
        }, {
            key:   'info',
            value: function info( format ) {
                for( var _len4 = arguments.length, args = Array( _len4 > 1 ? _len4 - 1 : 0 ), _key4 = 1; _key4 < _len4;
                     _key4++ ) {
                    args[_key4 - 1] = arguments[_key4];
                }

                this.do_log( LogLevel.LOG_INFO, 'INFO: ' + format, args );
            }
        }, {
            key:   'verbose',
            value: function verbose( format ) {
                for( var _len5 = arguments.length, args = Array( _len5 > 1 ? _len5 - 1 : 0 ), _key5 = 1; _key5 < _len5;
                     _key5++ ) {
                    args[_key5 - 1] = arguments[_key5];
                }

                this.do_log( LogLevel.LOG_VERBOSE, 'VERBOSE: ' + format, args );
            }
        }, {
            key:   'do_log',
            value: function do_log( level, format, args ) {
                if( level <= this.level ) {
                    var message = _util2['default'].format.apply( _util2['default'],
                        [format].concat( _toConsumableArray( args ) ) );

                    if( level === LogLevel.LOG_ERROR ) {
                        console.error( message );
                    } else if( level === LogLevel.LOG_WARN ) {
                        console.warn( message );
                    } else {
                        console.log( message );
                    }

                    this.emit( LogLevel[level], message );
                }
            }
        }, {
            key: 'level',
            get: function get() {
                return this._level;
            },
            set: function set( value ) {
                value = Math.floor( value );

                (0, _assert2['default'])( !isNaN( value ), 'level must be a number' );

                this._level = value;
            }
        }
    ] );

    return Logger;
})( _events.EventEmitter );

exports.Logger = Logger;
