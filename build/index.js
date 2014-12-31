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
var fs = require( 'fs' );
var path = require( 'path' );
var events = require( 'events' );
var Module = require( './Module' );
var AMD = require( './define' );
var Scriptor;
(function(Scriptor) {
    Scriptor.this_module = module;
    var Script = (function(_super) {
        __extends( Script, _super );
        function Script(filename, parent) {
            if( parent === void 0 ) {
                parent = Scriptor.this_module;
            }
            _super.call( this );
            this._watcher = null;
            this.imports = {};
            //Create a new Module without an id. It will be set later
            this._script = (new Module.Module( null, parent ));
            if( filename != null ) {
                this.load( filename );
            }
        }

        Object.defineProperty( Script.prototype, "exports", {
            get: function() {
                return this._script.exports;
            },
            enumerable: true,
            configurable: true
        } );
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
            //This creates a new define function every time the script is loaded
            //attempting to reuse an old one complained about duplicate internal state and so forth
            this._script.define = AMD.amdefine( this._script );
            //bind all these to this because calling them inside the script might do something weird.
            //probably not, but still
            this._script.reference = this.reference.bind( this );
            this._script.reference_once = this.reference_once.bind( this );
            this._script.include = this.include.bind( this );
            this._script.load( this._script.filename );
            this.emit( 'loaded', this.loaded );
        };
        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        Script.prototype.call = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.apply( args );
        };
        //This is kept small because the try-catch block prevents any optimization
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
            return null;
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.include = function(filename) {
            return null;
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.reference_once = function(filename) {
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
            //This is a just-in-case thing in-case the module was already loaded when .load was called
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
                    filename = path.resolve( path.dirname( _this.filename ), filename );
                    if( event === 'change' && _this.loaded ) {
                        _this.unload();
                    }
                    else if( event === 'rename' && filename != _this.filename ) {
                        //filename will be null if the file was deleted
                        if( filename != null ) {
                            //A simple rename doesn't change file content, so just change the filename
                            //and leave the script loaded
                            _this._script.filename = filename;
                        }
                        else {
                            //if the file was deleted, there is nothing we can do so just mark it unloaded.
                            //The next call to do_load will give an error akin to require's errors
                            _this.unload();
                        }
                    }
                    _this.emit( 'change', event, filename );
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
                        //Find which child is this._script, delete it and remove the (now undefined) reference
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
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();
                this._watcher = null;
                return true;
            }
            return false;
        };
        return Script;
    })( events.EventEmitter );
    Scriptor.Script = Script;
    var ScriptAdapter = (function(_super) {
        __extends( ScriptAdapter, _super );
        function ScriptAdapter(manager, filename, parent) {
            _super.call( this, filename, parent );
            this.manager = manager;
            //If the script is referred to by reference_once, this is set, allowing it to keep track of this script
            this.referee = null;
        }
        //This is kind of funny it's so simple
        ScriptAdapter.prototype.reference = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            //include is used instead of this.manager.apply because include takes into account
            //relative includes/references
            return this.include( filename ).apply( args );
        };
        ScriptAdapter.prototype.include = function(filename) {
            //make sure filename can be relative to the current script
            var real_filename = path.resolve( path.dirname( this.filename ), filename );
            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script = this.manager.add( real_filename );
            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( !script.loaded ) {
                script.reload();
            }
            return script;
        };
        //Basically, whatever arguments you give this the first time it's called is all you get
        ScriptAdapter.prototype.reference_once = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            var real_filename = path.resolve( path.dirname( this.filename ), filename );
            //I didn't want to use this.include because it forces evaluation.
            //With the Referee class, evaluation is only when .value is accessed
            var script = this.manager.add( real_filename );
            //Use the existing one in the script or create a new one (which will attach itself)
            if( script.referee != null ) {
                return script.referee;
            }
            else {
                return new Referee( script, args );
            }
        };
        return ScriptAdapter;
    })( Script );
    Scriptor.ScriptAdapter = ScriptAdapter;
    var Referee = (function() {
        function Referee(_script, _args) {
            var _this = this;
            this._script = _script;
            this._args = _args;
            this._value = null;
            this._ran = false;
            //Just mark this referee as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this referee would still not be run
            _script.on( 'change', function(event, filename) {
                _this._ran = false;
            } );
            _script.referee = this;
        }

        Object.defineProperty( Referee.prototype, "value", {
            get: function() {
                //Evaluation should only be performed here.
                //The inclusion of the _ran variable is because this script is always open to reference elsewhere,
                //so _ran keeps track of if it has been ran for this particular set or arguments and value regardless
                //of where else it has been evaluated
                if( !this._ran || !this._script.loaded ) {
                    this._value = this._script.apply( this._args );
                }
                return this._value;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Referee.prototype, "ran", {
            get:        function() {
                return this._ran;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Referee.prototype, "script", {
            //Just to make it so Referee.script = include('something else') is impossible
            get:        function() {
                return this._script;
            },
            enumerable: true,
            configurable: true
        } );
        return Referee;
    })();
    Scriptor.Referee = Referee;
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
            get: function() {
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
            filename = path.resolve( filename );
            var script = this._scripts[filename];
            //By default add the script to the manager to make lookup faster in the future
            if( script == null ) {
                return this.add( filename ).apply( args );
            }
            else {
                return script.apply( args );
            }
        };
        //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
        //but this functions as a way to add and/or get a script in one fell swoop.
        //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
        //from watching a file.
        Manager.prototype.add = function(filename, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            filename = path.resolve( filename );
            var script = this._scripts[filename];
            if( script == null ) {
                script = new ScriptAdapter( this, filename, this._parent );
                this._scripts[filename] = script;
            }
            //Even if the script is added, this allows it to be watched, though not unwatched.
            //Unwatching still has to be done manually
            if( watch ) {
                script.watch();
            }
            return script;
        };
        //Removes a script from the manager. But closing it permenantly is optional,
        //as it may sometimes make sense to move it out of a manager and use it independently.
        //However, that is quite rare so close defaults to true
        Manager.prototype.remove = function(filename, close) {
            if( close === void 0 ) {
                close = true;
            }
            filename = path.resolve( filename );
            var script = this._scripts[filename];
            if( script != null ) {
                if( close ) {
                    script.close();
                }
                return delete this._scripts[filename];
            }
            return false;
        };
        Manager.prototype.get = function(filename) {
            filename = path.resolve( filename );
            return this._scripts[filename];
        };
        //Make closing optional for the same reason as .remove
        Manager.prototype.clear = function(close) {
            if( close === void 0 ) {
                close = true;
            }
            for( var _i in this._scripts ) {
                if( this._scripts.hasOwnProperty( _i ) ) {
                    if( close ) {
                        this._scripts[_i].close();
                    }
                    delete this._scripts[_i];
                }
            }
            //Set _scripts to a clean object
            this._scripts = {};
        };
        return Manager;
    })();
    Scriptor.Manager = Manager;
})( Scriptor || (Scriptor = {}) );
module.exports = Scriptor;
