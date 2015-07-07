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
/**
 * Created by Aaron on 7/4/2015.
 */

'use strict';

var _inherits = require( 'babel-runtime/helpers/inherits' ).default;

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' ).default;

var _getIterator = require( 'babel-runtime/core-js/get-iterator' ).default;

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _defaults = require( 'babel-runtime/helpers/defaults' ).default;

var _interopRequireWildcard = require( 'babel-runtime/helpers/interop-require-wildcard' ).default;

exports.__esModule = true;
exports.makeEventPromise = makeEventPromise;
exports.makeMultiEventPromise = makeMultiEventPromise;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _events = require( 'events' );

var _lodash = require( 'lodash' );

_defaults( exports, _interopRequireWildcard( _events ) );

var EventPropagator = (function( _EventEmitter ) {
    function EventPropagator() {
        _classCallCheck( this, EventPropagator );

        _EventEmitter.apply( this, arguments );

        this._propagateEvents = false;
    }

    _inherits( EventPropagator, _EventEmitter );

    EventPropagator.prototype.propagateEvents = function propagateEvents() {
        var enable = arguments[0] === undefined ? true : arguments[0];

        this._propagateEvents = enable;
    };

    EventPropagator.prototype.isPropagatingFrom = function isPropagatingFrom( emitter, event ) {
        var listeners = emitter.listeners( events );

        for( var _iterator = listeners, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ?
                                                                                                   _iterator :
                                                                                                   _getIterator( _iterator ); ; ) {
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

    EventPropagator.prototype.propagateFrom = function propagateFrom( emitter, event, handler ) {
        var _this = this;

        if( this._propagateEvents && !this.isPropagatingFrom( emitter, event ) ) {
            var propagate = _.once( function() {
                if( !propagate._hasPropagated && _this._propagateEvents ) {
                    handler.call( _this );
                    propagate._hasPropagated = true;
                }

                emitter.removeListener( event, propagate );
            } );

            propagate.__target__ = target;

            emitter.on( event, propagate );

            propagate._hasPropagated = false;
        }
    };

    EventPropagator.prototype.isPropagatingEvents = function isPropagatingEvents() {
        return this._propagateEvents;
    };

    return EventPropagator;
})( _events.EventEmitter );

exports.EventPropagator = EventPropagator;

function makeEventPromise( emitter, resolve_event, reject_event ) {
    return new _bluebird2.default( function( resolve, reject ) {
        function resolve_handler() {
            emitter.removeListener( reject_event, reject_handler );
            resolve.apply( undefined, arguments );
        }

        function reject_handler() {
            emitter.removeListener( resolve_event, resolve_handler );
            reject.apply( undefined, arguments );
        }

        emitter.once( resolve_event, resolve_handler );
        emitter.once( reject_event, reject_handler );
    } );
}

/*
 * This is a more generic version of the above, but also costs more to run.
 * */

function makeMultiEventPromise( emitter, resolve_events, reject_events ) {
    return new _bluebird2.default( function( resolve, reject ) {
        function resolve_handler() {
            for( var _iterator2 = reject_events, _isArray2 = Array.isArray( _iterator2 ), _i2 = 0, _iterator2 = _isArray2 ?
                                                                                                                _iterator2 :
                                                                                                                _getIterator( _iterator2 ); ; ) {
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

                var _event = _ref2;

                emitter.removeListener( _event, reject_handler );
            }

            resolve.apply( undefined, arguments );
        }

        function reject_handler() {
            for( var _iterator3 = resolve_events, _isArray3 = Array.isArray( _iterator3 ), _i3 = 0, _iterator3 = _isArray3 ?
                                                                                                                 _iterator3 :
                                                                                                                 _getIterator( _iterator3 ); ; ) {
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

                var _event2 = _ref3;

                emitter.removeListener( _event2, resolve_handler );
            }

            reject.apply( undefined, arguments );
        }

        for( var _iterator4 = resolve_events, _isArray4 = Array.isArray( _iterator4 ), _i4 = 0, _iterator4 = _isArray4 ?
                                                                                                             _iterator4 :
                                                                                                             _getIterator( _iterator4 ); ; ) {
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

            var _event3 = _ref4;

            emitter.once( _event3, resolve_handler );
        }

        for( var _iterator5 = reject_events, _isArray5 = Array.isArray( _iterator5 ), _i5 = 0, _iterator5 = _isArray5 ?
                                                                                                            _iterator5 :
                                                                                                            _getIterator( _iterator5 ); ; ) {
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

            var _event4 = _ref5;

            emitter.once( _event4, reject_handler );
        }
    } );
}
