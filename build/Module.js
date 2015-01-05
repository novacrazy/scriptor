/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Aaron Trent
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
/**
 * Created by novacrazy on 8/31/14.
 */
/*
 * These are type definitions for the internal (mostly) 'module' module.
 *
 * The general process for creating a new module and populating it with a script goes as follows:
 *
 *   var Module = require('module');
 *
 *   var script = new Module('script', module);
 *
 *   script._load('scripts/script.js');
 *
 *   //script.js has been loaded into 'script.exports'
 *   script.exports.someFunction();
 *
 *
 * And if you want to reload the script:
 *
 *   //Prime it to be reloaded
 *   script.loaded = false;
 *
 *   script._load('script/other_script.js');
 *
 *   //other_script.js has been loaded into 'script.exports'
 *   script.export.someOtherFunction();
 *
 *
 * So that's some nice exploitation of the internal module system,
 * and it even takes care of all that neat safety stuff.
 *
 * */
var Module;
(function (_Module) {
    //Also happens to match the backwards compatibility in the 'module' module
    _Module.Module = require('module');
})(Module || (Module = {}));
module.exports = Module;
