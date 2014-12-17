"use strict";
/**
 * Created by novacrazy on 12/15/2014.
 */
var fs = require('fs');
var assert = require('assert');
var path = require('path');
var Module = require('./Module');
var AMD = require('./define');
/*
 *   Rules for scripts:
 *
 *   Lazy evaluation on all scripts, watched or not.
 *
 *   If being watched, a change or rename will not recompile the
 *   script if it was not already loaded, preserving laziness.
 *
 *   watch_script and unwatch_script will not not evaluate a script or overwrite an old script.
 *
 *   watch_script will call add_script, but does not evaluate.
 *
 *   run_script is the only function that will evaluate a script and its main function.
 *
 *   If the script is changed, it the script is marked as unloaded, and will be re-evaluated
 *   the next time run_script is called on that script.
 *
 *   If the script is renamed, nothing is changed except internal state for lookups.
 *
 *   reload_script forces re-evaluation of the script, but does not call the main function.
 *
 *   If not already added, reload_script will add the script.
 *
 *   reload_script can set up watchers for a script
 *
 *   remove_script closes watchers and deletes the script from memory
 *
 *   clear removes everything, and closes all watchers
 *
 * */
var Scriptor;
(function (Scriptor) {
    var debug = require('debug')('scriptor');
    var ScriptManager = (function () {
        function ScriptManager(grandParent) {
            this.scripts = {};
            this.watchers = {};
            this._imports = {};
            this.parent = new Module.Module('ScriptManager', grandParent);
        }
        Object.defineProperty(ScriptManager.prototype, "imports", {
            get: function () {
                return this._imports;
            },
            enumerable: true,
            configurable: true
        });
        ScriptManager.prototype.do_make_script = function (filename) {
            debug( 'making script' );
            var id = path.basename(filename);
            var script = (new Module.Module(id, this.parent));
            script.filename = filename;
            return script;
        };
        ScriptManager.prototype.do_load_script = function (script, filename) {
            var _this = this;
            debug( 'loading script' );
            script.loaded = false;
            //Prevent the script from deleting imports, but it is allowed to interact with them
            script.imports = Object.freeze(this.imports);
            script.define = AMD.amdefine(script);
            script.reference = function(ref_filename) {
                var parameters = [];
                for( var _i = 1; _i < arguments.length; _i++ ) {
                    parameters[_i - 1] = arguments[_i];
                }
                return _this.run_script_apply( ref_filename, parameters );
            };
            script.load(filename);
            return script;
        };
        ScriptManager.prototype.attach_watchers = function (script) {
            var _this = this;
            assert(script.filename != null);
            var watcher = fs.watch(script.filename, {
                persistent: false
            });
            this.watchers[script.filename] = watcher;
            watcher.on('change', function (event, filename) {
                filename = path.resolve(path.dirname(script.filename) + path.sep + filename);
                if (event === 'change' && script.loaded) {
                    script.loaded = false;
                    debug('script changed');
                }
                else if (event === 'rename' && filename != script.filename) {
                    var old_filename = script.filename;
                    _this.scripts[filename] = _this.scripts[old_filename];
                    _this.watchers[filename] = _this.watchers[old_filename];
                    delete _this.scripts[old_filename];
                    delete _this.watchers[old_filename];
                    debug('script renamed from %s to %s', script.filename, filename);
                }
            });
        };
        ScriptManager.prototype.has_script = function (filename) {
            filename = path.resolve(filename);
            return this.scripts[filename] != null;
        };
        ScriptManager.prototype.loaded_script = function(filename) {
            filename = path.resolve( filename );
            var script = this.scripts[filename];
            return script != null && script.loaded;
        };
        ScriptManager.prototype.add_script = function (filename, watch) {
            if (watch === void 0) { watch = true; }
            filename = path.resolve(filename);
            var script = this.do_make_script(filename);
            if (watch) {
                this.attach_watchers(script);
            }
            this.scripts[filename] = script;
        };
        /*Separated out so exceptions don't prevent optimizations */
        ScriptManager.prototype.do_run_script = function(script, parameters) {
            debug( 'running script' );
            var main = script.exports;
            try {
                if( typeof main === 'function' ) {
                    return main.apply( null, parameters );
                }
                else {
                    return main;
                }
            }
            catch( e ) {
                //Mark script as unloaded so syntax errors can be fixed in unwatched files before re-running
                if( e instanceof SyntaxError ) {
                    script.loaded = false;
                }
                throw e;
            }
        };
        ScriptManager.prototype.run_script = function (filename) {
            var parameters = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                parameters[_i - 1] = arguments[_i];
            }
            return this.run_script_apply( filename, parameters );
        };
        ScriptManager.prototype.run_script_apply = function(filename, parameters) {
            filename = path.resolve(filename);
            var script = this.scripts[filename];
            if (script == null) {
                script = this.do_make_script(filename);
            }
            if (!script.loaded) {
                this.do_load_script(script, filename);
            }
            return this.do_run_script( script, parameters );
        };
        ScriptManager.prototype.reload_script = function (filename, watch) {
            if (watch === void 0) { watch = false; }
            filename = path.resolve(filename);
            var script = this.scripts[filename];
            if (script == null) {
                this.add_script(filename, watch);
                script = this.scripts[filename];
            }
            if (watch) {
                this.watch_script(filename);
            }
            this.do_load_script(script, filename);
        };
        ScriptManager.prototype.watch_script = function (filename) {
            filename = path.resolve(filename);
            if (this.watchers[filename] == null) {
                var script = this.scripts[filename];
                if (script != null) {
                    this.attach_watchers(script);
                }
                else {
                    this.add_script(filename, true);
                }
            }
        };
        ScriptManager.prototype.unwatch_script = function (filename) {
            filename = path.resolve(filename);
            var watcher = this.watchers[filename];
            if (watcher != null) {
                watcher.close();
                delete this.watchers[filename];
            }
        };
        ScriptManager.prototype.remove_script = function (filename) {
            filename = path.resolve(filename);
            var script = this.scripts[filename];
            if (script != null) {
                var watcher = this.watchers[filename];
                if (watcher != null) {
                    watcher.close();
                    delete this.scripts[filename];
                }
                return delete this.watchers[filename];
            }
            return false;
        };
        ScriptManager.prototype.clear = function () {
            for (var it in this.watchers) {
                if (this.watchers.hasOwnProperty(it)) {
                    this.watchers[it].close();
                }
            }
            this.watchers = {};
            this.scripts = {};
        };
        return ScriptManager;
    })();
    Scriptor.ScriptManager = ScriptManager;
})(Scriptor || (Scriptor = {}));
module.exports = Scriptor;
