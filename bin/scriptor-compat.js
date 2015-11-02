/**
 * Created by Aaron on 6/30/2015.
 */

'use strict';

var _slicedToArray = require( 'babel-runtime/helpers/sliced-to-array' )['default'];

var _Object$freeze = require( 'babel-runtime/core-js/object/freeze' )['default'];

var _getIterator = require( 'babel-runtime/core-js/get-iterator' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

Object.defineProperty( exports, '__esModule', {
    value: true
} );

var _commander = require( 'commander' );

var _commander2 = _interopRequireDefault( _commander );

var _module2 = require( 'module' );

var _module3 = _interopRequireDefault( _module2 );

var _glob = require( 'glob' );

var _glob2 = _interopRequireDefault( _glob );

var _path = require( 'path' );

var _path2 = _interopRequireDefault( _path );

var _packageJson = require( './../package.json' );

var _packageJson2 = _interopRequireDefault( _packageJson );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var _buildCompatDefaultsJs = require( './../build/compat/defaults.js' );

var _toolsCliJs = require( './tools/cli.js' );

var _buildCompatIndexJs = require( './../build/compat/index.js' );

var _buildCompatIndexJs2 = _interopRequireDefault( _buildCompatIndexJs );

var constants = process.binding( 'constants' );

function diff_ms( start ) {
    var _process$hrtime = process.hrtime( start );

    var _process$hrtime2 = _slicedToArray( _process$hrtime, 2 );

    var seconds = _process$hrtime2[0];
    var nanoseconds = _process$hrtime2[1];

    var milliseconds = seconds * 1000 + nanoseconds * 0.000001;

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

_commander2['default'].version( _packageJson2['default'].version + '-compat' ).usage( '[options] files...' )
                      .option( '-d, --dir <path>', 'Directory to run Scriptor in' )
                      .option( '-c, --concurrency <n>', 'Limit asynchronous script concurrency to n (default: 10)' )
                      .option( '-q, --close', 'End the process when all scripts finish' )
                      .option( '-w, --watch', 'Watch scripts for changes and re-run them when changed' )
                      .option( '-p, --propagate', 'Propagate changes upwards when watching scripts' )
                      .option( '-l, --long_stack_traces', 'Display long stack trace for errors' )
                      .option( '-r, --repeat <n>', 'Run script n times (in parallel if possible)' )
                      .option( '-u, --unique', 'Only run unique scripts (will ignore duplicates in file arguments)' )
                      .option( '--debounce <n>', 'Wait n milliseconds for debounce on file watching events (default: '
                                                 + _buildCompatDefaultsJs.default_debounceMaxWait + 'ms)' )
                      .option( '--use_strict', 'Enforce strict mode' )
                      .option( '--max_listeners <n>', 'Set the maximum number of listeners on any particular script' )
                      .option( '-v, --verbose [n]',
                          'Print out extra status information (0 - normal, 1 - info, 2 - verbose)' )
                      .option( '--cork', 'Cork stdout before calling scripts' )
                      .option( '-s, --silent', 'Do not echo anything' )
                      .option( '--no_signal', 'Do not intercept process signals' )
                      .option( '--no_glob', 'Do not match glob patterns' )
                      .option( '--no_title', 'Do not set process title' );

exports['default'] = function( argv ) {
    process.options = _commander2['default'].parse( argv );

    if( _commander2['default'].use_strict ) {
        _module3['default'].wrapper[0] += '"use strict";';
        _Object$freeze( _module3['default'].wrap );
    }

    if( !_commander2['default'].no_title ) {
        process.title = 'Scriptor';
    }

    //The default log_level is LOG_NORMAL
    var log_level = _toolsCliJs.LogLevel.LOG_NORMAL;

    //If silent mode is enabled, it overrides verbose mode
    if( _commander2['default'].silent ) {
        log_level = _toolsCliJs.LogLevel.LOG_SILENT;
    } else if( _commander2['default'].verbose ) {
        //If using the -v shorthand, it is essentially --verbose 2
        if( typeof _commander2['default'].verbose === 'boolean' ) {
            log_level = _toolsCliJs.LogLevel.LOG_VERBOSE;
        } else {
            log_level = parseInt( _commander2['default'].verbose );

            //Instead of throwing an error, just use the normal level
            if( isNaN( log_level ) ) {
                log_level = _toolsCliJs.LogLevel.LOG_NORMAL;
            }
        }
    }

    //Create the logger
    var logger = new _toolsCliJs.Logger( log_level );

    //Unhandled errors are printed and the process is killed
    var onError = function onError( error ) {
        logger.error( error.stack || error );
        process.exit( 1 );
    };

    process.on( 'uncaughtException', onError );
    process.on( 'unhandledRejection', onError );

    var scripts = undefined;

    if( !_commander2['default'].no_glob ) {
        scripts = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;

        var _iteratorError = void 0;

        try {
            for( var _iterator = _getIterator( _commander2['default'].args ), _step;
                 !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true ) {
                var arg = _step.value;

                if( _glob2['default'].hasMagic( arg ) ) {
                    scripts = scripts.concat( _glob2['default'].sync( arg ) );
                } else {
                    scripts.push( arg );
                }
            }
        } catch( err ) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if( !_iteratorNormalCompletion && _iterator['return'] ) {
                    _iterator['return']();
                }
            } finally {
                if( _didIteratorError ) {
                    throw _iteratorError;
                }
            }
        }
    } else {
        scripts = _commander2['default'].args;
    }

    if( _commander2['default'].unique ) {
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

    if( _commander2['default'].repeat ) {
        var count = parseInt( _commander2['default'].repeat );

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
    if( typeof _commander2['default'].dir === 'string' ) {
        scripts = scripts.map( function( script ) {
            return _path2['default'].resolve( process.cwd(), script );
        } );

        process.chdir( _commander2['default'].dir );
    }

    //Only run anything if there are any scripts to run, otherwise show the help
    if( scripts.length > 0 ) {
        (function() {
            if( _commander2['default'].long_stack_traces ) {
                _buildCompatIndexJs2['default'].Promise.longStackTraces();
                logger.info( 'Long Stack Traces enabled' );
            }

            //New manager created, using process.cwd as the cwd
            var manager = new _buildCompatIndexJs2['default'].Manager();

            if( _commander2['default'].propagate ) {
                manager.propagateEvents();
            }

            var concurrency = 10,
                watch       = undefined,
                debounce    = undefined;

            if( typeof _commander2['default'].debounce === 'string' ) {
                debounce = manager.debounceMaxWait = toMilliseconds( _commander2['default'].debounce );
            }

            if( typeof _commander2['default'].max_listeners === 'string' ) {
                var maxListeners = parseInt( _commander2['default'].max_listeners );

                if( isFinite( maxListeners ) ) {
                    manager.setMaxListeners( maxListeners );
                } else {
                    logger.error( 'Not a finite Number value for option --max_listeners' );
                    process.exit( EXIT_FAILURE );
                }
            }

            if( _commander2['default'].concurrency ) {
                concurrency = parseIntOrInfinity( _commander2['default'].concurrency );

                if( isNaN( concurrency ) ) {
                    logger.error( 'Not a Number value for option -c, --concurrency' );
                    process.exit( EXIT_FAILURE );
                }
            }

            //Close overrides watch, so if it is set to close, don't even both watching the scripts
            if( _commander2['default'].watch && !_commander2['default'].close ) {
                watch = true;
            }

            var run_script   = undefined,
                script_start = process.hrtime(),
                place        = 0,
                instances    = [];

            if( !_commander2['default'].no_signal ) {
                (function() {
                    var closed = false;

                    var onClose = function onClose( signal ) {
                        if( !closed ) {
                            var _iteratorNormalCompletion2 = true;
                            var _didIteratorError2 = false;

                            var _iteratorError2 = void 0;

                            try {

                                for( var _iterator2 = _getIterator( instances ), _step2;
                                     !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
                                     _iteratorNormalCompletion2 = true ) {
                                    var instance = _step2.value;

                                    instance.unload();
                                }

                                //Close on the next tick so close events can propagate.
                                //Exit code for Ctrl-C signals is 128 + sig according to
                                // http://www.tldp.org/LDP/abs/html/exitcodes.html
                            } catch( err ) {
                                _didIteratorError2 = true;
                                _iteratorError2 = err;
                            } finally {
                                try {
                                    if( !_iteratorNormalCompletion2 && _iterator2['return'] ) {
                                        _iterator2['return']();
                                    }
                                } finally {
                                    if( _didIteratorError2 ) {
                                        throw _iteratorError2;
                                    }
                                }
                            }

                            process.nextTick( process.exit.bind( null, 128 + signal ) );

                            closed = true;
                        }
                    };

                    process.on( 'SIGINT', onClose.bind( null, constants.SIGINT ) );
                    process.on( 'SIGTERM', onClose.bind( null, constants.SIGTERM ) );
                })();
            }

            run_script = function( instance, script, num ) {
                var start = process.hrtime();

                if( log_level === _toolsCliJs.LogLevel.LOG_SILENT || _commander2['default'].cork ) {
                    process.stdout.cork();
                }

                return instance.call().then( function() {
                    logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
                } );
            };

            logger.info( 'Concurrency set at %s', concurrency );

            _buildCompatIndexJs2['default'].Promise.map( scripts, function( script ) {
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
                        onChange = _lodash2['default'].debounce( onChange, debounce );
                    }

                    instance.on( 'change', onChange );
                }

                return run_script( instance, script, num );
            }, {
                concurrency: concurrency

            } )['catch']( onError ).then( function() {
                logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

                if( _commander2['default'].close ) {
                    process.exit( EXIT_SUCCESS );
                }
            } );
        })();
    } else {
        _commander2['default'].help();
    }
};

module.exports = exports['default'];
