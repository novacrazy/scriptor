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

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

exports.__esModule = true;
exports.compile = compile;

var _scriptJs = require( './script.js' );

var _scriptJs2 = _interopRequireDefault( _scriptJs );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _path = require( 'path' );

var _utilsJs = require( './utils.js' );

var _referenceJs = require( './reference.js' );

function compile( src ) {
    var watch = arguments[1] === undefined ? true : arguments[1];
    var parent = arguments[2] === undefined ? null : arguments[2];

    var script = new SourceScript( src, parent );

    if( watch ) {
        script.watch();
    }

    return script;
}

var SourceScript = (function( _Script ) {
    function SourceScript( src ) {
        var parent = arguments[1] === undefined ? module : arguments[1];

        _classCallCheck( this, SourceScript );

        _Script.call( this, null, parent );

        this._onChange = null;
        if( src !== void 0 && src !== null ) {
            this.load( src );
        }
    }

    _inherits( SourceScript, _Script );

    SourceScript.prototype.do_load = function do_load() {
        var _this = this;

        if( !this.loading || this._loadingText && !this.textMode ) {
            this.unload();

            if( !this.textMode ) {
                this.do_setup();

                this._loading = true;
                this._loadingText = false;

                this.source( 'utf-8' ).then( function( src ) {
                    _this._script._compile( src, _this.filename );

                    _this._script.loaded = true;

                    _this._loading = false;

                    _this.emit( 'loaded', _this._script.exports );
                } )['catch']( function( err ) {
                    _this._loading = false;

                    _this.emit( 'loading_error', err );
                } );
            } else {
                this._loading = true;
                this._loadingText = true;

                this.source( 'utf-8' ).then( function( src ) {
                    _this._script.loaded = true;

                    _this._loading = false;
                    _this._loadingText = false;

                    _this.emit( 'loaded', _this.loaded );
                } )['catch']( function( err ) {
                    _this._loading = false;

                    _this.emit( 'loading_error', err );
                } );
            }
        }
    };

    SourceScript.prototype._normalizeSource = function _normalizeSource( src ) {
        assert( typeof src === 'string' || Buffer.isBuffer( src ),
                'Reference source must return string or Buffer as value' );

        src = _utilsJs.stripBOM( src );

        if( !this.textMode && _scriptJs2['default'].extensions_enabled ) {
            src = _utilsJs.injectAMD( src );
        }

        if( Buffer.isBuffer( src ) && typeof encoding === 'string' ) {
            src = src.toString( encoding );
        }

        return src;
    };

    SourceScript.prototype.source = function source( encoding ) {
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
    };

    SourceScript.prototype.load = function load( src ) {
        var watch = arguments[1] === undefined ? true : arguments[1];

        assert( typeof src === 'string' || Buffer.isBuffer( src ) || src instanceof _referenceJs.ReferenceBase,
                'Source must be a string or Reference' );

        this.close( false );

        this._source = typeof src === 'string' ? new Buffer( src ) : src;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    };

    SourceScript.prototype.watch = function watch() {
        var _this2 = this;

        if( !this.watched && this._source instanceof _referenceJs.ReferenceBase ) {

            this._onChange = _lodash2['default'].debounce( function( event, filename ) {
                _this2.unload();
                _this2.emit( 'change', event, filename );
            }, this.debounceMaxWait );

            this._source.on( 'change', this._onChange );

            return true;
        }

        return false;
    };

    SourceScript.prototype.unwatch = function unwatch() {
        if( this.watched && this._source instanceof _referenceJs.ReferenceBase ) {
            this._source.removeListener( 'change', this._onChange );
            return delete this['_onChange'];
        }

        return false;
    };

    _createClass( SourceScript, [{
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
            return _path.dirname( this.filename );
        },
        set: function set( value ) {
            value = _path.dirname( value );

            this.filename = value + _path.basename( this.filename );
        }
    }, {
        key: 'watched',
        get: function get() {
            return this._onChange !== void 0 && this._onChange !== null;
        }
    }] );

    return SourceScript;
})( _scriptJs2['default'] );

exports['default'] = SourceScript;
