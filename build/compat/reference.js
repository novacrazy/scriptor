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
 * Created by Aaron on 7/5/2015.
 */

'use strict';

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _Object$freeze = require( 'babel-runtime/core-js/object/freeze' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );
exports.identity = identity;

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _events = require( './events' );

var _utilsJs = require( './utils.js' );

function identity( left, right ) {
    (0, _assert2['default'])( left instanceof ReferenceBase,
                              'Cannot pass non-Reference to reference identity function.' );

    return left.value();
}

var ReferenceBase = (function( _EventEmitter ) {
    function ReferenceBase() {
        _classCallCheck( this, ReferenceBase );

        _get( Object.getPrototypeOf( ReferenceBase.prototype ), 'constructor', this ).apply( this, arguments );

        this._onChange = null;
        this._value = void 0;
        this._ran = false;
        this._running = false;
        this._closed = false;
        this._left = void 0;
        this._right = void 0;
    }

    _inherits( ReferenceBase, _EventEmitter );

    _createClass( ReferenceBase, [{
        key:   '_run',
        value: function _run() {
            this.emit( 'value_error', new Error( 'Cannot get value from ReferenceBase' ) );
        }
    }, {
        key:   'value',
        value: function value() {
            if( this._ran ) {
                return _bluebird2['default'].resolve( this._value );
            } else if( !this._closed ) {
                var waiting = (0, _events.makeEventPromise)( this, 'value', 'value_error' );

                this._run();

                return waiting;
            } else {
                return _bluebird2['default'].reject( 'Reference closed.' );
            }
        }
    }, {
        key:   'join',
        value: function join( ref, transform ) {
            return new JoinedTransformReference( this, ref, transform );
        }
    }, {
        key:   'transform',
        value: function transform( _transform2 ) {
            return new TransformReference( this, _transform2 );
        }
    }, {
        key:   'left',
        value: function left() {
            return this._left;
        }
    }, {
        key:   'right',
        value: function right() {
            return this._right;
        }
    }, {
        key:   'close',
        value: function close() {
            if( this._running ) {
                this.emit( 'value_error', new Error( 'Reference closed' ) );
            }

            this._running = false;
            this._ran = false;

            delete this['_left'];
            delete this['_right'];
            delete this['_value'];

            this._closed = true;
        }
    }, {
        key: 'ran',
        get: function get() {
            return this._ran;
        }
    }, {
        key: 'running',
        get: function get() {
            return this._running;
        }
    }, {
        key: 'closed',
        get: function get() {
            return this._closed;
        }
    }] );

    return ReferenceBase;
})( _events.EventEmitter );

var Reference = (function( _ReferenceBase ) {
    function Reference( script, args ) {
        var _this = this;

        _classCallCheck( this, Reference );

        _get( Object.getPrototypeOf( Reference.prototype ), 'constructor', this ).call( this );

        this._args = [];
        this._script = script;
        this._args = args;

        //Just mark this reference as not ran when a change occurs
        //other things are free to reference this script and evaluate it,
        //but this reference would still not be run
        this._onChange = function( event, filename ) {
            _this.emit( 'change', event, filename );

            _this._ran = false;
        };

        script.on( 'change', this._onChange );
    }

    _inherits( Reference, _ReferenceBase );

    _createClass( Reference, [{
        key:   '_run',
        value: function _run() {
            var _this2 = this;

            if( !this._running ) {
                this._running = true;

                this._script.apply( this._args ).then( function( value ) {
                    if( _this2._running ) {
                        if( typeof value === 'object' ) {
                            _this2._value = _lodash2['default'].clone( value );

                            _Object$freeze( _this2._value );
                        } else {
                            _this2._value = value;
                        }

                        _this2._ran = true;
                        _this2._running = false;

                        _this2.emit( 'value', _this2._value );
                    }
                } )['catch']( function( err ) {
                    _this2._running = false;

                    _this2.emit( 'value_error', err );
                } );
            }
        }
    }, {
        key:   'close',
        value: function close() {
            if( !this._closed ) {
                this._script.removeListener( 'change', this._onChange );

                delete this['_args'];
                delete this['_script']; //Doesn't really delete or close it, just removes it from this

                _get( Object.getPrototypeOf( Reference.prototype ), 'close', this ).call( this );
            }
        }
    }], [{
        key:   'join',
        value: function join( left, right, transform ) {
            return new JoinedTransformReference( left, right, transform );
        }
    }, {
        key:   'resolve',
        value: function resolve( value ) {
            if( value instanceof ReferenceBase ) {
                return value;
            } else {
                return new ResolvedReference( value );
            }
        }
    }, {
        key: 'join_all',

        //Creates a binary tree (essentially) of joins from an array of References using a single transform
        value: function join_all( refs, transform ) {
            (0, _assert2['default'])( Array.isArray( refs ), 'join_all can only join arrays of References' );

            if( refs.length === 0 ) {
                return null;
            } else if( refs.length === 1 ) {
                return refs[0];
            } else if( refs.length === 2 ) {
                return Reference.join( refs[0], refs[1], transform );
            } else {
                var mid = Math.floor( refs.length / 2 );

                var left = Reference.join_all( refs.slice( 0, mid ), transform );
                var right = Reference.join_all( refs.slice( mid ), transform );

                return Reference.join( left, right, transform );
            }
        }
    }, {
        key:   'transform',
        value: function transform( ref, _transform3 ) {
            return new TransformReference( ref, _transform3 );
        }
    }] );

    return Reference;
})( ReferenceBase );

exports['default'] = Reference;

var TransformReference = (function( _ReferenceBase2 ) {
    function TransformReference( ref ) {
        var _this3 = this;

        var transform = arguments[1] === undefined ? identity : arguments[1];

        _classCallCheck( this, TransformReference );

        _get( Object.getPrototypeOf( TransformReference.prototype ), 'constructor', this ).call( this );

        this._ref = null;
        this._transform = null;
        (0, _assert2['default'])( ref instanceof ReferenceBase, 'transform will only work on References' );
        _assert2['default'].strictEqual( typeof transform, 'function', 'transform function must be a function' );

        this._left = this._ref = ref;

        if( (0, _utilsJs.isGeneratorFunction)( transform ) ) {
            this._transform = (0, _utilsJs.makeCoroutine)( transform );
        } else {
            this._transform = transform;
        }

        this._onChange = function( event, filename ) {
            _this3.emit( 'change', event, filename );

            _this3._ran = false;
        };

        ref.on( 'change', this._onChange );
    }

    _inherits( TransformReference, _ReferenceBase2 );

    _createClass( TransformReference, [{
        key:   '_run',
        value: function _run() {
            var _this4 = this;

            if( !this._running ) {
                this._running = true;

                (0, _utilsJs.tryReject)( this._transform, null, this._ref, null ).then( function( value ) {
                    if( _this4._running ) {
                        if( typeof value === 'object' ) {
                            _this4._value = _lodash2['default'].clone( value );

                            _Object$freeze( _this4._value );
                        } else {
                            _this4._value = value;
                        }

                        _this4._ran = true;
                        _this4._running = false;

                        _this4.emit( 'value', _this4._value );
                    }
                } )['catch']( function( err ) {
                    _this4._running = false;

                    _this4.emit( 'value_error', err );
                } );
            }
        }
    }, {
        key:   'close',
        value: function close() {
            var recursive = arguments[0] === undefined ? false : arguments[0];

            if( !this._closed ) {
                this._ref.removeListener( 'change', this._onChange );

                if( recursive ) {
                    this._ref.close( recursive );
                }

                delete this['_ref'];

                _get( Object.getPrototypeOf( TransformReference.prototype ), 'close', this ).call( this );
            }
        }
    }] );

    return TransformReference;
})( ReferenceBase );

var JoinedTransformReference = (function( _ReferenceBase3 ) {
    function JoinedTransformReference( left, right ) {
        var _this5 = this;

        var transform = arguments[2] === undefined ? identity : arguments[2];

        _classCallCheck( this, JoinedTransformReference );

        _get( Object.getPrototypeOf( JoinedTransformReference.prototype ), 'constructor', this ).call( this );

        (0, _assert2['default'])( left instanceof ReferenceBase && right instanceof ReferenceBase,
                                  'join will only work on References' );
        _assert2['default'].notEqual( left, right, 'Cannot join to self' );
        _assert2['default'].strictEqual( typeof transform, 'function', 'transform function must be a function' );

        this._left = left;
        this._right = right;

        if( (0, _utilsJs.isGeneratorFunction)( transform ) ) {
            this._transform = (0, _utilsJs.makeCoroutine)( transform );
        } else {
            this._transform = transform;
        }

        this._onChange = function( event, filename ) {
            _this5.emit( 'change', event, filename );

            _this5._ran = false;
        };

        left.on( 'change', this._onChange );
        right.on( 'change', this._onChange );
    }

    _inherits( JoinedTransformReference, _ReferenceBase3 );

    _createClass( JoinedTransformReference, [{
        key:   '_run',
        value: function _run() {
            var _this6 = this;

            if( !this._running ) {
                this._running = true;

                (0, _utilsJs.tryReject)( this._transform, null, this._left, this._right ).then( function( value ) {
                    if( _this6._running ) {
                        if( typeof value === 'object' ) {
                            _this6._value = _lodash2['default'].clone( value );

                            _Object$freeze( _this6._value );
                        } else {
                            _this6._value = value;
                        }

                        _this6._ran = true;
                        _this6._running = false;

                        _this6.emit( 'value', _this6._value );
                    }
                } )['catch']( function( err ) {
                    _this6._running = false;

                    _this6.emit( 'value_error', err );
                } );
            }
        }
    }, {
        key:   'close',
        value: function close() {
            var recursive = arguments[0] === undefined ? false : arguments[0];

            if( !this._closed ) {
                this._left.removeListener( 'change', this._onChange );
                this._right.removeListener( 'change', this._onChange );

                if( recursive ) {
                    this._left.close( recursive );
                    this._right.close( recursive );
                }

                _get( Object.getPrototypeOf( JoinedTransformReference.prototype ), 'close', this ).call( this );
            }
        }
    }] );

    return JoinedTransformReference;
})( ReferenceBase );

var ResolvedReference = (function( _ReferenceBase4 ) {
    function ResolvedReference( value ) {
        _classCallCheck( this, ResolvedReference );

        _get( Object.getPrototypeOf( ResolvedReference.prototype ), 'constructor', this ).call( this );

        this._value = value;

        this._run();
    }

    _inherits( ResolvedReference, _ReferenceBase4 );

    _createClass( ResolvedReference, [{
        key:   '_run',
        value: function _run() {
            var _this7 = this;

            if( !this._running ) {
                this._running = true;

                (0, _utilsJs.tryPromise)( this._value ).then( function( result ) {
                    if( _this7._running ) {
                        if( typeof result === 'object' ) {
                            _this7._value = _Object$freeze( result );
                        } else {
                            _this7._value = result;
                        }

                        _this7._ran = true;
                        _this7._running = false;

                        _this7.emit( 'value', _this7._value );
                    }
                } )['catch']( function( err ) {
                    _this7._running = false;

                    _this7.emit( 'value_error', err );
                } );
            }
        }
    }] );

    return ResolvedReference;
})( ReferenceBase );
