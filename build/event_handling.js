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

exports.__esModule      = true;
exports.EventPropagator = void 0;

var _getIterator2 = require( 'babel-runtime/core-js/get-iterator' );

var _getIterator3 = _interopRequireDefault( _getIterator2 );

var _classCallCheck2 = require( 'babel-runtime/helpers/classCallCheck' );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _possibleConstructorReturn2 = require( 'babel-runtime/helpers/possibleConstructorReturn' );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( 'babel-runtime/helpers/inherits' );

var _inherits3 = _interopRequireDefault( _inherits2 );

exports.makeEventPromise      = makeEventPromise;
exports.makeMultiEventPromise = makeMultiEventPromise;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _events = require( 'events' );

var _lodash = require( 'lodash' );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/*
 * This is a modification of the EventEmitter class that allows it to automatically propagate certain events to
 * other specified event emitters/listeners. This is used to "bubble up" events from scripts.
 *
 * For example, if a depended upon script content changes on disk, then that script will be unloaded
 * and the 'change' event emitted, but because there are other scripts that depend on the changed script, that 'change'
 * event will propagate upwards into them and unload them as well. That way all scripts stay up to date.
 * */

var EventPropagator = exports.EventPropagator = function( _EventEmitter ) {
    (0, _inherits3.default)( EventPropagator, _EventEmitter );

    function EventPropagator() {
        var _temp, _this, _ret;

        (0, _classCallCheck3.default)( this, EventPropagator );

        for( var _len = arguments.length, args = Array( _len ), _key = 0; _key < _len; _key++ ) {
            args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)( this,
            _EventEmitter.call.apply( _EventEmitter, [this].concat( args ) ) ), _this), _this._propagateEvents =
            false, _temp), (0, _possibleConstructorReturn3.default)( _this, _ret );
    }

    EventPropagator.prototype.propagateEvents = function propagateEvents() {
        var enable = arguments.length <= 0 || arguments[0] === void 0 ? true : arguments[0];

        this._propagateEvents = enable;
    };

    EventPropagator.prototype.isPropagatingFrom = function isPropagatingFrom( emitter, event ) {
        var listeners = emitter.listeners( event );

        for( var _iterator = listeners, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ? _iterator :
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

            var listener = _ref;

            if( listener.__target__ === this ) {
                return true;
            }
        }

        return false;
    };

    EventPropagator.prototype.isPropagatingTo = function isPropagatingTo( emitter, event ) {
        return emitter.isPropagatingFrom( this, event );
    };

    EventPropagator.prototype.propagateFrom = function propagateFrom( emitter, event, handler ) {
        var _this2 = this;

        if( this._propagateEvents && !this.isPropagatingFrom( emitter, event ) ) {

            var propagate = (0, _lodash.once)( function() {
                if( !propagate._hasPropagated && _this2._propagateEvents ) {
                    handler.call( _this2 );
                    propagate._hasPropagated = true;
                }

                emitter.removeListener( event, propagate );
            } );

            propagate.__target__ = this;

            emitter.on( event, propagate );

            propagate._hasPropagated = false;
        }
    };

    //Reverse logic to make it easier to understand.


    EventPropagator.prototype.propagateTo = function propagateTo( emitter, event, handler ) {
        emitter.propagateFrom( this, event, handler );
    };

    EventPropagator.prototype.isPropagatingEvents = function isPropagatingEvents() {
        return this._propagateEvents;
    };

    return EventPropagator;
}( _events.EventEmitter );

/*
 * For a single pair of events, this will create a Promise that will resolve or reject when the associated event occurs.
 *
 * A good example is the 'end' event for resolving it, and the 'error' event for rejecting the Promise.
 *
 * This also cleans up after itself by removing the listeners once they have been triggered.
 * */
/**
 * Created by Aaron on 7/4/2015.
 */

function makeEventPromise( emitter, resolve_event, reject_event ) {
    return new _bluebird2.default( function( resolve, reject ) {
        function resolve_handler() {
            emitter.removeListener( reject_event, reject_handler );
            emitter.removeListener( resolve_event, resolve_handler );

            resolve.apply( void 0, arguments );
        }

        function reject_handler() {
            emitter.removeListener( resolve_event, resolve_handler );
            emitter.removeListener( reject_event, reject_handler );

            reject.apply( void 0, arguments );
        }

        emitter.addListener( resolve_event, resolve_handler );
        emitter.addListener( reject_event, reject_handler );
    } );
}

/*
 * This is a more generic version of the above,
 * but also costs more to run because it has to loop through all the provided events.
 * */
function makeMultiEventPromise( emitter, resolve_events, reject_events ) {
    return new _bluebird2.default( function( resolve, reject ) {
        function resolve_handler() {
            for( var _iterator2 = reject_events, _isArray2 = Array.isArray( _iterator2 ), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 :
                                                                                                                (0, _getIterator3.default)(
                                                                                                                    _iterator2 ); ; ) {
                var _ref2;

                if( _isArray2 ) {
                    if( _i2 >= _iterator2.length ) {
                        break;
                    }
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if( _i2.done ) {
                        break;
                    }
                    _ref2 = _i2.value;
                }

                var event = _ref2;

                emitter.removeListener( event, reject_handler );
            }

            for( var _iterator3 = resolve_events, _isArray3 = Array.isArray( _iterator3 ), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 :
                                                                                                                 (0, _getIterator3.default)(
                                                                                                                     _iterator3 ); ; ) {
                var _ref3;

                if( _isArray3 ) {
                    if( _i3 >= _iterator3.length ) {
                        break;
                    }
                    _ref3 = _iterator3[_i3++];
                } else {
                    _i3 = _iterator3.next();
                    if( _i3.done ) {
                        break;
                    }
                    _ref3 = _i3.value;
                }

                var _event = _ref3;

                emitter.removeListener( _event, resolve_handler );
            }

            resolve.apply( void 0, arguments );
        }

        function reject_handler() {
            for( var _iterator4 = reject_events, _isArray4 = Array.isArray( _iterator4 ), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 :
                                                                                                                (0, _getIterator3.default)(
                                                                                                                    _iterator4 ); ; ) {
                var _ref4;

                if( _isArray4 ) {
                    if( _i4 >= _iterator4.length ) {
                        break;
                    }
                    _ref4 = _iterator4[_i4++];
                } else {
                    _i4 = _iterator4.next();
                    if( _i4.done ) {
                        break;
                    }
                    _ref4 = _i4.value;
                }

                var event = _ref4;

                emitter.removeListener( event, reject_handler );
            }

            for( var _iterator5 = resolve_events, _isArray5 = Array.isArray( _iterator5 ), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 :
                                                                                                                 (0, _getIterator3.default)(
                                                                                                                     _iterator5 ); ; ) {
                var _ref5;

                if( _isArray5 ) {
                    if( _i5 >= _iterator5.length ) {
                        break;
                    }
                    _ref5 = _iterator5[_i5++];
                } else {
                    _i5 = _iterator5.next();
                    if( _i5.done ) {
                        break;
                    }
                    _ref5 = _i5.value;
                }

                var _event2 = _ref5;

                emitter.removeListener( _event2, resolve_handler );
            }

            reject.apply( void 0, arguments );
        }

        for( var _iterator6 = resolve_events, _isArray6 = Array.isArray( _iterator6 ), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 :
                                                                                                             (0, _getIterator3.default)(
                                                                                                                 _iterator6 ); ; ) {
            var _ref6;

            if( _isArray6 ) {
                if( _i6 >= _iterator6.length ) {
                    break;
                }
                _ref6 = _iterator6[_i6++];
            } else {
                _i6 = _iterator6.next();
                if( _i6.done ) {
                    break;
                }
                _ref6 = _i6.value;
            }

            var event = _ref6;

            emitter.addListener( event, resolve_handler );
        }

        for( var _iterator7 = reject_events, _isArray7 = Array.isArray( _iterator7 ), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 :
                                                                                                            (0, _getIterator3.default)(
                                                                                                                _iterator7 ); ; ) {
            var _ref7;

            if( _isArray7 ) {
                if( _i7 >= _iterator7.length ) {
                    break;
                }
                _ref7 = _iterator7[_i7++];
            } else {
                _i7 = _iterator7.next();
                if( _i7.done ) {
                    break;
                }
                _ref7 = _i7.value;
            }

            var _event3 = _ref7;

            emitter.addListener( _event3, reject_handler );
        }
    } );
}
