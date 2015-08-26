/**
 * Created by Aaron on 6/30/2015.
 */

import options from 'commander';
import Module from 'module';
import glob from 'glob';
import path from 'path';
import package_json from './../package.json';

import _ from 'lodash';

let constants = process.binding( 'constants' );

import {default_debounceMaxWait} from './../build/modern/defaults.js';
import {Logger, LogLevel} from './tools/cli.js';

import Scriptor from './../build/modern/index.js';

function diff_ms( start ) {
    let [seconds, nanoseconds] = process.hrtime( start );

    let milliseconds = seconds * 1e3 + nanoseconds * 1e-6;

    return milliseconds.toFixed( 3 ) + 'ms';
}

let ms_pattern = /([0-9]+)([A-Z]+)?/i;

function toMilliseconds( str ) {
    let match = str.match( ms_pattern );

    if( match ) {
        let i = parseInt( match[1] );

        if( !isNaN( i ) ) {
            let u = match[2];

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
let EXIT_SUCCESS = 0,
    EXIT_FAILURE = 1;

options
    .version( package_json.version )
    .usage( '[options] files...' )
    .option( '-d, --dir <path>', 'Directory to run Scriptor in' )
    .option( '-c, --concurrency <n>', 'Limit asynchronous script concurrency to n (default: 10)' )
    .option( '-q, --close', 'End the process when all scripts finish' )
    .option( '-w, --watch', 'Watch scripts for changes and re-run them when changed' )
    .option( '-p, --propagate', 'Propagate changes upwards when watching scripts' )
    .option( '-l, --long_stack_traces', 'Display long stack trace for errors' )
    .option( '-r, --repeat <n>', 'Run script n times (in parallel if possible)' )
    .option( '-u, --unique', 'Only run unique scripts (will ignore duplicates in file arguments)' )
    .option( '--debounce <n>',
    `Wait n milliseconds for debounce on file watching events (default: ${default_debounceMaxWait}ms)` )
    .option( '--use_strict', 'Enforce strict mode' )
    .option( '--max_listeners <n>', 'Set the maximum number of listeners on any particular script' )
    .option( '-v, --verbose [n]', 'Print out extra status information (0 - normal, 1 - info, 2 - verbose)' )
    .option( '--cork', 'Cork stdout before calling scripts' )
    .option( '-s, --silent', 'Do not echo anything' )
    .option( '--no_signal', 'Do not intercept process signals' )
    .option( '--no_glob', 'Do not match glob patterns' )
    .option( '--no_title', 'Do not set process title' );

export default function( argv ) {
    process.options = options.parse( argv );

    if( options.use_strict ) {
        Module.wrapper[0] += '"use strict";';
        Object.freeze( Module.wrap );
    }

    if( !options.no_title ) {
        process.title = 'Scriptor';
    }

    //The default log_level is LOG_NORMAL
    let log_level = LogLevel.LOG_NORMAL;

    //If silent mode is enabled, it overrides verbose mode
    if( options.silent ) {
        log_level = LogLevel.LOG_SILENT;

    } else if( options.verbose ) {
        //If using the -v shorthand, it is essentially --verbose 2
        if( typeof options.verbose === 'boolean' ) {
            log_level = LogLevel.LOG_VERBOSE;

        } else {
            log_level = parseInt( options.verbose );

            //Instead of throwing an error, just use the normal level
            if( isNaN( log_level ) ) {
                log_level = LogLevel.LOG_NORMAL;
            }
        }
    }

    //Create the logger
    let logger = new Logger( log_level );

    //Unhandled errors are printed and the process is killed
    let onError = error => {
        logger.error( error.stack || error );
        process.exit( EXIT_FAILURE );
    };

    process.on( 'uncaughtException', onError );
    process.on( 'unhandledRejection', onError );

    let scripts;

    if( !options.no_glob ) {
        scripts = [];

        for( let arg of options.args ) {
            if( glob.hasMagic( arg ) ) {
                scripts = scripts.concat( glob.sync( arg ) );

            } else {
                scripts.push( arg );
            }
        }

    } else {
        scripts = options.args;
    }

    if( options.unique ) {
        logger.info( 'Only executing unique scripts' );

        let uniqueScripts = [];

        scripts.forEach( script => {
            if( uniqueScripts.indexOf( script ) === -1 ) {
                uniqueScripts.push( script );
            }
        } );

        scripts = uniqueScripts;
    }

    if( options.repeat ) {
        let count = parseInt( options.repeat );

        if( !isNaN( count ) && count > 1 ) {
            logger.info( `Repeating script execution ${count} times` );

            let newScripts = [];

            for( let i = 0; i < count; i++ ) {
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
    if( typeof options.dir === 'string' ) {
        scripts = scripts.map( script => {
            return path.resolve( process.cwd(), script );
        } );

        process.chdir( options.dir );
    }

    //Only run anything if there are any scripts to run, otherwise show the help
    if( scripts.length > 0 ) {
        if( options.long_stack_traces ) {
            Scriptor.Promise.longStackTraces();
            logger.info( 'Long Stack Traces enabled' );
        }

        //New manager created, using process.cwd as the cwd
        let manager = new Scriptor.Manager();

        if( options.propagate ) {
            manager.propagateEvents();
        }

        let concurrency = 10, watch, debounce;

        if( typeof options.debounce === 'string' ) {
            debounce = manager.debounceMaxWait = toMilliseconds( options.debounce );
        }

        if( typeof options.max_listeners === 'string' ) {
            let maxListeners = parseInt( options.max_listeners );

            if( isFinite( maxListeners ) ) {
                manager.setMaxListeners( maxListeners );

            } else {
                logger.error( 'Not a finite Number value for option --max_listeners' );
                process.exit( EXIT_FAILURE );
            }
        }


        if( options.concurrency ) {
            concurrency = parseIntOrInfinity( options.concurrency );

            if( isNaN( concurrency ) ) {
                logger.error( 'Not a Number value for option -c, --concurrency' );
                process.exit( EXIT_FAILURE );
            }
        }

        //Close overrides watch, so if it is set to close, don't even both watching the scripts
        if( options.watch && !options.close ) {
            watch = true;
        }

        let run_script,
            script_start = process.hrtime(),
            place     = 0,
            instances = [];

        if( !options.no_signal ) {
            let closed = false;

            let onClose = signal => {
                if( !closed ) {

                    for( let instance of instances ) {
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
        }

        run_script = ( instance, script, num ) => {
            let start = process.hrtime();

            if( log_level === LogLevel.LOG_SILENT || options.cork ) {
                process.stdout.cork();
            }

            return instance.call().then( () => {
                logger.verbose( 'Finished script #%d, %s in %s.', num, script, diff_ms( start ) );
            } );
        };

        logger.info( 'Concurrency set at %s', concurrency );

        Scriptor.Promise.map( scripts, script => {
            let num = place++;

            logger.verbose( 'Running script #%d, %s.', num, script );

            let instance = manager.add( script, false );

            instances.push( instance );

            if( watch ) {
                instance.watch( true );

                let onChange = () => {
                    logger.verbose( 'Re-running script #%d, %s', num, script );
                    run_script( instance, script, num );
                };

                if( typeof debounce === 'number' ) {
                    onChange = _.debounce( onChange, debounce );
                }

                instance.on( 'change', onChange );
            }

            return run_script( instance, script, num );
        }, {
            concurrency: concurrency

        } ).catch( onError ).then( () => {
            logger.log( 'All scripts successfully executed in %s', diff_ms( script_start ) );

            if( options.close ) {
                process.exit( EXIT_SUCCESS );
            }
        } );

    } else {
        options.help();
    }
}
