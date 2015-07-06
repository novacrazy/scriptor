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

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _fs = require( 'fs' );

var _utilsJs = require( './utils.js' );

var readFileAsync = _bluebird2['default'].promisify( _fs.readFile );

exports['default'] = {
    '.js':   function js( module, filename ) {
        return readFileAsync( filename ).then( _utilsJs.injectAMDAndStripBOM ).then( function( src ) {
            module._compile( src.toString( 'utf-8' ), filename );

            return src;
        } );
    },
    '.json': function json( module, filename ) {
        return readFileAsync( filename ).then( _utilsJs.stripBOM ).then( function( src ) {
            try {
                module.exports = JSON.parse( src.toString( 'utf-8' ) );
            } catch( err ) {
                err.message = filename + ': ' + err.message;
                throw err;
            }

            return src;
        } );
    }
};
module.exports = exports['default'];
