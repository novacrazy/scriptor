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

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _getIterator = require( 'babel-runtime/core-js/get-iterator' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

var _defaults = require( 'babel-runtime/helpers/defaults' )['default'];

var _interopRequireWildcard = require( 'babel-runtime/helpers/interop-require-wildcard' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );
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

        _get( Object.getPrototypeOf( EventPropagator.prototype ), 'constructor', this ).apply( this, arguments );

        this._propagateEvents = false;
    }

    _inherits( EventPropagator, _EventEmitter );

    _createClass( EventPropagator, [{
        key:   'propagateEvents',
        value: function propagateEvents() {
            var enable = arguments[0] === undefined ? true : arguments[0];

            this._propagateEvents = enable;
        }
    }, {
        key:   'isPropagatingFrom',
        value: function isPropagatingFrom( emitter, event ) {
            var listeners = emitter.listeners( event );

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;

            var _iteratorError = void 0;

            try {
                for( var _iterator = _getIterator( listeners ), _step;
                     !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
                     _iteratorNormalCompletion = true ) {
                    var listener = _step.value;

                    if( listener.__target__ === this ) {
                        return true;
                    }
                }
            } catch( err ) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion && _iterator['return'] ) {
                        _iterator['return']();
                    }
                } finally {
                    if( _didIteratorError ) {
                        throw _iteratorError;
                    }
                }
            }

            return false;
        }
    }, {
        key:   'propagateFrom',
        value: function propagateFrom( emitter, event, handler ) {
            var _this = this;

            if( this._propagateEvents && !this.isPropagatingFrom( emitter, event ) ) {
                var propagate = (0, _lodash.once)( function() {
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
        }
    }, {
        key:   'isPropagatingEvents',
        value: function isPropagatingEvents() {
            return this._propagateEvents;
        }
    }] );

    return EventPropagator;
})( _events.EventEmitter );

exports.EventPropagator = EventPropagator;

function makeEventPromise( emitter, resolve_event, reject_event ) {
    return new _bluebird2['default']( function( resolve, reject ) {
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
    return new _bluebird2['default']( function( resolve, reject ) {
        function resolve_handler() {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;

            var _iteratorError2 = void 0;

            try {
                for( var _iterator2 = _getIterator( reject_events ), _step2;
                     !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
                     _iteratorNormalCompletion2 = true ) {
                    var _event = _step2.value;

                    emitter.removeListener( _event, reject_handler );
                }
            } catch( err ) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion2 && _iterator2['return'] ) {
                        _iterator2['return']();
                    }
                } finally {
                    if( _didIteratorError2 ) {
                        throw _iteratorError2;
                    }
                }
            }

            resolve.apply( undefined, arguments );
        }

        function reject_handler() {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;

            var _iteratorError3 = void 0;

            try {
                for( var _iterator3 = _getIterator( resolve_events ), _step3;
                     !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done);
                     _iteratorNormalCompletion3 = true ) {
                    var _event2 = _step3.value;

                    emitter.removeListener( _event2, resolve_handler );
                }
            } catch( err ) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion3 && _iterator3['return'] ) {
                        _iterator3['return']();
                    }
                } finally {
                    if( _didIteratorError3 ) {
                        throw _iteratorError3;
                    }
                }
            }

            reject.apply( undefined, arguments );
        }

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;

        var _iteratorError4 = void 0;

        try {
            for( var _iterator4 = _getIterator( resolve_events ), _step4;
                 !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done);
                 _iteratorNormalCompletion4 = true ) {
                var _event3 = _step4.value;

                emitter.once( _event3, resolve_handler );
            }
        } catch( err ) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion4 && _iterator4['return'] ) {
                    _iterator4['return']();
                }
            } finally {
                if( _didIteratorError4 ) {
                    throw _iteratorError4;
                }
            }
        }

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;

        var _iteratorError5 = void 0;

        try {
            for( var _iterator5 = _getIterator( reject_events ), _step5;
                 !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done);
                 _iteratorNormalCompletion5 = true ) {
                var _event4 = _step5.value;

                emitter.once( _event4, reject_handler );
            }
        } catch( err ) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion5 && _iterator5['return'] ) {
                    _iterator5['return']();
                }
            } finally {
                if( _didIteratorError5 ) {
                    throw _iteratorError5;
                }
            }
        }
    } );
}
