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
'use strict';

exports.__esModule = true;

var _getIterator2 = require( 'babel-runtime/core-js/get-iterator' );

var _getIterator3 = _interopRequireDefault( _getIterator2 );

var _freeze = require( 'babel-runtime/core-js/object/freeze' );

var _freeze2 = _interopRequireDefault( _freeze );

exports.default = function( argv ) {
    process.options = _commander2.default.parse( argv );

    if( _commander2.default.use_strict ) {
        _module2.default.wrapper[0] += '"use strict";';
        (0, _freeze2.default)( _module2.default.wrap );
    }

    if( !_commander2.default.no_title ) {
        process.title = 'Scriptor';
    }

    //The default log_level is LOG_NORMAL
    var log_level = _cli.LogLevel.LOG_NORMAL;

    //If silent mode is enabled, it overrides verbose mode
    if( _commander2.default.silent ) {
        log_level = _cli.LogLevel.LOG_SILENT;
    } else if( _commander2.default.verbose ) {
        //If using the -v shorthand, it is essentially --verbose 2
        if( typeof _commander2.default.verbose === 'boolean' ) {
            log_level = _cli.LogLevel.LOG_VERBOSE;
        } else {
            log_level = parseInt( _commander2.default.verbose );

            //Instead of throwing an error, just use the normal level
            if( isNaN( log_level ) ) {
                log_level = _cli.LogLevel.LOG_NORMAL;
            }
        }
    }

    //Create the logger
    var logger = new _cli.Logger( log_level );

    //Unhandled errors are printed and the process is killed
    var onError = function onError( error ) {
        logger.error( error.stack || error );
        process.exit( EXIT_FAILURE );
    };

    process.on( 'uncaughtException', onError );
    process.on( 'unhandledRejection', onError );

    var scripts = void 0;

    if( !_commander2.default.no_glob ) {
        scripts = [];

        for( var _iterator = _commander2.default.args, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ? _iterator :
                                                                                                                  (0, _getIterator3.default)(
                                                                                                                      _iterator ); ; ) {
            var _ref;

            if( _isArray ) {
                if( _i >= _iterator.length ) {
                    break;
                }
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if( _i.done ) {
                    break;
                }
                _ref = _i.value;
            }

            var arg = _ref;

            if( _glob2.default.hasMagic( arg ) ) {
                scripts = scripts.concat( _glob2.default.sync( arg ) );
            } else {
                scripts.push( arg );
            }
        }
    } else {
        scripts = _commander2.default.args;
    }

    if( _commander2.default.unique ) {
        (function() {
            logger.info( 'Only executing unique scripts' );

            var uniqueScripts = [];

            scripts.forEach( function( script ) {
                if( uniqueScripts.indexOf( script ) === -1 ) {
                    uniqueScripts.push( script );
                }
            } );

            scripts = uniqueScripts;
        })();
    }

    if( _commander2.default.repeat ) {
        var count = parseInt( _commander2.default.repeat );

        if( !isNaN( count ) && count > 1 ) {
            logger.info( 'Repeating script execution ' + count + ' times' );

            var newScripts = [];

            for( var i = 0; i < count; i++ ) {
                newScripts = newScripts.concat( scripts );
            }

            scripts = newScripts;
        }
    }

    /*
     * options.dir only says the directory scriptor will be run in,
     * not the directory where it looks for files. So it will resolve files relative to the
     * invocation location, but change process.cwd to the new location.
     * Since the script files will be absolute now, now issues should arrive when using the manager.
     * */
    if( typeof _commander2.default.dir === 'string' ) {
        scripts = scripts.map( function( script ) {
            return _path2.default.resolve( process.cwd(), script );
        } );

        process.chdir( _commander2.default.dir );
    }

    //Only run anything if there are any scripts to run, otherwise show the help
    if( scripts.length > 0 ) {
        (function() {
            if( _commander2.default.long_stack_traces ) {
                _index2.default.Promise.longStackTraces();
                logger.info( 'Long Stack Traces enabled' );
            }

            //New manager created, using process.cwd as the cwd
            var manager = new _index2.default.Manager();

            if( _commander2.default.propagate ) {
                manager.propagateEvents();
            }

            var concurrency = 10,
                watch       = void 0,
                debounce    = void 0;

            if( typeof _commander2.default.debounce === 'string' ) {
                debounce = manager.debounceMaxWait = toMilliseconds( _commander2.default.debounce );
            }

            if( typeof _commander2.default.max_listeners === 'string' ) {
                var maxListeners = parseInt( _commander2.default.max_listeners );

                if( isFinite( maxListeners ) ) {
                    manager.setMaxListeners( maxListeners );
                } else {
                    logger.error( 'Not a finite Number value for option --max_listeners' );
                    process.exit( EXIT_FAILURE );
                }
            }

            if( _commander2.default.concurrency ) {
                concurrency = parseIntOrInfinity( _commander2.default.concurrency );

                if( isNaN( concurrency ) ) {
                    logger.error( 'Not a Number value for option -c, --concurrency' );
                    process.exit( EXIT_FAILURE );
                }
            }

            //Close overrides watch, so if it is set to close, don't even both watching the scripts
            if( _commander2.default.watch && !_commander2.default.close ) {
                watch = true;
            }

            var run_script   = void 0,
                script_start = process.hrtime(),
                place        = 0,
                instances    = [];

            if( !_commander2.default.no_signal ) {
                (function() {
                    var closed = false;

                    var onClose = function onClose( signal ) {
                        if( !closed ) {

                            for( var _iterator2 = instances, _isArray2 = Array.isArray( _iterator2 ), _i2 = 0, _iterator2 = _isArray2 ?
                                                                                                                            _iterator2 :
                                                                                                                            (0, _getIterator3.default)(
                                                                                                                                _iterator2 ); ; ) {
                                var _ref2;

                                if( _isArray2 ) {
                                    if( _i2 >= _iterator2.length ) {
                                        break;
                                    }
                                    _ref2 = _iterator2[_i2++];
                                } else {
                                    _i2 = _iterator2.next();
                                    if( _i2.done ) {
                                        break;
                                    }
                                    _ref2 = _i2.value;
                                }

                                var instance = _ref2;

                                instance.unload();
                            }

                            //Close on the next tick so close events can propagate.
                            //Exit code for Ctrl-C signals is 128 + sig according to
                            // http://www.tldp.org/LDP/abs/html/exitcodes.html
                            process.nextTick( process.exit.bind( null, 128 + signal ) );

                            closed = true;
                        }
                    };

                    process.on( 'SIGINT', onClose.bind( null, constants.SIGINT ) );
                    process.on( 'SIGTERM', onClose.bind( null, constants.SIGTERM ) );
                })();
            }

            run_script = function run_script( instance, script, num ) {
                var start = process.hrtime();

                if( log_level === _cli.LogLevel.LOG_SILENT || _commander2.default.cork ) {
                    process.stdout.cork();
                }

                return instance.call().then( function() {
                    logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
                } );
            };

            logger.info( 'Concurrency set at %s', concurrency );

            _index2.default.Promise.map( scripts, function( script ) {
                var num = place++;

                logger.verbose( 'Running script #%d, %s.', num, script );

                var instance = manager.add( script, false );

                instances.push( instance );

                if( watch ) {
                    instance.watch( true );

                    var onChange = function onChange() {
                        logger.verbose( 'Re-running script #%d, %s', num, script );
                        run_script( instance, script, num );
                    };

                    if( typeof debounce === 'number' ) {
                        onChange = _lodash2.default.debounce( onChange, debounce );
                    }

                    instance.on( 'change', onChange );
                }

                return run_script( instance, script, num );
            }, {
                concurrency: concurrency

            } ).catch( onError ).then( function() {
                logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

                if( _commander2.default.close ) {
                    process.exit( EXIT_SUCCESS );
                }
            } );
        })();
    } else {
        _commander2.default.help();
    }
};

var _commander = require( 'commander' );

var _commander2 = _interopRequireDefault( _commander );

var _module = require( 'module' );

var _module2 = _interopRequireDefault( _module );

var _glob = require( 'glob' );

var _glob2 = _interopRequireDefault( _glob );

var _path = require( 'path' );

var _path2 = _interopRequireDefault( _path );

var _package = require( './../package.json' );

var _package2 = _interopRequireDefault( _package );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _defaults = require( './../build/modern/defaults.js' );

var _cli = require( './tools/cli.js' );

var _index = require( './../build/modern/index.js' );

var _index2 = _interopRequireDefault( _index );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Created by Aaron on 6/30/2015.
 */

var constants = process.binding( 'constants' );

function diff_ms( start ) {
    var _process$hrtime = process.hrtime( start );

    var seconds     = _process$hrtime[0];
    var nanoseconds = _process$hrtime[1];


    var milliseconds = seconds * 1e3 + nanoseconds * 1e-6;

    return milliseconds.toFixed( 3 ) + 'ms';
}

var ms_pattern = /([0-9]+)([A-Z]+)?/i;

function toMilliseconds( str ) {
    var match = str.match( ms_pattern );

    if( match ) {
        var i = parseInt( match[1] );

        if( !isNaN( i ) ) {
            var u = match[2];

            if( typeof u === 'string' ) {
                u = u.toLowerCase();
            } else if( u === void 0 ) {
                return i;
            }

            switch( u ) {
                case 'ms':
                    return i;
                case 's':
                    return i * 1000;
                case 'm':
                    return i * 60 * 1000;
                case 'h':
                    return i * 60 * 60 * 1000;
                case 'd':
                    return i * 24 * 60 * 60 * 1000;
                case 'y':
                    return i * 365 * 24 * 60 * 60 * 1000;
                default:
                    return i;
            }
        }
    }

    return null;
}

function parseIntOrInfinity( value ) {
    if( value.toLowerCase() === 'infinity' ) {
        return Infinity;
    } else {
        return parseInt( value );
    }
}

//Process status codes
var EXIT_SUCCESS = 0,
    EXIT_FAILURE = 1;

_commander2.default.version( _package2.default.version ).usage( '[options] files...' )
    .option( '-d, --dir <path>', 'Directory to run Scriptor in' )
    .option( '-c, --concurrency <n>', 'Limit asynchronous script concurrency to n (default: 10)' )
    .option( '-q, --close', 'End the process when all scripts finish' )
    .option( '-w, --watch', 'Watch scripts for changes and re-run them when changed' )
    .option( '-p, --propagate', 'Propagate changes upwards when watching scripts' )
    .option( '-l, --long_stack_traces', 'Display long stack trace for errors' )
    .option( '-r, --repeat <n>', 'Run script n times (in parallel if possible)' )
    .option( '-u, --unique', 'Only run unique scripts (will ignore duplicates in file arguments)' ).option( '--debounce <n>',
    'Wait n milliseconds for debounce on file watching events (default: ' + _defaults.default_debounceMaxWait + 'ms)' )
    .option( '--use_strict', 'Enforce strict mode' )
    .option( '--max_listeners <n>', 'Set the maximum number of listeners on any particular script' )
    .option( '-v, --verbose [n]', 'Print out extra status information (0 - normal, 1 - info, 2 - verbose)' )
    .option( '--cork', 'Cork stdout before calling scripts' ).option( '-s, --silent', 'Do not echo anything' )
    .option( '--no_signal', 'Do not intercept process signals' ).option( '--no_glob', 'Do not match glob patterns' )
    .option( '--no_title', 'Do not set process title' );
