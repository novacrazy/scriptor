/**
 * Created by novacrazy on 2/11/2015.
 */

import util = require('util');
import events = require('events');

module ScriptorCLI {

    export enum LogLevel {
        LOG_ERROR = -2,
        LOG_WARN = 0,
        LOG_SILENT = -1,
        LOG_NORMAL,
        LOG_INFO,
        LOG_VERBOSE
    }

    export interface IVariadicLoggerFunction {
        ( format : string, ...args : any[] ) : void;
    }

    export interface ILogger extends NodeJS.EventEmitter {
        error : IVariadicLoggerFunction;
        warn : IVariadicLoggerFunction;
        log : IVariadicLoggerFunction;
        info : IVariadicLoggerFunction;
        verbose : IVariadicLoggerFunction;
        level : number;
    }

    export class Logger extends events.EventEmitter implements ILogger {
        get level() : number {
            return this._level;
        }

        constructor( private _level : number ) {
            super();
        }

        public error( format : string, ...args : any[] ) : void {
            this.do_log( LogLevel.LOG_ERROR, 'ERROR: ' + format, args );
        }

        public warn( format : string, ...args : any[] ) : void {
            this.do_log( LogLevel.LOG_WARN, 'WARNING: ' + format, args );
        }

        public log( format : string, ...args : any[] ) : void {
            this.do_log( LogLevel.LOG_NORMAL, 'LOG: ' + format, args );
        }

        public info( format : string, ...args : any[] ) : void {
            this.do_log( LogLevel.LOG_INFO, 'INFO: ' + format, args );
        }

        public verbose( format : string, ...args : any[] ) : void {
            this.do_log( LogLevel.LOG_VERBOSE, 'VERBOSE: ' + format, args );
        }

        protected do_log( level : number, format : string, args : any[] ) : void {
            if( level <= this.level ) {
                args.unshift( format );

                var message = util.format.apply( null, args );

                print_message( level, message );

                this.emit( LogLevel[level], message );
            }
        }
    }

    export function print_message( level : number, message : string ) : void {
        switch( level ) {
            case LogLevel.LOG_ERROR:
                return console.error( message );
            case LogLevel.LOG_WARN:
                return console.warn( message );
            default:
                return console.log( message );
        }
    }
}

export = ScriptorCLI;
