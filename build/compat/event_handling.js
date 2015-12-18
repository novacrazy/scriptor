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

Object.defineProperty( exports, "__esModule", {
    value: true
} );
exports.EventPropagator = void 0;
exports.makeEventPromise = makeEventPromise;
exports.makeMultiEventPromise = makeMultiEventPromise;

var _getIterator2 = require( 'babel-runtime/core-js/get-iterator' );

var _getIterator3 = _interopRequireDefault( _getIterator2 );

var _getPrototypeOf = require( 'babel-runtime/core-js/object/get-prototype-of' );

var _getPrototypeOf2 = _interopRequireDefault( _getPrototypeOf );

var _classCallCheck2 = require( 'babel-runtime/helpers/classCallCheck' );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _createClass2 = require( 'babel-runtime/helpers/createClass' );

var _createClass3 = _interopRequireDefault( _createClass2 );

var _possibleConstructorReturn2 = require( 'babel-runtime/helpers/possibleConstructorReturn' );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( 'babel-runtime/helpers/inherits' );

var _inherits3 = _interopRequireDefault( _inherits2 );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _events = require( 'events' );

var _lodash = require( 'lodash' );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

var EventPropagator = exports.EventPropagator = (function( _EventEmitter ) {
    (0, _inherits3.default)( EventPropagator, _EventEmitter );

    function EventPropagator() {
        var _Object$getPrototypeO;

        var _temp, _this, _ret;

        (0, _classCallCheck3.default)( this, EventPropagator );

        for( var _len = arguments.length, args = Array( _len ), _key = 0; _key < _len; _key++ ) {
            args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)( this,
            (_Object$getPrototypeO = (0, _getPrototypeOf2.default)( EventPropagator )).call.apply(
                _Object$getPrototypeO, [this].concat( args ) ) ), _this), _this._propagateEvents
            = false, _temp), (0, _possibleConstructorReturn3.default)( _this, _ret );
    }

    (0, _createClass3.default)( EventPropagator, [
        {
            key:   'propagateEvents',
            value: function propagateEvents() {
                var enable = arguments.length <= 0 || arguments[0] === void 0 ? true : arguments[0];

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
                    for( var _iterator = (0, _getIterator3.default)( listeners ), _step;
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
                        if( !_iteratorNormalCompletion && _iterator.return ) {
                            _iterator.return();
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
            key:   'isPropagatingTo',
            value: function isPropagatingTo( emitter, event ) {
                return emitter.isPropagatingFrom( this, event );
            }
        }, {
            key:   'propagateFrom',
            value: function propagateFrom( emitter, event, handler ) {
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
            }
        }, {
            key:   'propagateTo',
            value: function propagateTo( emitter, event, handler ) {
                emitter.propagateFrom( this, event, handler );
            }
        }, {
            key:   'isPropagatingEvents',
            value: function isPropagatingEvents() {
                return this._propagateEvents;
            }
        }
    ] );
    return EventPropagator;
})( _events.EventEmitter );
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
 * This is a more generic version of the above, but also costs more to run.
 * */
function makeMultiEventPromise( emitter, resolve_events, reject_events ) {
    return new _bluebird2.default( function( resolve, reject ) {
        function resolve_handler() {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;

            var _iteratorError2 = void 0;

            try {
                for( var _iterator2 = (0, _getIterator3.default)( reject_events ), _step2;
                     !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
                     _iteratorNormalCompletion2 = true ) {
                    var event = _step2.value;

                    emitter.removeListener( event, reject_handler );
                }
            } catch( err ) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion2 && _iterator2.return ) {
                        _iterator2.return();
                    }
                } finally {
                    if( _didIteratorError2 ) {
                        throw _iteratorError2;
                    }
                }
            }

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;

            var _iteratorError3 = void 0;

            try {
                for( var _iterator3 = (0, _getIterator3.default)( resolve_events ), _step3;
                     !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done);
                     _iteratorNormalCompletion3 = true ) {
                    var event = _step3.value;

                    emitter.removeListener( event, resolve_handler );
                }
            } catch( err ) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion3 && _iterator3.return ) {
                        _iterator3.return();
                    }
                } finally {
                    if( _didIteratorError3 ) {
                        throw _iteratorError3;
                    }
                }
            }

            resolve.apply( void 0, arguments );
        }

        function reject_handler() {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;

            var _iteratorError4 = void 0;

            try {
                for( var _iterator4 = (0, _getIterator3.default)( reject_events ), _step4;
                     !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done);
                     _iteratorNormalCompletion4 = true ) {
                    var event = _step4.value;

                    emitter.removeListener( event, reject_handler );
                }
            } catch( err ) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion4 && _iterator4.return ) {
                        _iterator4.return();
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
                for( var _iterator5 = (0, _getIterator3.default)( resolve_events ), _step5;
                     !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done);
                     _iteratorNormalCompletion5 = true ) {
                    var event = _step5.value;

                    emitter.removeListener( event, resolve_handler );
                }
            } catch( err ) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if( !_iteratorNormalCompletion5 && _iterator5.return ) {
                        _iterator5.return();
                    }
                } finally {
                    if( _didIteratorError5 ) {
                        throw _iteratorError5;
                    }
                }
            }

            reject.apply( void 0, arguments );
        }

        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;

        var _iteratorError6 = void 0;

        try {
            for( var _iterator6 = (0, _getIterator3.default)( resolve_events ), _step6;
                 !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done);
                 _iteratorNormalCompletion6 = true ) {
                var event = _step6.value;

                emitter.addListener( event, resolve_handler );
            }
        } catch( err ) {
            _didIteratorError6 = true;
            _iteratorError6 = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion6 && _iterator6.return ) {
                    _iterator6.return();
                }
            } finally {
                if( _didIteratorError6 ) {
                    throw _iteratorError6;
                }
            }
        }

        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;

        var _iteratorError7 = void 0;

        try {
            for( var _iterator7 = (0, _getIterator3.default)( reject_events ), _step7;
                 !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done);
                 _iteratorNormalCompletion7 = true ) {
                var event = _step7.value;

                emitter.addListener( event, reject_handler );
            }
        } catch( err ) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion7 && _iterator7.return ) {
                    _iterator7.return();
                }
            } finally {
                if( _didIteratorError7 ) {
                    throw _iteratorError7;
                }
            }
        }
    } );
}
