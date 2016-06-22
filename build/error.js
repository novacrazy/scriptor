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
'use strict';

exports.__esModule     = true;
exports.normalizeError = normalizeError;
/**
 * Created by Aaron on 7/4/2015.
 */

/*
 * This turns generic errors into something like would be produced by require.js and almond.js
 *
 * Probably not fully necessary, but eh.
 * */
function normalizeError( id, type ) {
    var err = arguments.length <= 2 || arguments[2] === void 0 ? {} : arguments[2];

    if( Array.isArray( err.requireModules ) && !Array.isArray( id ) && err.requireModules.indexOf( id ) === -1 ) {
        err.requireModules.push( id );
    } else {
        err.requireModules = Array.isArray( id ) ? id : [id];
    }

    err.requireType = err.requireType || type;

    err.message = (err.message || '') + ' - ' + id;

    return err;
}
