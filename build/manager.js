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

var _map = require( "babel-runtime/core-js/map" );

var _map2 = _interopRequireDefault( _map );

var _classCallCheck2 = require( "babel-runtime/helpers/classCallCheck" );

var _classCallCheck3 = _interopRequireDefault( _classCallCheck2 );

var _createClass2 = require( "babel-runtime/helpers/createClass" );

var _createClass3 = _interopRequireDefault( _createClass2 );

var _possibleConstructorReturn2 = require( "babel-runtime/helpers/possibleConstructorReturn" );

var _possibleConstructorReturn3 = _interopRequireDefault( _possibleConstructorReturn2 );

var _inherits2 = require( "babel-runtime/helpers/inherits" );

var _inherits3 = _interopRequireDefault( _inherits2 );

var _module = require( "module" );

var _module2 = _interopRequireDefault( _module );

var _assert = require( "assert" );

var _assert2 = _interopRequireDefault( _assert );

var _path = require( "path" );

var _utils = require( "./utils.js" );

var _script = require( "./script.js" );

var _script2 = _interopRequireDefault( _script );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/*
 * This is a modification of Script which allows it to be spawned and managed by a Manager instance.
 *
 * It provides extra handling for including other scripts, which are also loaded into the owning manager.
 * */

var ManagedScript = function( _Script ) {
    (0, _inherits3.default)( ManagedScript, _Script );

    function ManagedScript( manager, filename, parent ) {
        (0, _classCallCheck3.default)( this, ManagedScript );

        var _this = (0, _possibleConstructorReturn3.default)( this, _Script.call( this, filename, parent ) );

        _this._manager = null;


        _this._manager = manager;

        //When a script is renamed, it should be reassigned in the manager
        //Otherwise, when it's accessed at the new location, the manager just creates a new script
        _this.on( 'rename', function( event, oldname, newname ) {
            var scripts = _this._manager.scripts;


            scripts.set( newname, scripts.get( oldname ) );
            scripts.delete( oldname );
        } );
        return _this;
    }

    ManagedScript.prototype.include = function include( filename ) {
        var _this2 = this;

        var load = arguments.length <= 1 || arguments[1] === void 0 ? false : arguments[1];

        //make sure filename can be relative to the current script
        var real_filename = (0, _path.resolve)( this.baseUrl, filename );

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

        return script;
    };

    ManagedScript.prototype.close = function close( permanent ) {
        if( permanent ) {
            this._manager.scripts.delete( this.filename );

            delete this['_manager'];
        }

        return _Script.prototype.close.call( this, permanent );
    };

    (0, _createClass3.default)( ManagedScript, [{
        key: "manager",
        get: function get() {
            return this._manager;
        }
    }] );
    return ManagedScript;
}( _script2.default );

/*
 * This Manager class really just takes care of a Map instance of ManagedScripts and allows configuring them all at once
 * and automatically.
 * */

/**
 * Created by Aaron on 7/5/2015.
 */

var Manager = function() {
    function Manager( grandParent ) {
        (0, _classCallCheck3.default)( this, Manager );
        this._debounceMaxWait = null;
        this._maxListeners    = null;
        this._config          = null;
        this._cwd             = process.cwd();
        this._scripts         = new _map2.default();
        this._parent          = null;
        this._propagateEvents = false;
        this._unloadOnRename  = null;

        this._parent = new _module2.default( 'ScriptManager', grandParent );
    }

    Manager.prototype.cwd = function cwd() {
        return this._cwd;
    };

    Manager.prototype.chdir = function chdir( value ) {
        this._cwd = (0, _path.resolve)( this.cwd(), value );

        return this._cwd;
    };

    Manager.prototype.setMaxListeners = function setMaxListeners( value ) {
        if( value !== null && value !== void 0 ) {

            value = Math.floor( value );

            (0, _assert2.default)( !isNaN( value ), 'setMaxListeners must be passed a number' );

            this._maxListeners = value;
        } else {
            this._maxListeners = null;
        }
    };

    Manager.prototype.getMaxListeners = function getMaxListeners() {
        return this._maxListeners;
    };

    Manager.prototype.config = function config( _config ) {
        var _this3 = this;

        this._config = (0, _utils.normalizeConfig)( _config );

        this._scripts.forEach( function( script ) {
            script.config( _this3._config, true );
            script.unload();
        } );
    };

    Manager.prototype.propagateEvents = function propagateEvents() {
        var enable = arguments.length <= 0 || arguments[0] === void 0 ? true : arguments[0];

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

    Manager.prototype._modifyScript = function _modifyScript( script ) {
        if( script !== void 0 ) {
            if( this._propagateEvents ) {
                script.propagateEvents();
            }

            if( this.debounceMaxWait !== null && this.debounceMaxWait !== void 0 ) {
                script.debounceMaxWait = this.debounceMaxWait;
            }

            if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
                script.setMaxListeners( this._maxListeners );
            }

            if( this._config !== null && this._config !== void 0 ) {
                script.config( this._config, true );
            }

            if( this._unloadOnRename !== null && this._unloadOnRename !== void 0 ) {
                script.unloadOnRename = this._unloadOnRename;
            }
        }

        return script;
    };

    /*
     * this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
     * but this functions as a way to add and/or get a script in one fell swoop.
     * Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
     * from watching a file.
     * */


    Manager.prototype.add = function add( filename ) {
        var watch = arguments.length <= 1 || arguments[1] === void 0 ? true : arguments[1];

        filename = (0, _path.resolve)( this.cwd(), filename );

        var script = this._scripts.get( filename );

        if( script === void 0 ) {
            script = new ManagedScript( this, null, this._parent );

            script.load( filename, watch );

            this._scripts.set( filename, script );
        }

        this._modifyScript( script );

        //Even if the script is added, this allows it to be watched, though not unwatched.
        //Unwatching still has to be done manually
        if( watch ) {
            script.watch();
        }

        return script;
    };

    /*
     * Removes a script from the manager. But closing it permenantly is optional,
     * as it may sometimes make sense to move it out of a manager and use it independently.
     * However, that is quite rare so close defaults to true
     * */


    Manager.prototype.remove = function remove( filename ) {
        var close = arguments.length <= 1 || arguments[1] === void 0 ? true : arguments[1];

        filename = (0, _path.resolve)( this.cwd(), filename );

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
        (0, _assert2.default)( Array.isArray( args ) );

        var script = this.add( filename, false );

        try {
            return script.apply( args );
        } catch( err ) {
            this.remove( filename, true );

            throw err;
        }
    };

    Manager.prototype.get = function get( filename ) {
        filename = (0, _path.resolve)( this.cwd(), filename );

        return this._modifyScript( this._scripts.get( filename ) );
    };

    //Make closing optional for the same reason as .remove


    Manager.prototype.clear = function clear() {
        var close = arguments.length <= 0 || arguments[0] === void 0 ? true : arguments[0];

        if( close ) {
            this._scripts.forEach( function( script ) {
                script.close();
            } );
        }

        this._scripts.clear();
    };

    (0, _createClass3.default)( Manager, [{
        key: "parent",
        get: function get() {
            return this._parent;
        }
    }, {
        key: "scripts",
        get: function get() {
            return this._scripts;
        }
    }, {
        key: "debounceMaxWait",
        get: function get() {
            return this._debounceMaxWait;
        },
        set: function set( time ) {
            if( time !== null && time !== void 0 ) {
                time = Math.floor( time );

                (0, _assert2.default)( !isNaN( time ), 'debounceMaxWait must be set to a number' );

                this._debounceMaxWait = time;
            } else {
                this._debounceMaxWait = null;
            }
        }
    }, {
        key: "unloadOnRename",
        set: function set( value ) {
            this._unloadOnRename = !!value;
        },
        get: function get() {
            return this._unloadOnRename;
        }
    }] );
    return Manager;
}();

exports.default = Manager;
