"use strict";
/**
 * Created by novacrazy on 12/25/2014.
 */
var __extends = this.__extends || function(d, b) {
        for( var p in b ) {
            if( b.hasOwnProperty( p ) ) {
                d[p] = b[p];
            }
        }
        function __() {
            this.constructor = d;
        }

        __.prototype = b.prototype;
        d.prototype = new __();
    };
var fs = require('fs');
var path = require('path');
var Module = require('./Module');
var AMD = require('./define');
var Scriptor;
(function (Scriptor) {
    Scriptor.this_module = module;
    var Script = (function() {
        function Script(filename, parent) {
            if( parent === void 0 ) {
                parent = Scriptor.this_module;
            }
            this._watcher = null;
            this.imports = {};
            this._script = (new Module.Module( null, parent ));
            if( filename != null ) {
                this.load( filename );
            }
        }

        Object.defineProperty( Script.prototype, "exports", {
            get: function () {
                return this._script.exports;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty( Script.prototype, "id", {
            get: function() {
                return this._script.id;
            },
            //Allow id to be set because it isn't very important
            set: function(value) {
                this._script.id = value;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "children", {
            get: function() {
                return this._script.children;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "parent", {
            get: function() {
                return this._script.parent;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "loaded", {
            get: function() {
                return this._script.loaded;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "watched", {
            get: function() {
                return this._watcher != null;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "filename", {
            //Only allow getting the filename, setting should be done through .load
            get: function() {
                return this._script.filename;
            },
            enumerable: true,
            configurable: true
        } );
        //Basically an alias for the real script's require
        Script.prototype.require = function(path) {
            return this._script.require( path );
        };
        Script.prototype.do_load = function() {
            this._script.loaded = false;
            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );
            //Incorporate AMD for the created module, allow reuse of existing define if reloading
            this._script.define = this._script.define || AMD.amdefine( this._script );
            this._script.reference = this.reference.bind( this );
            this._script.load( this._script.filename );
        };
        //simply abuses TypeScript's variable arguments feature
        Script.prototype.call = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.apply( args );
        };
        Script.prototype.apply = function(args) {
            if( !this.loaded ) {
                this.do_load();
            }
            var main = this.exports;
            try {
                if( typeof main === 'function' ) {
                    return main.apply( null, args );
                }
                else {
                    return main;
                }
            }
            catch( e ) {
                if( e instanceof SyntaxError ) {
                    this.unload();
                }
                throw e;
            }
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.reference = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return null;
        };
        Script.prototype.load = function(filename, watch) {
            if( watch === void 0 ) {
                watch = false;
            }
            filename = path.resolve( filename );
            this.id = path.basename( filename );
            this._script.filename = filename;
            if( watch ) {
                this.watch();
            }
            //Although this seems counter-intuitive,
            //the lazy loading dictates it must be in an unloaded state before a new script is compiled/run
            this.unload();
            return this;
        };
        Script.prototype.unload = function() {
            var was_loaded = this.loaded;
            this._script.loaded = false;
            return was_loaded;
        };
        Script.prototype.reload = function() {
            var was_loaded = this.loaded;
            //Force it to reload and recompile the script.
            this.do_load();
            return was_loaded;
        };
        Script.prototype.watch = function() {
            var _this = this;
            if( !this.watched ) {
                var watcher = this._watcher = fs.watch( this.filename, {
                    persistent: false
                } );
                watcher.on( 'change', function(event, filename) {
                    filename = path.resolve( path.dirname( _this.filename ) + path.sep + filename );
                    if( event === 'change' && _this.loaded ) {
                        _this.unload();
                    }
                    else if( event === 'rename' && filename != _this.filename ) {
                        _this._script.filename = filename;
                    }
                } );
                return true;
            }
            return false;
        };
        Script.prototype.close = function(permanent) {
            if( permanent === void 0 ) {
                permanent = true;
            }
            this.unload();
            this.unwatch();
            if( permanent ) {
                //Remove _script from parent
                if( this.parent != null ) {
                    var children = this.parent.children;
                    for( var _i in children ) {
                        if( children.hasOwnProperty( _i ) && children[_i] === this._script ) {
                            delete children[_i];
                            children.splice( _i, 1 );
                        }
                    }
                }
                //Remove _script from current object
                delete this['_script'];
                this._script = null;
            }
        };
        Script.prototype.unwatch = function() {
            if( this.watched ) {
                this._watcher.close();
                this._watcher = null;
                return true;
            }
            return false;
        };
        return Script;
    })();
    Scriptor.Script = Script;
    var ScriptAdapter = (function(_super) {
        __extends( ScriptAdapter, _super );
        function ScriptAdapter(manager, filename, parent) {
            _super.call( this, filename, parent );
            this.manager = manager;
        }

        ScriptAdapter.prototype.reference = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            var real_filename = path.resolve( path.dirname( this.filename ), filename );
            return this.manager.apply( real_filename, args );
        };
        return ScriptAdapter;
    })( Script );
    Scriptor.ScriptAdapter = ScriptAdapter;
    var Manager = (function() {
        function Manager(grandParent) {
            this._scripts = {};
            this._parent = new Module.Module( 'ScriptManager', grandParent );
        }

        Object.defineProperty( Manager.prototype, "parent", {
            get: function() {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Manager.prototype, "scripts", {
            get:        function() {
                return Object.freeze( this._scripts );
            },
            enumerable: true,
            configurable: true
        } );
        Manager.prototype.run = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.apply( filename, args );
        };
        Manager.prototype.apply = function(filename, args) {
            filename = path.resolve(filename);
            var script = this._scripts[filename];
            if( script == null ) {
                return this.add( filename ).apply( args );
            }
            else {
                return script.apply( args );
            }
        };
        Manager.prototype.add = function(filename, watch) {
            if( watch === void 0 ) {
                watch = false;
            }
            filename = path.resolve(filename);
            var script = this._scripts[filename];
            if( script == null ) {
                script = new ScriptAdapter( this, filename, this._parent );
                this._scripts[filename] = script;
            }
            if( watch ) {
                script.watch();
            }
            return script;
        };
        Manager.prototype.remove = function(filename) {
            filename = path.resolve(filename);
            var script = this._scripts[filename];
            if (script != null) {
                script.close();
                return delete this._scripts[filename];
            }
            return false;
        };
        Manager.prototype.get = function(filename) {
            filename = path.resolve( filename );
            return this._scripts[filename];
        };
        Manager.prototype.clear = function() {
            for( var _i in this._scripts ) {
                if( this._scripts.hasOwnProperty( _i ) ) {
                    this._scripts[_i].close();
                    delete this._scripts[_i];
                }
            }
            this._scripts = {};
        };
        return Manager;
    })();
    Scriptor.Manager = Manager;
})(Scriptor || (Scriptor = {}));
module.exports = Scriptor;
