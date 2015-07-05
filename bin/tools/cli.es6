/**
 * Created by Aaron on 7/5/2015.
 */

import assert from 'assert';
import {EventEmitter} from 'events';
import util from 'util';

function Enum( values ) {
    assert( typeof values === 'object' && !Array.isArray( values ), 'Enum values must be an object' );

    let result = {};

    for( let it in values ) {
        if( values.hasOwnProperty( it ) ) {
            let value = values[it];

            result[it] = value;
            result[value] = it;
        }
    }

    return Object.freeze( result );
}

export var LogLevel = Enum( {
    LOG_ERROR:   -2,
    LOG_SILENT:  -1,
    LOG_WARN:    0,
    LOG_NORMAL:  0,
    LOG_INFO:    1,
    LOG_VERBOSE: 2
} );

export class Logger extends EventEmitter {
    _level = null;

    constructor( level = LogLevel.LOG_NORMAL ) {
        super();

        this.level = level;
    }

    get level() {
        return this._level;
    }

    set level( value ) {
        value = Math.floor( value );

        assert( !isNaN( value ), 'level must be a number' );

        this._level = value;
    }

    error( format, ...args ) {
        this.do_log( LogLevel.LOG_ERROR, `ERROR: ${format}`, args );
    }

    warn( format, ...args ) {
        this.do_log( LogLevel.LOG_WARN, `WARNING: ${format}`, args );
    }

    log( format, ...args ) {
        this.do_log( LogLevel.LOG_NORMAL, `LOG: ${format}`, args );
    }

    info( format, ...args ) {
        this.do_log( LogLevel.LOG_INFO, `INFO: ${format}`, args );
    }

    verbose( format, ...args ) {
        this.do_log( LogLevel.LOG_VERBOSE, `VERBOSE: ${format}`, args );
    }

    do_log( level, format, args ) {
        if( level <= this.level ) {
            var message = util.format( ...args );

            print_message( level, message );

            this.emit( LogLevel[level], message );
        }
    }
}

function print_message( level, message ) {
    if( level === LogLevel.LOG_ERROR ) {
        return console.error( message );

    } else if( level === LogLevel.LOG_WARN ) {
        return console.warn( message );

    } else {
        return console.log( message );
    }
}
