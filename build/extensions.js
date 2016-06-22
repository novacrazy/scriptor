/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2016 Aaron Trent
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
"use strict";

exports.__esModule = true;

var _bluebird = require( "bluebird" );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _fs = require( "fs" );

var _utils = require( "./utils.js" );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

var readFileAsync = _bluebird2.default.promisify( _fs.readFile );

/*
 * These are basically asynchronous versions of the default .js and .json extension handlers found in node/lib/module.js,
 * but the .js one also goes ahead and inject the AMD header described in ./defaults.js
 * */

/**
 * Created by Aaron on 7/5/2015.
 */

exports.default = {
    '.js':   function js( module, filename ) {
        return readFileAsync( filename ).then( _utils.injectAMDAndStripBOM ).then( function( src ) {
            module._compile( src.toString( 'utf-8' ), filename );

            return src;
        } );
    },
    '.json': function json( module, filename ) {
        return readFileAsync( filename ).then( _utils.stripBOM ).then( function( src ) {
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
