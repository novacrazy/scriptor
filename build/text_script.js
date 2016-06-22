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

var _script = require( './script.js' );

var _script2 = _interopRequireDefault( _script );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/*
 * This is just a variation on the normal script that forces it to always think it's in text mode
 * */

var TextScript = function( _Script ) {
    (0, _inherits3.default)( TextScript, _Script );

    function TextScript() {
        (0, _classCallCheck3.default)( this, TextScript );
        return (0, _possibleConstructorReturn3.default)( this, _Script.apply( this, arguments ) );
    }

    (0, _createClass3.default)( TextScript, [{
        key: 'textMode',
        get: function get() {
            return true;
        }
    }] );
    return TextScript;
}( _script2.default );
/**
 * Created by Aaron on 7/7/2015.
 */

exports.default = TextScript;
