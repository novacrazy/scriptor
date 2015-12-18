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
exports.ReferenceBase = void 0;
exports.identity = identity;

var _freeze = require( 'babel-runtime/core-js/object/freeze' );

var _freeze2 = _interopRequireDefault( _freeze );

var _typeof2 = require( 'babel-runtime/helpers/typeof' );

var _typeof3 = _interopRequireDefault( _typeof2 );

var _classCallCheck2 = require( 'babel-runtime/helpers/classCallCheck' );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _createClass2 = require( 'babel-runtime/helpers/createClass' );

var _createClass3 = _interopRequireDefault( _createClass2 );

var _possibleConstructorReturn2 = require( 'babel-runtime/helpers/possibleConstructorReturn' );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( 'babel-runtime/helpers/inherits' );

var _inherits3 = _interopRequireDefault( _inherits2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _ = _interopRequireWildcard( _lodash );

var _events = require( 'events' );

var _event_handling = require( './event_handling.js' );

var _utils = require( './utils.js' );

function _interopRequireWildcard( obj ) {
    if( obj && obj.__esModule ) {
        return obj;
    } else {
        var newObj = {};
        if( obj != null ) {
            for( var key in obj ) {
                if( Object.prototype.hasOwnProperty.call( obj, key ) ) {
                    newObj[key] = obj[key];
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 7/5/2015.
 */

function identity( left, right ) {
    (0, _assert2.default)( left instanceof ReferenceBase, 'Cannot pass non-Reference to reference identity function.' );

    return left.value();
}

var ReferenceBase = (function( _EventEmitter ) {
    (0, _inherits3.default)( ReferenceBase, _EventEmitter );

    function ReferenceBase() {
        var _temp, _this, _ret;

        (0, _classCallCheck3.default)( this, ReferenceBase );

        for( var _len = arguments.length, args = Array( _len ), _key = 0; _key < _len; _key++ ) {
            args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)( this,
            _EventEmitter.call.apply( _EventEmitter, [this].concat( args ) ) ), _this), _this._onChange
            = null, _this._value = void 0, _this._ran = false, _this._running = false, _this._closed
            = false, _this._left = void 0, _this._right = void 0, _temp), (0, _possibleConstructorReturn3.default)(
            _this, _ret );
    }

    ReferenceBase.prototype._run = function _run() {
        this.emit( 'error', new Error( 'Cannot get value from ReferenceBase' ) );
    };

    ReferenceBase.prototype.value = function value() {
        if( this._ran ) {
            return _bluebird2.default.resolve( this._value );
        } else if( !this._closed ) {
            var waiting = (0, _event_handling.makeEventPromise)( this, 'value', 'error' );

            this._run();

            return waiting;
        } else {
            return _bluebird2.default.reject( 'Reference closed.' );
        }
    };

    ReferenceBase.prototype.join = function join( ref, transform ) {
        return new JoinedTransformReference( this, ref, transform );
    };

    ReferenceBase.prototype.transform = function transform( _transform ) {
        return new TransformReference( this, _transform );
    };

    ReferenceBase.prototype.left = function left() {
        return this._left;
    };

    ReferenceBase.prototype.right = function right() {
        return this._right;
    };

    ReferenceBase.prototype.close = function close() {
        if( this._running ) {
            this.emit( 'error', new Error( 'Reference closed' ) );
        }

        this._running = false;
        this._ran = false;

        delete this['_left'];
        delete this['_right'];
        delete this['_value'];

        this._closed = true;
    };

    (0, _createClass3.default)( ReferenceBase, [
        {
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
        }
    ] );
    return ReferenceBase;
})( _events.EventEmitter );

exports.ReferenceBase = ReferenceBase;

var Reference = (function( _ReferenceBase ) {
    (0, _inherits3.default)( Reference, _ReferenceBase );

    function Reference( script, args ) {
        (0, _classCallCheck3.default)( this, Reference );

        var _this2 = (0, _possibleConstructorReturn3.default)( this, _ReferenceBase.call( this ) );

        _this2._args = [];

        _this2._script = script;
        _this2._args = args;

        //Just mark this reference as not ran when a change occurs
        //other things are free to reference this script and evaluate it,
        //but this reference would still not be run
        _this2._onChange = function( event, filename ) {
            _this2.emit( 'change', event, filename );

            _this2._ran = false;
        };

        script.addListener( 'change', _this2._onChange );
        return _this2;
    }

    Reference.prototype._run = function _run() {
        var _this3 = this;

        if( !this._running ) {
            this._running = true;

            this._script.apply( this._args ).then( function( value ) {
                if( _this3._running ) {
                    if( (typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)( value )) === 'object' ) {
                        _this3._value = _.clone( value );

                        (0, _freeze2.default)( _this3._value );
                    } else {
                        _this3._value = value;
                    }

                    _this3._ran = true;
                    _this3._running = false;

                    _this3.emit( 'value', _this3._value );
                } else {
                    _this3.emit( 'error',
                        new Error( 'Reference was reset while performing an asynchronous operation.' ) );
                }
            } ).catch( function( err ) {
                _this3._running = false;

                _this3.emit( 'error', err );
            } );
        }
    };

    Reference.prototype.close = function close() {
        if( !this._closed ) {
            this._script.removeListener( 'change', this._onChange );

            delete this['_args'];
            delete this['_script']; //Doesn't really delete or close it, just removes it from this

            _ReferenceBase.prototype.close.call( this );
        }
    };

    Reference.join = function join( left, right, transform ) {
        return new JoinedTransformReference( left, right, transform );
    };

    Reference.resolve = function resolve( value ) {
        if( value instanceof ReferenceBase ) {
            return value;
        } else {
            return new ResolvedReference( value );
        }
    };

    //Creates a binary tree (essentially) of joins from an array of References using a single transform

    Reference.join_all = function join_all( refs, transform ) {
        (0, _assert2.default)( Array.isArray( refs ), 'join_all can only join arrays of References' );

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
    };

    Reference.transform = function transform( ref, _transform2 ) {
        return new TransformReference( ref, _transform2 );
    };

    return Reference;
})( ReferenceBase );

exports.default = Reference;

var TransformReference = (function( _ReferenceBase2 ) {
    (0, _inherits3.default)( TransformReference, _ReferenceBase2 );

    function TransformReference( ref ) {
        var transform = arguments.length <= 1 || arguments[1] === void 0 ? identity : arguments[1];
        (0, _classCallCheck3.default)( this, TransformReference );

        var _this4 = (0, _possibleConstructorReturn3.default)( this, _ReferenceBase2.call( this ) );

        _this4._ref = null;
        _this4._transform = null;

        (0, _assert2.default)( ref instanceof ReferenceBase, 'transform will only work on References' );
        _assert2.default.strictEqual(
            typeof transform === 'undefined' ? 'undefined' : (0, _typeof3.default)( transform ), 'function',
            'transform function must be a function' );

        _this4._left = _this4._ref = ref;

        if( (0, _utils.isGeneratorFunction)( transform ) ) {
            _this4._transform = _bluebird2.default.coroutine( transform );
        } else {
            _this4._transform = transform;
        }

        _this4._onChange = function( event, filename ) {
            _this4.emit( 'change', event, filename );

            _this4._ran = false;
        };

        ref.addListener( 'change', _this4._onChange );
        return _this4;
    }

    TransformReference.prototype._run = function _run() {
        var _this5 = this;

        if( !this._running ) {
            this._running = true;

            (0, _utils.tryReject)( this._transform, null, this._ref, null ).then( function( value ) {
                if( _this5._running ) {
                    if( (typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)( value )) === 'object' ) {
                        _this5._value = _.clone( value );

                        (0, _freeze2.default)( _this5._value );
                    } else {
                        _this5._value = value;
                    }

                    _this5._ran = true;
                    _this5._running = false;

                    _this5.emit( 'value', _this5._value );
                } else {
                    _this5.emit( 'error',
                        new Error( 'Reference was reset while performing an asynchronous operation.' ) );
                }
            } ).catch( function( err ) {
                _this5._running = false;

                _this5.emit( 'error', err );
            } );
        }
    };

    TransformReference.prototype.close = function close() {
        var recursive = arguments.length <= 0 || arguments[0] === void 0 ? false : arguments[0];

        if( !this._closed ) {
            this._ref.removeListener( 'change', this._onChange );

            if( recursive ) {
                this._ref.close( recursive );
            }

            delete this['_ref'];

            _ReferenceBase2.prototype.close.call( this );
        }
    };

    return TransformReference;
})( ReferenceBase );

var JoinedTransformReference = (function( _ReferenceBase3 ) {
    (0, _inherits3.default)( JoinedTransformReference, _ReferenceBase3 );

    function JoinedTransformReference( left, right ) {
        var transform = arguments.length <= 2 || arguments[2] === void 0 ? identity : arguments[2];
        (0, _classCallCheck3.default)( this, JoinedTransformReference );

        var _this6 = (0, _possibleConstructorReturn3.default)( this, _ReferenceBase3.call( this ) );

        (0, _assert2.default)( left instanceof ReferenceBase && right instanceof ReferenceBase,
            'join will only work on References' );
        _assert2.default.notEqual( left, right, 'Cannot join to self' );
        _assert2.default.strictEqual(
            typeof transform === 'undefined' ? 'undefined' : (0, _typeof3.default)( transform ), 'function',
            'transform function must be a function' );

        _this6._left = left;
        _this6._right = right;

        if( (0, _utils.isGeneratorFunction)( transform ) ) {
            _this6._transform = _bluebird2.default.coroutine( transform );
        } else {
            _this6._transform = transform;
        }

        _this6._onChange = function( event, filename ) {
            _this6.emit( 'change', event, filename );

            _this6._ran = false;
        };

        left.addListener( 'change', _this6._onChange );
        right.addListener( 'change', _this6._onChange );
        return _this6;
    }

    JoinedTransformReference.prototype._run = function _run() {
        var _this7 = this;

        if( !this._running ) {
            this._running = true;

            (0, _utils.tryReject)( this._transform, null, this._left, this._right ).then( function( value ) {
                if( _this7._running ) {
                    if( (typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)( value )) === 'object' ) {
                        _this7._value = _.clone( value );

                        (0, _freeze2.default)( _this7._value );
                    } else {
                        _this7._value = value;
                    }

                    _this7._ran = true;
                    _this7._running = false;

                    _this7.emit( 'value', _this7._value );
                } else {
                    _this7.emit( 'error',
                        new Error( 'Reference was reset while performing an asynchronous operation.' ) );
                }
            } ).catch( function( err ) {
                _this7._running = false;

                _this7.emit( 'error', err );
            } );
        }
    };

    JoinedTransformReference.prototype.close = function close() {
        var recursive = arguments.length <= 0 || arguments[0] === void 0 ? false : arguments[0];

        if( !this._closed ) {
            this._left.removeListener( 'change', this._onChange );
            this._right.removeListener( 'change', this._onChange );

            if( recursive ) {
                this._left.close( recursive );
                this._right.close( recursive );
            }

            _ReferenceBase3.prototype.close.call( this );
        }
    };

    return JoinedTransformReference;
})( ReferenceBase );

var ResolvedReference = (function( _ReferenceBase4 ) {
    (0, _inherits3.default)( ResolvedReference, _ReferenceBase4 );

    function ResolvedReference( value ) {
        (0, _classCallCheck3.default)( this, ResolvedReference );

        var _this8 = (0, _possibleConstructorReturn3.default)( this, _ReferenceBase4.call( this ) );

        _this8._value = value;

        _this8._run();
        return _this8;
    }

    ResolvedReference.prototype._run = function _run() {
        var _this9 = this;

        if( !this._running ) {
            this._running = true;

            (0, _utils.tryPromise)( this._value ).then( function( result ) {
                if( _this9._running ) {
                    if( (typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)( result )) === 'object' ) {
                        _this9._value = (0, _freeze2.default)( result );
                    } else {
                        _this9._value = result;
                    }

                    _this9._ran = true;
                    _this9._running = false;

                    _this9.emit( 'value', _this9._value );
                } else {
                    _this9.emit( 'error',
                        new Error( 'Reference was reset while performing an asynchronous operation.' ) );
                }
            } ).catch( function( err ) {
                _this9._running = false;

                _this9.emit( 'error', err );
            } );
        }
    };

    return ResolvedReference;
})( ReferenceBase );
