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

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

var _interopRequireWildcard = require( 'babel-runtime/helpers/interop-require-wildcard' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );
exports.compile = compile;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _ = _interopRequireWildcard( _lodash );

var _path = require( 'path' );

var _utilsJs = require( './utils.js' );

var _scriptJs = require( './script.js' );

var _scriptJs2 = _interopRequireDefault( _scriptJs );

var _referenceJs = require( './reference.js' );

function compile( src ) {
    var watch = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];
    var parent = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    var script = new SourceScript( src, parent );

    if( watch ) {
        script.watch();
    }

    return script;
}

var SourceScript = (function( _Script ) {
    _inherits( SourceScript, _Script );

    function SourceScript( src ) {
        var parent = arguments.length <= 1 || arguments[1] === undefined ? module : arguments[1];

        _classCallCheck( this, SourceScript );

        _get( Object.getPrototypeOf( SourceScript.prototype ), 'constructor', this ).call( this, null, parent );

        this._onChange = null;
        if( src !== void 0 && src !== null ) {
            this.load( src );
        }
    }

    _createClass( SourceScript, [
        {
            key:   '_do_load',
            value: function _do_load() {
                var _this = this;

                if( !this.loading || this._loadingText && !this.textMode ) {
                    this.unload();

                    if( !this.textMode ) {
                        this._do_setup();

                        this._loading = true;
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
                            _this._script._compile( src, _this.filename );

                            _this._script.loaded = true;

                            _this._loading = false;

                            _this.emit( 'loaded', _this._script.exports );
                        }, function( err ) {
                            _this._loading = false;

                            _this.emit( 'loading_error', err );
                        } );
                    } else {
                        this._loading = true;
                        this._loadingText = true;

                        if( this._willWatch ) {
                            try {
                                this._do_watch( this._watchPersistent );
                            } catch( err ) {
                                this._loading = false;
                                this._loadingText = false;

                                this.emit( 'loading_src_error', err );
                            }
                        }

                        this.source( 'utf-8' ).then( function( src ) {
                            _this._script.loaded = true;

                            _this._loading = false;
                            _this._loadingText = false;

                            _this.emit( 'loaded', _this.loaded );
                        }, function( err ) {
                            _this._loading = false;
                            _this._loadingText = false;

                            _this.emit( 'loading_error', err );
                        } );
                    }
                }
            }
        }, {
            key:   '_do_watch',
            value: function _do_watch() {
                var _this2 = this;

                if( !this.watched && this._source instanceof _referenceJs.ReferenceBase ) {

                    this._onChange = _.debounce( function( event, filename ) {
                        _this2.unload();
                        _this2.emit( 'change', event, filename );
                    }, this.debounceMaxWait );

                    this._source.on( 'change', this._onChange );
                }
            }
        }, {
            key:   '_normalizeSource',
            value: function _normalizeSource( src ) {
                assert( typeof src === 'string' || Buffer.isBuffer( src ),
                    'Reference source must return string or Buffer as value' );

                src = (0, _utilsJs.stripBOM)( src );

                if( !this.textMode && _scriptJs2['default'].extensions_enabled ) {
                    src = (0, _utilsJs.injectAMD)( src );
                }

                if( Buffer.isBuffer( src ) && typeof encoding === 'string' ) {
                    src = src.toString( encoding );
                }

                return src;
            }
        }, {
            key:   'source',
            value: function source( encoding ) {
                if( this._source instanceof _referenceJs.ReferenceBase ) {
                    return this._source.value().then( this._normalizeSource.bind( this ) );
                } else {
                    try {
                        var src = this._normalizeSource( this._source );

                        return _bluebird2['default'].resolve( src );
                    } catch( err ) {
                        return _bluebird2['default'].reject( err );
                    }
                }
            }
        }, {
            key:   'load',
            value: function load( src ) {
                var watch = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

                assert( typeof src === 'string' || Buffer.isBuffer( src ) || src instanceof _referenceJs.ReferenceBase,
                    'Source must be a string or Reference' );

                this.close( false );

                this._source = typeof src === 'string' ? new Buffer( src ) : src;

                if( watch ) {
                    this.watch();
                }

                this.emit( 'change', 'change', this.filename );

                return this;
            }
        }, {
            key:   'unwatch',
            value: function unwatch() {
                if( this.watched && this._source instanceof _referenceJs.ReferenceBase ) {
                    this._source.removeListener( 'change', this._onChange );
                    delete this['_onChange'];
                }

                _get( Object.getPrototypeOf( SourceScript.prototype ), 'unwatch', this ).call( this );
            }
        }, {
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
        }
    ] );

    return SourceScript;
})( _scriptJs2['default'] );

exports['default'] = SourceScript;
