/**
 * Created by Aaron on 6/30/2015.
 */

'use strict';

var _Object$freeze = require( 'babel-runtime/core-js/object/freeze' )['default'];

var _getIterator = require( 'babel-runtime/core-js/get-iterator' )['default'];

var _interopRequireDefault = require( 'babel-runtime/helpers/interop-require-default' )['default'];

exports.__esModule = true;

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

var _buildCompatCommon = require( './../build/compat/common' );

var _buildCompatCommon2 = _interopRequireDefault( _buildCompatCommon );

var _buildCompatCli = require( './../build/compat/cli' );

var _buildCompatCli2 = _interopRequireDefault( _buildCompatCli );

var _lodash = require( 'lodash' );

var _lodash2 = _interopRequireDefault( _lodash );

var constants = process.binding( 'constants' );

function diff_ms(start) {
    var _process$hrtime = process.hrtime( start );

    var seconds = _process$hrtime[0];
    var nanoseconds = _process$hrtime[1];

    var milliseconds = seconds * 1000 + nanoseconds * 0.000001;

    return milliseconds.toFixed( 3 ) + 'ms';
}

var ms_pattern = /([0-9]+)([A-Z]+)?/i;

function toMilliseconds(str) {
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

function parseIntOrInfinity(value) {
    if( value.toLowerCase() === 'infinity' ) {
        return Infinity;
    } else {
        return parseInt( value );
    }
}

//Process status codes
var EXIT_SUCCESS = 0,
    EXIT_FAILURE = 1;

_commander2['default'].version( _packageJson2['default'].version ).usage( '[options] files...' ).option( '-d, --dir <path>',
                                                                                                         'Directory to run Scriptor in' ).option( '-a, --async',
                                                                                                                                                  'Run scripts asynchronously' ).option( '-c, --concurrency <n>',
                                                                                                                                                                                         'Limit script concurrency to n when executed asynchronously (default: max_recursion + 1)' ).option( '-q, --close',
                                                                                                                                                                                                                                                                                             'End the process when all scripts finish' ).option( '-w, --watch',
                                                                                                                                                                                                                                                                                                                                                 'Watch scripts for changes and re-run them when changed' ).option( '-p, --propagate',
                                                                                                                                                                                                                                                                                                                                                                                                                    'Propagate changes upwards when watching scripts' ).option( '-l, --long_stack_traces',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'Display long stack trace for asynchronous errors' ).option( '-r, --repeat <n>',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             'Run script n times (in parallel if async)' ).option( '-u, --unique',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'Only run unique scripts (will ignore duplicates in file arguments)' ).option( '--debounce <n>',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  'Wait n milliseconds for debounce on file watching events (default: '
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  + _buildCompatCommon2['default'].default_debounceMaxWait
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  + 'ms)' ).option( '--use_strict',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'Enforce strict mode' ).option( '--max_listeners <n>',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'Set the maximum number of listeners on any particular script' ).option( '--max_recursion <n>',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             'Set the maximum recursion depth of scripts (default: '
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             + _buildCompatCommon2['default'].default_max_recursion
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             + ')' ).option( '-v, --verbose [n]',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             'Print out extra status information (0 - normal, 1 - info, 2 - verbose)' ).option( '--cork',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'Cork stdout before calling scripts' ).option( '-s, --silent',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'Do not echo anything' ).option( '--no_ext',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'Disable use of custom extensions with AMD injection' ).option( '--no_signal',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'Do not intercept process signals' ).option( '--no_glob',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             'Do not match glob patterns' ).option( '--no_title',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'Do not set process title' );

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
    var log_level = _buildCompatCli2['default'].LogLevel.LOG_NORMAL;

    //If silent mode is enabled, it overrides verbose mode
    if( _commander2['default'].silent ) {
        log_level = _buildCompatCli2['default'].LogLevel.LOG_SILENT;
    } else if( _commander2['default'].verbose ) {
        //If using the -v shorthand, it is essentially --verbose 2
        if( typeof _commander2['default'].verbose === 'boolean' ) {
            log_level = _buildCompatCli2['default'].LogLevel.LOG_VERBOSE;
        } else {
            log_level = parseInt( _commander2['default'].verbose );

            //Instead of throwing an error, just use the normal level
            if( isNaN( log_level ) ) {
                log_level = _buildCompatCli2['default'].LogLevel.LOG_NORMAL;
            }
        }
    }

    //Create the logger
    var logger = new _buildCompatCli2['default'].Logger( log_level );

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

        for( var _iterator = args, _isArray = Array.isArray( _iterator ), _i = 0, _iterator = _isArray ? _iterator :
                                                                                              _getIterator( _iterator ); ; ) {
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

            if( _glob2['default'].hasMagic( arg ) ) {
                scripts = scripts.concat( _glob2['default'].sync( arg ) );
            } else {
                scripts.push( arg );
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
            logger.info( 'Repeating script execution %d times', count );

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
            var Scriptor = require( './../' + (_commander2['default'].async ? 'async.js' : 'sync.js') );

            if( !_commander2['default'].no_ext ) {
                logger.info( 'Custom extensions installed.' );
                Scriptor.installCustomExtensions();
            }

            if( _commander2['default'].async && _commander2['default'].long_stack_traces ) {
                Scriptor.Promise.longStackTraces();
                logger.info( 'Long Stack Traces enabled' );
            }

            //New manager created, using process.cwd as the cwd
            var manager = new Scriptor.Manager();

            if( _commander2['default'].propagate ) {
                manager.propagateEvents();
            }

            var maxRecursion = undefined,
                concurrency = undefined,
                watch = undefined,
                debounce = undefined;

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

            //Basically, if both max_recursion and concurrency are set, they have to play along
            //Otherwise, each will increase or whatever to not crash the application
            if( _commander2['default'].max_recursion ) {
                maxRecursion = parseIntOrInfinity( _commander2['default'].max_recursion );

                if( isNaN( maxRecursion ) ) {
                    logger.error( 'Not a Number value for option --max_recursion' );
                    process.exit( EXIT_FAILURE );
                } else if( _commander2['default'].concurrency ) {
                    concurrency = parseIntOrInfinity( _commander2['default'].concurrency );

                    if( isNaN( concurrency ) ) {
                        logger.error( 'Not a Number value for option -c, --concurrency' );
                        process.exit( EXIT_FAILURE );
                    } else if( concurrency > maxRecursion ) {
                        logger.error( 'Concurrency set higher than max_recursion.\n\tScriptor will report false positives for exceeded recursion limits.' );
                        process.exit( EXIT_FAILURE );
                    }
                } else {
                    concurrency = maxRecursion + 1;
                }
            } else {
                if( _commander2['default'].concurrency ) {
                    concurrency = parseIntOrInfinity( _commander2['default'].concurrency );

                    if( isNaN( concurrency ) ) {
                        logger.error( 'Not a Number value for option -c, --concurrency' );
                        process.exit( EXIT_FAILURE );
                    } else {
                        maxRecursion = concurrency - 1;

                        if( maxRecursion > _buildCompatCommon2['default'].default_max_recursion ) {
                            logger.warn( 'Increasing max_recursion to %d to handle increased concurrency',
                                         maxRecursion );
                        }
                    }
                } else {
                    maxRecursion = Scriptor.default_max_recursion;

                    concurrency = maxRecursion + 1;
                }
            }

            //Close overrides watch, so if it is set to close, don't even both watching the scripts
            if( _commander2['default'].watch && !_commander2['default'].close ) {
                watch = true;
            }

            var run_script = undefined,
                script_start = process.hrtime(),
                place = 0,
                instances = [];

            if( !_commander2['default'].no_signal ) {
                (function() {
                    var closed = false;

                    var onClose = function onClose( signal ) {
                        if( !closed ) {

                            for( var _iterator2 = instances, _isArray2 = Array.isArray( _iterator2 ), _i2 = 0, _iterator2 = _isArray2 ?
                                                                                                                            _iterator2 :
                                                                                                                            _getIterator( _iterator2 ); ; ) {
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

            if( _commander2['default'].async ) {
                logger.info( 'Asynchronous execution selected' );

                run_script = function( instance, script, num ) {
                    var start = process.hrtime();

                    instance.maxRecursion = maxRecursion;

                    if( log_level === _buildCompatCli2['default'].LogLevel.LOG_SILENT || _commander2['default'].cork ) {
                        process.stdout.cork();
                    }

                    return instance.call().then( function() {
                        logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
                    } );
                };

                var mapper = function mapper( script ) {
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
                };

                logger.info( 'Concurrency set at %s', concurrency );

                Scriptor.Promise.map( scripts, mapper,
                                      {concurrency: concurrency} )['catch']( onError ).then( function() {
                    logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

                    if( _commander2['default'].close ) {
                        process.exit( EXIT_SUCCESS );
                    }
                } );
            } else {
                logger.info( 'Synchronous execution selected.' );

                run_script = function( instance, script, num ) {
                    var start = process.hrtime();

                    instance.maxRecursion = maxRecursion;

                    if( log_level === _buildCompatCli2['default'].LogLevel.LOG_SILENT || _commander2['default'].cork ) {
                        process.stdout.cork();
                    }

                    instance.call();

                    logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
                };

                scripts.forEach( function( script ) {
                    var num = place++;

                    logger.verbose( 'Running script #%d, %s.', num, script );

                    try {
                        (function() {
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

                            run_script( instance, script, num );
                        })();
                    } catch( error ) {
                        onError( error );
                    }
                } );

                logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

                if( _commander2['default'].close ) {
                    process.exit( EXIT_SUCCESS );
                }
            }
        })();
    } else {
        _commander2['default'].help();
    }
};

module.exports = exports['default'];
//# sourceMappingURL=scriptor.js.map
