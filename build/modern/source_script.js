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

var _classCallCheck2 = require( 'babel-runtime/helpers/classCallCheck' );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _createClass2 = require( 'babel-runtime/helpers/createClass' );

var _createClass3 = _interopRequireDefault( _createClass2 );

var _possibleConstructorReturn2 = require( 'babel-runtime/helpers/possibleConstructorReturn' );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( 'babel-runtime/helpers/inherits' );

var _inherits3 = _interopRequireDefault( _inherits2 );

exports.compile = compile;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _ = _interopRequireWildcard( _lodash );

var _path = require( 'path' );

var _utils = require( './utils.js' );

var _script = require( './script.js' );

var _script2 = _interopRequireDefault( _script );

var _reference = require( './reference.js' );

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

function compile( src ) {
    var watch  = arguments.length <= 1 || arguments[1] === void 0 ? true : arguments[1];
    var parent = arguments.length <= 2 || arguments[2] === void 0 ? null : arguments[2];

    var script = new SourceScript( src, parent );

    if( watch ) {
        script.watch();
    }

    return script;
}

var SourceScript = function( _Script ) {
    (0, _inherits3.default)( SourceScript, _Script );

    function SourceScript( src ) {
        var parent = arguments.length <= 1 || arguments[1] === void 0 ? module : arguments[1];
        (0, _classCallCheck3.default)( this, SourceScript );

        var _this = (0, _possibleConstructorReturn3.default)( this, _Script.call( this, null, parent ) );

        _this._onChange = null;


        if( src !== void 0 && src !== null ) {
            _this.load( src );
        }
        return _this;
    }

    SourceScript.prototype._do_load = function _do_load() {
        var _this2 = this;

        if( !this.loading || this._loadingText && !this.textMode ) {
            this.unload();

            if( !this.textMode ) {
                this._do_setup();

                this._loading     = true;
                this._loadingText = false;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );
                    } catch( err ) {
                        this._loading = false;

                        this.emit( 'loading_error', err );
                    }
                }

                this.source( 'utf-8' ).then( function( src ) {
                    _this2._script._compile( src, _this2.filename );

                    _this2._script.loaded = true;

                    _this2._loading = false;

                    _this2.emit( 'loaded', _this2._script.exports );
                }, function( err ) {
                    _this2._loading = false;

                    _this2.emit( 'loading_error', err );
                } );
            } else {
                this._loading     = true;
                this._loadingText = true;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );
                    } catch( err ) {
                        this._loading     = false;
                        this._loadingText = false;

                        this.emit( 'loading_src_error', err );
                    }
                }

                this.source( 'utf-8' ).then( function( src ) {
                    _this2._script.loaded = true;

                    _this2._loading     = false;
                    _this2._loadingText = false;

                    _this2.emit( 'loaded', _this2.loaded );
                }, function( err ) {
                    _this2._loading     = false;
                    _this2._loadingText = false;

                    _this2.emit( 'loading_error', err );
                } );
            }
        }
    };

    SourceScript.prototype._do_watch = function _do_watch() {
        var _this3 = this;

        if( !this.watched && this._source instanceof _reference.ReferenceBase ) {

            this._onChange = _.debounce( function( event, filename ) {
                _this3.unload();
                _this3.emit( 'change', event, filename );
            }, this.debounceMaxWait );

            this._source.on( 'change', this._onChange );
        }
    };

    SourceScript.prototype._normalizeSource = function _normalizeSource( src ) {
        assert( typeof src === 'string' || Buffer.isBuffer( src ),
            'Reference source must return string or Buffer as value' );

        src = (0, _utils.stripBOM)( src );

        if( !this.textMode && _script2.default.extensions_enabled ) {
            src = (0, _utils.injectAMD)( src );
        }

        if( Buffer.isBuffer( src ) && typeof encoding === 'string' ) {
            src = src.toString( encoding );
        }

        return src;
    };

    SourceScript.prototype.source = function source( encoding ) {
        if( this._source instanceof _reference.ReferenceBase ) {
            return this._source.value().then( this._normalizeSource.bind( this ) );
        } else {
            try {
                var src = this._normalizeSource( this._source );

                return _bluebird2.default.resolve( src );
            } catch( err ) {
                return _bluebird2.default.reject( err );
            }
        }
    };

    SourceScript.prototype.load = function load( src ) {
        var watch = arguments.length <= 1 || arguments[1] === void 0 ? true : arguments[1];

        assert( typeof src === 'string' || Buffer.isBuffer( src ) || src instanceof _reference.ReferenceBase,
            'Source must be a string or Reference' );

        this.close( false );

        this._source = typeof src === 'string' ? new Buffer( src ) : src;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    };

    SourceScript.prototype.unwatch = function unwatch() {
        if( this.watched && this._source instanceof _reference.ReferenceBase ) {
            this._source.removeListener( 'change', this._onChange );
            delete this['_onChange'];
        }

        _Script.prototype.unwatch.call( this );
    };

    (0, _createClass3.default)( SourceScript, [{
        key: 'filename',
        get: function get() {
            return this._script.filename;
        },
        set: function set( value ) {
            this._script.filename = value;
        }
    }, {
        key: 'baseUrl',
        get: function get() {
            return (0, _path.dirname)( this.filename );
        },
        set: function set( value ) {
            value = (0, _path.dirname)( value );

            this.filename = value + (0, _path.basename)( this.filename );
        }
    }, {
        key: 'watched',
        get: function get() {
            return typeof this._onChange === 'function';
        }
    }] );
    return SourceScript;
}( _script2.default );

exports.default = SourceScript;
