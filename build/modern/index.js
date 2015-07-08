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

/*
 * This file uses ES7 export extensions
 * */

'use strict';

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

var _interopRequireWildcard = require( 'babel-runtime/helpers/interop-require-wildcard' ).default;

exports.__esModule = true;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

var _scriptJs = require( './script.js' );

var _scriptJs2 = _interopRequireDefault( _scriptJs );

var _source_scriptJs = require( './source_script.js' );

var _source_scriptJs2 = _interopRequireDefault( _source_scriptJs );

var _text_scriptJs = require( './text_script.js' );

var _text_scriptJs2 = _interopRequireDefault( _text_scriptJs );

var _managerJs = require( './manager.js' );

var _managerJs2 = _interopRequireDefault( _managerJs );

var _referenceJs = require( './reference.js' );

var _referenceJs2 = _interopRequireDefault( _referenceJs );

var _yield_handlerJs = require( './yield_handler.js' );

var _yield_handlerJs2 = _interopRequireDefault( _yield_handlerJs );

var _utilsJs = require( './utils.js' );

var utils = _interopRequireWildcard( _utilsJs );

var Scriptor = {
    Promise:         _bluebird2.default,
    Script:          _scriptJs2.default,
    SourceScript:    _source_scriptJs2.default,
    TextScript:      _text_scriptJs2.default,
    Manager:         _managerJs2.default,
    Reference:       _referenceJs2.default,
    addYieldHandler: _yield_handlerJs2.default,
    load:            _scriptJs.load,
    compile: _source_scriptJs.compile,
    utils:   utils
};

_scriptJs2.default.Scriptor = Scriptor;

exports.default = Scriptor;
module.exports = exports.default;
