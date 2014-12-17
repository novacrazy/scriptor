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
