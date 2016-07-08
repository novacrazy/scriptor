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

var _script = require( "./script.js" );

var _script2 = _interopRequireDefault( _script );

var _source_script = require( "./source_script.js" );

var _source_script2 = _interopRequireDefault( _source_script );

var _text_script = require( "./text_script.js" );

var _text_script2 = _interopRequireDefault( _text_script );

var _manager = require( "./manager.js" );

var _manager2 = _interopRequireDefault( _manager );

var _utils = require( "./utils.js" );

var utils = _interopRequireWildcard( _utils );

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

/*
 * NOTE: This file uses ES7 export extensions
 * */

var Scriptor = {
    Promise:      _bluebird2.default,
    Script:       _script2.default,
    SourceScript: _source_script2.default,
    TextScript:   _text_script2.default,
    Manager:      _manager2.default,
    load:         _script.load,
    compile:      _source_script.compile,
    utils:        utils
};

//Provide a circular reference to Scriptor from Script
_script2.default.Scriptor = Scriptor;

exports.default = Scriptor;
