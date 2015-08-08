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
 * Created by Aaron on 7/7/2015.
 */

'use strict';

var _get = require( 'babel-runtime/helpers/get' )['default'];

var _inherits = require( 'babel-runtime/helpers/inherits' )['default'];

var _createClass = require( 'babel-runtime/helpers/create-class' )['default'];

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );

var _scriptJs = require( './script.js' );

var _scriptJs2 = _interopRequireDefault( _scriptJs );

var TextScript = (function( _Script ) {
    _inherits( TextScript, _Script );

    function TextScript() {
        _classCallCheck( this, TextScript );

        _get( Object.getPrototypeOf( TextScript.prototype ), 'constructor', this ).apply( this, arguments );
    }

    _createClass( TextScript, [
        {
            key: 'textMode',
            get: function get() {
                return true;
            }
        }
    ] );

    return TextScript;
})( _scriptJs2['default'] );

exports['default'] = TextScript;
module.exports = exports['default'];
