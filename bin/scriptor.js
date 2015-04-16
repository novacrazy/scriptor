"use strict";

process.title = 'Scriptor';

var options = require( 'commander' );
var Module = require( 'module' );
var glob = require( 'glob' );
var path = require( 'path' );
var package_json = require( './../package.json' );

var constants = process.binding( 'constants' );

var ScriptorCommon = require( './../build/common.js' );
var ScriptorCLI = require( './../build/cli.js' );

var _ = require( 'lodash' );

function diff_ms(start) {
    var diff = process.hrtime( start );
    var ms = diff[0] * 1e3 + diff[1] * 1e-6;
    return ms.toFixed( 3 ) + 'ms';
}

function toMilliseconds(str) {
    var pattern = /([0-9]+)([A-Z]+)?/i;
    var match = str.match( pattern );

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

options
    .version( package_json.version )
    .usage( '[options] files...' )
    .option( '-d, --dir <path>', 'Directory to run Scriptor in' )
    .option( '-a, --async', 'Run scripts asynchronously' )
    .option( '-c, --concurrency <n>',
    'Limit script concurrency to n when executed asynchronously (default: max_recursion + 1)' )
    .option( '-q, --close', 'End the process when all scripts finish' )
    .option( '-w, --watch', 'Watch scripts for changes and re-run them when changed' )
    .option( '-p, --propagate', 'Propagate changes upwards when watching scripts' )
    .option( '-l, --long_stack_traces', 'Display long stack trace for asynchronous errors' )
    .option( '-r, --repeat <n>', 'Run script n times (in parallel if async)' )
    .option( '-u, --unique', 'Only run unique scripts (will ignore duplicates in file arguments)' )
    .option( '--debounce <n>', 'Wait n milliseconds for debounce on file watching events (default: 50ms)' )
    .option( '--use_strict', 'Enforce strict mode' )
    .option( '--max_recursion <n>', 'Set the maximum recursion depth of scripts (default: ' +
                                    ScriptorCommon.default_max_recursion + ')' )
    .option( '-v, --verbose [n]', 'Print out extra status information (0 - normal, 1 - info, 2 - verbose)' )
    .option( '--cork', 'Cork stdout before calling scripts' )
    .option( '-s, --silent', 'Do not echo anything' )
    .option( '--no_ext', 'Disable use of custom extensions with AMD injection' )
    .option( '--no_signal', 'Do not intercept process signals' )
    .option( '--no_glob', 'Do not match glob patterns' );

module.exports = function(argv) {
    process.options = options.parse( argv );

    if( options.use_strict ) {
        Module.wrapper[0] += '"use strict";';
        Object.freeze( Module.wrap );
    }

    //The default log_level is LOG_NORMAL
    var log_level = ScriptorCLI.LogLevel.LOG_NORMAL;

    //If silent mode is enabled, it overrides verbose mode
    if( options.silent ) {
        log_level = ScriptorCLI.LogLevel.LOG_SILENT;

    } else if( options.verbose ) {
        //If using the -v shorthand, it is essentially --verbose 2
        if( typeof options.verbose === 'boolean' ) {
            log_level = ScriptorCLI.LogLevel.LOG_VERBOSE;

        } else {
            log_level = parseInt( options.verbose );

            //Instead of throwing an error, just use the normal level
            if( isNaN( log_level ) ) {
                log_level = ScriptorCLI.LogLevel.LOG_NORMAL;
            }
        }
    }

    //Create the logger
    var logger = new ScriptorCLI.Logger( log_level );

    //Unhandled errors are printed and the process is killed
    var onError = function(error) {
        logger.error( error.stack || error );
        process.exit( EXIT_FAILURE );
    };

    process.on( 'uncaughtException', onError );
    process.on( 'unhandledRejection', onError );

    var scripts;

    if( !options.no_glob ) {
        scripts = [];

        for( var it in options.args ) {
            if( options.args.hasOwnProperty( it ) ) {
                if( glob.hasMagic( options.args[it] ) ) {
                    scripts = scripts.concat( glob.sync( options.args[it] ) );
                } else {
                    scripts.push( options.args[it] );
                }
            }
        }

    } else {
        scripts = options.args;
    }

    if( options.unique ) {
        logger.info( 'Only executing unique scripts' );
        var uniqueScripts = [];

        scripts.forEach( function(script) {
            if( uniqueScripts.indexOf( script ) === -1 ) {
                uniqueScripts.push( script );
            }
        } );

        scripts = uniqueScripts;
    }

    if( options.repeat ) {
        var count = parseInt( options.repeat );

        if( !isNaN( count ) && count > 1 ) {
            logger.info( 'Repeating script execution %d times', count );

            var newScripts = [];

            for( var i = 0; i < count; i++ ) {
                newScripts = newScripts.concat( scripts );
            }

            scripts = newScripts;
        }
    }

    //options.dir only says the directory scriptor will be run in,
    //not the directory where it looks for files. So it will resolve files relative to the
    //invocation location, but change process.cwd to the new location.
    //Since the script files will be absolute now, now issues should arrive when using the manager.
    if( typeof options.dir === 'string' ) {
        scripts = scripts.map( function(script) {
            return path.resolve( process.cwd(), script );
        } );

        process.chdir( options.dir );
    }

    //Only run anything if there are any scripts to run, otherwise show the help
    if( scripts.length > 0 ) {
        var Scriptor = require( './../' + (options.async ? 'async.js' : 'sync.js') );

        if( !options.no_ext ) {
            logger.info( 'Custom extensions installed.' );
            Scriptor.installCustomExtensions();
        }

        if( options.async && options.long_stack_traces ) {
            Scriptor.Promise.longStackTraces();
            logger.info( 'Long Stack Traces enabled' );
        }

        //New manager created, using process.cwd as the cwd
        var manager = new Scriptor.Manager();

        if( options.propagate ) {
            manager.propagateEvents();
        }

        var maxRecursion, concurrency, watch, debounce;

        if( typeof options.debounce === 'string' ) {
            debounce = manager.debounceMaxWait = toMilliseconds( options.debounce );
        }

        //Basically, if both max_recursion and concurrency are set, they have to play along
        //Otherwise, each will increase or whatever to not crash the application
        if( options.max_recursion ) {
            maxRecursion = parseIntOrInfinity( options.max_recursion );

            if( isNaN( maxRecursion ) ) {
                logger.error( 'Not a Number value for option --max_recursion' );
                process.exit( EXIT_FAILURE );

            } else if( options.concurrency ) {
                concurrency = parseIntOrInfinity( options.concurrency );

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
            if( options.concurrency ) {
                concurrency = parseIntOrInfinity( options.concurrency );

                if( isNaN( concurrency ) ) {
                    logger.error( 'Not a Number value for option -c, --concurrency' );
                    process.exit( EXIT_FAILURE );

                } else {
                    maxRecursion = concurrency - 1;

                    if( maxRecursion > ScriptorCommon.default_max_recursion ) {
                        logger.warn( 'Increasing max_recursion to %d to handle increased concurrency', maxRecursion );
                    }
                }

            } else {
                maxRecursion = Scriptor.default_max_recursion;

                concurrency = maxRecursion + 1;
            }
        }

        //Close overrides watch, so if it is set to close, don't even both watching the scripts
        if( options.watch && !options.close ) {
            watch = true;
        }

        var run_script,
            script_start = process.hrtime(),
            place     = 0,
            instances = [];

        if( !options.no_signal ) {
            var closed = false;

            var onClose = function(signal) {
                if( !closed ) {

                    for( var it in instances ) {
                        if( instances.hasOwnProperty( it ) ) {
                            instances[it].unload();
                        }
                    }

                    //Close on the next tick so close events can propagate.
                    //Exit code for Ctrl-C signals is 128 + sig according to http://www.tldp.org/LDP/abs/html/exitcodes.html
                    process.nextTick( process.exit.bind( null, 128 + signal ) );

                    closed = true;
                }
            };

            process.on( 'SIGINT', onClose.bind( null, constants.SIGINT ) );
            process.on( 'SIGTERM', onClose.bind( null, constants.SIGTERM ) );
        }

        if( options.async ) {
            logger.info( 'Asynchronous execution selected' );

            run_script = function(instance, script, num) {
                var start = process.hrtime();

                instance.maxRecursion = maxRecursion;

                if( log_level === ScriptorCLI.LogLevel.LOG_SILENT || options.cork ) {
                    process.stdout.cork();
                }

                return instance.call().then( function() {
                    logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
                } );
            };

            var mapper = function(script) {
                var num = place++;

                logger.verbose( 'Running script #%d, %s.', num, script );

                var instance = manager.add( script, false );

                instances.push( instance );

                if( watch ) {
                    instance.watch( true );

                    var onChange = function() {
                        logger.verbose( 'Re-running script #%d, %s', num, script );
                        run_script( instance, script, num );
                    };

                    if( typeof debounce === 'number' ) {
                        onChange = _.debounce( onChange, debounce );
                    }

                    instance.on( 'change', onChange );
                }

                return run_script( instance, script, num );
            };

            logger.info( 'Concurrency set at %s', concurrency );

            Scriptor.Promise.map( scripts, mapper, {concurrency: concurrency} ).catch( onError ).then( function() {
                logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

                if( options.close ) {
                    process.exit( EXIT_SUCCESS );
                }
            } );

        } else {
            logger.info( 'Synchronous execution selected.' );

            run_script = function(instance, script, num) {
                var start = process.hrtime();

                instance.maxRecursion = maxRecursion;

                if( log_level === ScriptorCLI.LogLevel.LOG_SILENT || options.cork ) {
                    process.stdout.cork();
                }

                instance.call();

                logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
            };

            scripts.forEach( function(script) {
                var num = place++;

                logger.verbose( 'Running script #%d, %s.', num, script );

                try {
                    var instance = manager.add( script, false );

                    instances.push( instance );

                    if( watch ) {
                        instance.watch( true );

                        var onChange = function() {
                            logger.verbose( 'Re-running script #%d, %s', num, script );
                            run_script( instance, script, num );
                        };

                        if( typeof debounce === 'number' ) {
                            onChange = _.debounce( onChange, debounce );
                        }

                        instance.on( 'change', onChange );
                    }

                    run_script( instance, script, num );

                } catch( error ) {
                    onError( error );
                }
            } );

            logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

            if( options.close ) {
                process.exit( EXIT_SUCCESS );
            }
        }

    } else {
        options.help();
    }
};

