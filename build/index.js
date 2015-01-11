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
var assert = require( 'assert' );
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
            this._recursion = 0;
            this._maxRecursion = 1;
            this._reference = void 0;
            this.imports = {};
            //Create a new Module without an id. It will be set later
            this._script = (new Module.Module( null, parent ));
            //Explicit comparisons to appease JSHint
            if( filename !== void 0 && filename !== null ) {
                this.load( filename );
            }
        }

        //Wrap it before you tap it.
        //No, but really, it's important to protect against errors in a generic way
        Script.prototype._callWrapper = function(func) {
            //Just in case, always use recursion protection
            if( this._recursion > this._maxRecursion ) {
                throw new RangeError( 'Script recursion limit reached at ' + this._recursion );
            }
            try {
                //Just to make sure this happens in the try-catch-finally block so finally is assured to be decremented.
                this._recursion++;
                return func.call( this );
            }
            catch( e ) {
                if( e instanceof SyntaxError ) {
                    this.unload();
                }
                throw e;
            }
            finally {
                //release recurse
                this._recursion--;
            }
        };
        Object.defineProperty( Script.prototype, "id", {
            get:        function() {
                return this._script.id;
            },
            //Allow id to be set because it isn't very important
            set:        function(value) {
                this._script.id = value;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "children", {
            get:        function() {
                return this._script.children;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "parent", {
            get:        function() {
                return this._script.parent;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "loaded", {
            get:        function() {
                return this._script.loaded;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "watched", {
            get:        function() {
                return this._watcher !== void 0;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "filename", {
            //Only allow getting the filename, setting should be done through .load
            get:        function() {
                return this._script.filename;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Script.prototype, "maxRecursion", {
            get:        function() {
                return this._maxRecursion;
            },
            set:        function(value) {
                //JSHint doesn't like bitwise operators
                this._maxRecursion = Math.floor( value );
                assert( !isNaN( this._maxRecursion ), 'maxRecursion must be set to a number' );
            },
            enumerable: true,
            configurable: true
        } );
        //Basically an alias for the real script's require
        Script.prototype.require = function(path) {
            return this._script.require( path );
        };
        Script.prototype.do_setup = function() {
            var _this = this;
            //Shallow freeze so the script can't add/remove imports, but it can modify them
            this._script.imports = Object.freeze( this.imports );
            //This creates a new define function every time the script is loaded
            //attempting to reuse an old one complained about duplicate internal state and so forth
            this._script.define = AMD.amdefine( this._script );
            //bind all these to this because calling them inside the script might do something weird.
            //probably not, but still
            this._script.reference = this.reference.bind( this );
            this._script.reference_apply = this.reference_apply.bind( this );
            this._script.reference_once = this.reference_once.bind( this );
            this._script.include = this.include.bind( this );
            this._script.change = function() {
                //triggers reset of References
                _this.emit( 'change', 'change', _this.filename );
            };
        };
        //Should ALWAYS be called within a _callWrapper
        Script.prototype.do_load = function() {
            this.unload();
            this.do_setup();
            this._script.load( this._script.filename );
            this.emit( 'loaded', this.loaded );
        };
        Script.prototype.do_exports = function() {
            var _this = this;
            if( !this.loaded ) {
                this._callWrapper( function() {
                    _this.do_load();
                } );
            }
            return this._script.exports;
        };
        Object.defineProperty( Script.prototype, "exports", {
            get:          function() {
                return this.do_exports();
            },
            enumerable:   true,
            configurable: true
        } );
        //simply abuses TypeScript's variable arguments feature and gets away from the try-catch block
        Script.prototype.call = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.apply( args );
        };
        Script.prototype.apply = function(args) {
            //This will ensure it is loaded (safely) and return the exports
            var main = this.exports;
            //Use another call wrapper to execute the script
            return this._callWrapper( function() {
                if( typeof main === 'function' ) {
                    return main.apply( null, args );
                }
                else {
                    return main;
                }
            } );
        };
        Script.prototype.call_once = function() {
            var args = [];
            for( var _i = 0; _i < arguments.length; _i++ ) {
                args[_i - 0] = arguments[_i];
            }
            return this.apply_once( args );
        };
        Script.prototype.apply_once = function(args) {
            if( this._reference !== void 0 ) {
                return this._reference;
            }
            else {
                this._reference = new Reference( this, args );
                return this._reference;
            }
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.reference = function(filename) {
            return null;
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.reference_apply = function(filename, args) {
            return null;
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.reference_once = function(filename) {
            return null;
        };
        //Returns null unless using the Manager, which creates a special derived class that overrides this
        Script.prototype.include = function(filename) {
            return null;
        };
        Script.prototype.load = function(filename, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            filename = path.resolve( filename );
            this.close( false );
            this.id = path.basename( filename );
            this._script.filename = filename;
            if( watch ) {
                this.watch();
            }
            this.emit( 'change', 'change', this.filename );
            return this;
        };
        Script.prototype.unload = function() {
            var was_loaded = this.loaded;
            this._script.loaded = false;
            return was_loaded;
        };
        Script.prototype.reload = function() {
            var _this = this;
            var was_loaded = this.loaded;
            //Force it to reload and recompile the script.
            this._callWrapper( function() {
                _this.do_load();
            } );
            //If a Reference depends on this script, then it should be updated when it reloads
            //That way if data is compile-time determined (like times, PRNGs, etc), it will be propagated.
            this.emit( 'change', 'change', this.filename );
            return was_loaded;
        };
        Script.prototype.watch = function() {
            var _this = this;
            if( !this.watched ) {
                var watcher = this._watcher = fs.watch( this.filename, {
                    persistent: false
                } );
                watcher.on( 'change', function(event, filename) {
                    //path.resolve doesn't like nulls, so this has to be done first
                    if( filename === null || filename === void 0 ) {
                        //If filename is null, that is generally a bad sign, so just close the script (not permanently)
                        _this.close( false );
                    }
                    else {
                        //This is important because fs.watch 'change' event only returns things like 'script.js'
                        //as a filename, which when resolved normally is relative to process.cwd(), not where the script
                        //actually is. So we have to get the directory of the last filename and combine it with the new name
                        filename = path.resolve( path.dirname( _this.filename ), filename );
                        if( event === 'change' && _this.loaded ) {
                            _this.unload();
                        }
                        else if( event === 'rename' && filename !== _this.filename ) {
                            //A simple rename doesn't change file content, so just change the filename
                            //and leave the script loaded
                            _this._script.filename = filename;
                        }
                    }
                    _this.emit( 'change', event, filename );
                } );
                watcher.on( 'error', function(error) {
                    _this.unload();
                    //Would it be better to throw?
                    _this.emit( 'error', error );
                } );
                return true;
            }
            return false;
        };
        Script.prototype.unwatch = function() {
            if( this.watched ) {
                //close the watched and null it to allow the GC to collect it
                this._watcher.close();
                return delete this._watcher;
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
                if( this.parent !== void 0 ) {
                    var children = this.parent.children;
                    for( var _i in children ) {
                        //Find which child is this._script, delete it and remove the (now undefined) reference
                        if( children.hasOwnProperty( _i ) && children[_i] === this._script ) {
                            delete children[_i];
                            children.splice( _i, 1 );
                            break;
                        }
                    }
                }
                //Remove _script from current object
                return delete this._script;
            }
            else {
                this._script.filename = null;
            }
        };
        return Script;
    })( events.EventEmitter );
    Scriptor.Script = Script;
    var SourceScript = (function(_super) {
        __extends( SourceScript, _super );
        function SourceScript(src, parent) {
            if( parent === void 0 ) {
                parent = Scriptor.this_module;
            }
            _super.call( this );
            if( src !== void 0 && src !== null ) {
                this.load( src );
            }
        }

        Object.defineProperty( SourceScript.prototype, "filename", {
            get:          function() {
                return this._script.filename;
            },
            set:          function(value) {
                this._script.filename = value;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( SourceScript.prototype, "watched", {
            get:          function() {
                return this._onChange === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( SourceScript.prototype, "source", {
            get:          function() {
                var src;
                if( this._source instanceof ReferenceBase ) {
                    src = this._source.value();
                    assert.strictEqual( typeof src, 'string', 'Reference source must return string as value' );
                }
                else {
                    src = this._source;
                }
                //strip BOM
                if( src.charCodeAt( 0 ) === 0xFEFF ) {
                    src = src.slice( 1 );
                }
                return src;
            },
            enumerable:   true,
            configurable: true
        } );
        SourceScript.prototype.do_compile = function() {
            if( !this.loaded ) {
                assert.notStrictEqual( this._source, void 0, 'Source must be set to compile' );
                this._script._compile( this.source, this.filename );
                this._script.loaded = true;
                this.emit( 'loaded', this.loaded );
            }
        };
        SourceScript.prototype.do_load = function() {
            this.unload();
            this.do_setup();
            this.do_compile();
        };
        SourceScript.prototype.load = function(src, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            this.close( false );
            assert( typeof src === 'string' || src instanceof ReferenceBase, 'Source must be a string or Reference' );
            this._source = src;
            if( watch ) {
                this.watch();
            }
            this.emit( 'change', 'change', this.filename );
            return this;
        };
        SourceScript.prototype.watch = function() {
            var _this = this;
            if( !this.watched && this._source instanceof ReferenceBase ) {
                this._onChange = function(event, filename) {
                    _this.emit( 'change', event, filename );
                    _this.unload();
                };
                this._source.on( 'change', this._onChange );
                return true;
            }
            return false;
        };
        SourceScript.prototype.unwatch = function() {
            if( this.watched && this._source instanceof ReferenceBase ) {
                this._source.removeListener( 'change', this._onChange );
                return delete this._onChange;
            }
            return false;
        };
        return SourceScript;
    })( Script );
    Scriptor.SourceScript = SourceScript;
    var ScriptAdapter = (function(_super) {
        __extends( ScriptAdapter, _super );
        function ScriptAdapter(manager, filename, parent) {
            _super.call( this, filename, parent );
            this.manager = manager;
        }

        //Again just taking advantage of TypeScript's variable arguments
        ScriptAdapter.prototype.reference = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.reference_apply( filename, args );
        };
        //This is kind of funny it's so simple
        ScriptAdapter.prototype.reference_apply = function(filename, args) {
            //include is used instead of this.manager.apply because include takes into account
            //relative includes/references
            return this.include( filename, false ).apply( args );
        };
        //Basically, whatever arguments you give this the first time it's called is all you get
        ScriptAdapter.prototype.reference_once = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            var real_filename = path.resolve( path.dirname( this.filename ), filename );
            return this.manager.add( real_filename ).apply_once( args );
        };
        ScriptAdapter.prototype.include = function(filename, load) {
            if( load === void 0 ) {
                load = false;
            }
            //make sure filename can be relative to the current script
            var real_filename = path.resolve( path.dirname( this.filename ), filename );
            //Since add doesn't do anything to already existing scripts, but does return a script,
            //it can take care of the lookup or adding at the same time. Two birds with one lookup.
            var script = this.manager.add( real_filename );
            //Since include can be used independently of reference, make sure it's loaded before returning
            //Otherwise, the returned script is in an incomplete state
            if( load && !script.loaded ) {
                script.reload();
            }
            return script;
        };
        return ScriptAdapter;
    })( Script );
    Scriptor.ScriptAdapter = ScriptAdapter;
    function load(filename, watch) {
        if( watch === void 0 ) {
            watch = true;
        }
        var script = new Script( filename );
        if( watch ) {
            script.watch();
        }
        return script;
    }

    Scriptor.load = load;
    function compile(src, watch) {
        if( watch === void 0 ) {
            watch = true;
        }
        var script = new SourceScript( src );
        if( watch ) {
            script.watch();
        }
        return script;
    }

    Scriptor.compile = compile;
    Scriptor.identity = function(left, right) {
        return left.value();
    };
    var ReferenceBase = (function(_super) {
        __extends( ReferenceBase, _super );
        function ReferenceBase() {
            _super.apply( this, arguments );
            this._value = void 0;
            this._ran = false;
        }

        return ReferenceBase;
    })( events.EventEmitter );
    Scriptor.ReferenceBase = ReferenceBase;
    var Reference = (function(_super) {
        __extends( Reference, _super );
        function Reference(_script, _args) {
            var _this = this;
            _super.call( this );
            this._script = _script;
            this._args = _args;
            //Just mark this reference as not ran when a change occurs
            //other things are free to reference this script and evaluate it,
            //but this reference would still not be run
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            this._script.on( 'change', this._onChange );
        }

        Reference.prototype.value = function() {
            //Evaluation should only be performed here.
            //The inclusion of the _ran variable is because this script is always open to reference elsewhere,
            //so _ran keeps track of if it has been ran for this particular set or arguments and value regardless
            //of where else it has been evaluated
            if( !this._ran ) {
                this._value = this._script.apply( this._args );
                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }
                this._ran = true;
            }
            return this._value;
        };
        Object.defineProperty( Reference.prototype, "ran", {
            get:        function() {
                return this._ran;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( Reference.prototype, "closed", {
            get:          function() {
                return this._script === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        Reference.join = function(left, right, transform) {
            return new JoinedTransformReference( left, right, transform );
        };
        //Creates a binary tree (essentially) of joins from an array of References using a single transform
        Reference.join_all = function(refs, transform) {
            assert( Array.isArray( refs ), 'join_all can only join arrays of References' );
            if( refs.length === 0 ) {
                return null;
            }
            else if( refs.length === 1 ) {
                return refs[0];
            }
            else if( refs.length === 2 ) {
                return Reference.join( refs[0], refs[1], transform );
            }
            else {
                var mid = Math.floor( refs.length / 2 );
                var left = Reference.join_all( refs.slice( 0, mid ), transform );
                var right = Reference.join_all( refs.slice( mid ), transform );
                return Reference.join( left, right, transform );
            }
        };
        Reference.transform = function(ref, transform) {
            return new TransformReference( ref, transform );
        };
        Reference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        Reference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        Reference.prototype.left = function() {
            return this;
        };
        Reference.prototype.right = function() {
            return null;
        };
        Reference.prototype.close = function() {
            if( !this.closed ) {
                this._script.removeListener( 'change', this._onChange );
                delete this._value;
                delete this._script._reference;
                delete this._script; //Doesn't really delete it, just removes it from this
            }
        };
        return Reference;
    })( ReferenceBase );
    Scriptor.Reference = Reference;
    var TransformReference = (function(_super) {
        __extends( TransformReference, _super );
        function TransformReference(_ref, _transform) {
            var _this = this;
            _super.call( this );
            this._ref = _ref;
            this._transform = _transform;
            assert( _ref instanceof ReferenceBase, 'transform will only work on References' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            this._ref.on( 'change', this._onChange );
        }

        TransformReference.prototype.value = function() {
            if( !this._ran ) {
                this._value = this._transform( this._ref, null );
                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }
                this._ran = true;
            }
            return this._value;
        };
        Object.defineProperty( TransformReference.prototype, "ran", {
            get:          function() {
                return this._ran;
            },
            enumerable:   true,
            configurable: true
        } );
        Object.defineProperty( TransformReference.prototype, "closed", {
            get:          function() {
                return this._ref === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        TransformReference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        TransformReference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        TransformReference.prototype.left = function() {
            return this;
        };
        TransformReference.prototype.right = function() {
            return null;
        };
        TransformReference.prototype.close = function(recursive) {
            if( recursive === void 0 ) {
                recursive = false;
            }
            if( !this.closed ) {
                this._ref.removeListener( 'change', this._onChange );
                delete this._value;
                if( recursive ) {
                    this._ref.close( recursive );
                }
                delete this._ref;
            }
        };
        return TransformReference;
    })( ReferenceBase );
    Scriptor.TransformReference = TransformReference;
    var JoinedTransformReference = (function(_super) {
        __extends( JoinedTransformReference, _super );
        function JoinedTransformReference(_left, _right, _transform) {
            var _this = this;
            if( _transform === void 0 ) {
                _transform = Scriptor.identity;
            }
            _super.call( this );
            this._left = _left;
            this._right = _right;
            this._transform = _transform;
            //Just to prevent stupid mistakes
            assert( _left instanceof ReferenceBase && _right instanceof ReferenceBase,
                'join will only work on References' );
            assert.notEqual( _left, _right, 'Cannot join to self' );
            assert.strictEqual( typeof _transform, 'function', 'transform function must be a function' );
            //This has to be a closure because the two emitters down below
            //tend to call this with themselves as this
            this._onChange = function(event, filename) {
                _this.emit( 'change', event, filename );
                _this._ran = false;
            };
            _left.on( 'change', this._onChange );
            _right.on( 'change', this._onChange );
        }

        JoinedTransformReference.prototype.value = function() {
            //If anything needs to be re-run, re-run it
            if( !this._ran ) {
                this._value = this._transform( this._left, this._right );
                //Prevents overwriting over elements
                if( typeof this._value === 'object' ) {
                    this._value = Object.freeze( this._value );
                }
                this._ran = true;
            }
            return this._value;
        };
        Object.defineProperty( JoinedTransformReference.prototype, "ran", {
            get:        function() {
                return this._ran;
            },
            enumerable: true,
            configurable: true
        } );
        Object.defineProperty( JoinedTransformReference.prototype, "closed", {
            get:          function() {
                return this._left === void 0 || this._right === void 0;
            },
            enumerable:   true,
            configurable: true
        } );
        JoinedTransformReference.prototype.join = function(ref, transform) {
            return Reference.join( this, ref, transform );
        };
        JoinedTransformReference.prototype.transform = function(transform) {
            return Reference.transform( this, transform );
        };
        JoinedTransformReference.prototype.left = function() {
            return this._left;
        };
        JoinedTransformReference.prototype.right = function() {
            return this._right;
        };
        JoinedTransformReference.prototype.close = function(recursive) {
            if( recursive === void 0 ) {
                recursive = false;
            }
            if( !this.closed ) {
                this._left.removeListener( 'change', this._onChange );
                this._right.removeListener( 'change', this._onChange );
                delete this._value;
                if( recursive ) {
                    this._left.close( recursive );
                    this._right.close( recursive );
                }
                delete this._left;
                delete this._right;
            }
        };
        return JoinedTransformReference;
    })( ReferenceBase );
    Scriptor.JoinedTransformReference = JoinedTransformReference;
    /**** BEGIN SECTION MANAGER ****/
    var Manager = (function() {
        function Manager(grandParent) {
            this._scripts = {};
            this._cwd = process.cwd();
            this._parent = new Module.Module( 'ScriptManager', grandParent );
        }

        Object.defineProperty( Manager.prototype, "cwd", {
            get:          function() {
                return this._cwd;
            },
            set:          function(value) {
                this.chdir( value );
            },
            enumerable:   true,
            configurable: true
        } );
        Manager.prototype.chdir = function(value) {
            return this._cwd = path.resolve( this.cwd, value );
        };
        Object.defineProperty( Manager.prototype, "parent", {
            get:        function() {
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
        //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
        //but this functions as a way to add and/or get a script in one fell swoop.
        //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
        //from watching a file.
        Manager.prototype.add = function(filename, watch) {
            if( watch === void 0 ) {
                watch = true;
            }
            filename = path.resolve( this.cwd, filename );
            var script = this._scripts[filename];
            if( script === void 0 ) {
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
            filename = path.resolve( this.cwd, filename );
            var script = this._scripts[filename];
            if( script !== void 0 ) {
                if( close ) {
                    script.close();
                }
                return delete this._scripts[filename];
            }
            return false;
        };
        Manager.prototype.call = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.apply( filename, args );
        };
        Manager.prototype.apply = function(filename, args) {
            return this.add( filename ).apply( args );
        };
        Manager.prototype.once = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.apply_once( filename, args );
        };
        Manager.prototype.call_once = function(filename) {
            var args = [];
            for( var _i = 1; _i < arguments.length; _i++ ) {
                args[_i - 1] = arguments[_i];
            }
            return this.apply_once( filename, args );
        };
        Manager.prototype.apply_once = function(filename, args) {
            return this.add( filename ).apply_once( args );
        };
        Manager.prototype.get = function(filename) {
            filename = path.resolve( this.cwd, filename );
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
