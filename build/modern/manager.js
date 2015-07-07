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

'use strict';

var _inherits = require( 'babel-runtime/helpers/inherits' ).default;

var _createClass = require( 'babel-runtime/helpers/create-class' ).default;

var _classCallCheck = require( 'babel-runtime/helpers/class-call-check' ).default;

var _Map = require( 'babel-runtime/core-js/map' ).default;

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' ).default;

exports.__esModule = true;

var _module2 = require( 'module' );

var _module3 = _interopRequireDefault( _module2 );

var _assert = require( 'assert' );

var _assert2 = _interopRequireDefault( _assert );

var _path = require( 'path' );

var _utilsJs = require( './utils.js' );

var _scriptJs = require( './script.js' );

var _scriptJs2 = _interopRequireDefault( _scriptJs );

var ScriptAdapter = (function( _Script ) {
    function ScriptAdapter( manager, filename, parent ) {
        var _this = this;

        _classCallCheck( this, ScriptAdapter );

        _Script.call( this, filename, parent );

        this._manager = null;
        this._manager = manager;

        //When a script is renamed, it should be reassigned in the manager
        //Otherwise, when it's accessed at the new location, the manager just creates a new script
        this.on( 'rename', function( event, oldname, newname ) {
            _this._manager.scripts.set( newname, _this._manager.scripts.get( oldname ) );
            _this._manager.scripts.delete( oldname );
        } );
    }

    _inherits( ScriptAdapter, _Script );

    ScriptAdapter.prototype.include = function include( filename ) {
        var _this2 = this;

        var load = arguments[1] === undefined ? false : arguments[1];

        //make sure filename can be relative to the current script
        var real_filename = _path.resolve( this.baseUrl, filename );

        //Since add doesn't do anything to already existing scripts, but does return a script,
        //it can take care of the lookup or adding at the same time. Two birds with one lookup.
        var script = this._manager.add( real_filename );

        //Since include can be used independently of reference, make sure it's loaded before returning
        //Otherwise, the returned script is in an incomplete state
        if( load && !script.loaded ) {
            script.reload();
        }

        this.propagateFrom( script, 'change', function() {
            _this2.unload();
            _this2.emit( 'change', _this2.filename );
        } );

        script.propagateEvents( this.isPropagatingEvents() );

        script.maxRecursion = this.maxRecursion;

        return script;
    };

    ScriptAdapter.prototype.close = function close( permanent ) {
        if( permanent ) {
            delete this['_manager'];
        }

        return _Script.prototype.close.call( this, permanent );
    };

    _createClass( ScriptAdapter, [{
        key: 'manager',
        get: function get() {
            return this._manager;
        }
    }] );

    return ScriptAdapter;
})( _scriptJs2.default );

var Manager = (function() {
    function Manager( grandParent ) {
        _classCallCheck( this, Manager );

        this._debounceMaxWait = null;
        this._maxListeners = null;
        this._config = null;
        this._cwd = process.cwd();
        this._scripts = new _Map();
        this._parent = null;
        this._propagateEvents = false;

        this._parent = new _module3.default( 'ScriptManager', grandParent );
    }

    Manager.prototype.cwd = function cwd() {
        return this._cwd;
    };

    Manager.prototype.chdir = function chdir( value ) {
        this._cwd = _path.resolve( this.cwd(), value );

        return this._cwd;
    };

    Manager.prototype.setMaxListeners = function setMaxListeners( value ) {
        if( value !== null && value !== void 0 ) {

            value = Math.floor( value );

            _assert2.default( !isNaN( value ), 'setMaxListeners must be passed a number' );

            this._maxListeners = value;
        } else {
            this._maxListeners = null;
        }
    };

    Manager.prototype.getMaxListeners = function getMaxListeners() {
        return this._maxListeners;
    };

    Manager.prototype.config = function config( _config2 ) {
        if( _config2 !== void 0 && _config2 !== null ) {
            this._config = _utilsJs.normalizeConfig( _config2 );
        }

        return this._config;
    };

    Manager.prototype.propagateEvents = function propagateEvents() {
        var enable = arguments[0] === undefined ? true : arguments[0];

        var wasPropagating = this._propagateEvents;

        this._propagateEvents = enable;

        if( wasPropagating && !enable ) {
            //immediately disable propagation by pretending it's already been propagated
            this._scripts.forEach( function( script ) {
                script.propagateEvents( false );
            } );
        } else if( !wasPropagating && enable ) {
            this._scripts.forEach( function( script ) {
                script.propagateEvents( true );
            } );
        }
    };

    //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
    //but this functions as a way to add and/or get a script in one fell swoop.
    //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
    //from watching a file.

    Manager.prototype.add = function add( filename ) {
        var watch = arguments[1] === undefined ? true : arguments[1];

        filename = _path.resolve( this.cwd(), filename );

        var script = this._scripts.get( filename );

        if( script === void 0 ) {
            script = new ScriptAdapter( this, null, this._parent );

            if( this._propagateEvents ) {
                script.propagateEvents();
            }

            if( this.debounceMaxWait !== null && this.debounceMaxWait !== void 0 ) {
                script.debounceMaxWait = this.debounceMaxWait;
            }

            if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
                script.setMaxListeners( this._maxListeners );
            }

            if( this._config !== void 0 && this._config !== null ) {
                script.config( this._config );
            }

            script.load( filename, watch );

            this._scripts.set( filename, script );
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

    Manager.prototype.remove = function remove( filename ) {
        var close = arguments[1] === undefined ? true : arguments[1];

        filename = _path.resolve( this.cwd(), filename );

        var script = this._scripts.get( filename );

        if( script !== void 0 ) {
            if( close ) {
                script.close();
            }

            return this._scripts.delete( filename );
        }

        return false;
    };

    Manager.prototype.call = function call( filename ) {
        for( var _len = arguments.length, args = Array( _len > 1 ? _len - 1 : 0 ), _key = 1; _key < _len; _key++ ) {
            args[_key - 1] = arguments[_key];
        }

        return this.apply( filename, args );
    };

    Manager.prototype.apply = function apply( filename, args ) {
        var script = this.add( filename, false );

        try {
            return script.apply( args );
        } catch( err ) {
            this.remove( filename, true );

            throw err;
        }
    };

    Manager.prototype.reference = function reference( filename ) {
        for( var _len2 = arguments.length, args = Array( _len2 > 1 ? _len2 - 1 : 0 ), _key2 = 1; _key2 < _len2;
             _key2++ ) {
            args[_key2 - 1] = arguments[_key2];
        }

        return this.reference_apply( filename, args );
    };

    Manager.prototype.reference_apply = function reference_apply( filename, args ) {
        var ref = this.add( filename, false ).reference( args );

        if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
            ref.setMaxListeners( this._maxListeners );
        }

        return ref;
    };

    Manager.prototype.get = function get( filename ) {
        filename = _path.resolve( this.cwd(), filename );

        return this._scripts.get( filename );
    };

    //Make closing optional for the same reason as .remove

    Manager.prototype.clear = function clear() {
        var close = arguments[0] === undefined ? true : arguments[0];

        if( close ) {
            this._scripts.forEach( function( script ) {
                script.close();
            } );
        }

        this._scripts.clear();
    };

    _createClass( Manager, [{
        key: 'parent',
        get: function get() {
            return this._parent;
        }
    }, {
        key: 'scripts',
        get: function get() {
            return this._scripts;
        }
    }, {
        key: 'debounceMaxWait',
        get: function get() {
            return this._debounceMaxWait;
        },
        set: function set( time ) {
            if( time !== null && time !== void 0 ) {
                time = Math.floor( time );

                _assert2.default( !isNaN( time ), 'debounceMaxWait must be set to a number' );

                this._debounceMaxWait = time;
            } else {
                this._debounceMaxWait = null;
            }
        }
    }] );

    return Manager;
})();

exports.default = Manager;
module.exports = exports.default;
