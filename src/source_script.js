/**
 * Created by Aaron on 7/5/2015.
 */

import Promise from "bluebird";
import {basename, dirname} from "path";
import {stripBOM, injectAMD, tryPromise} from "./utils.js";
import Script from "./script.js";

/*
 * The SourceScript variation is a Script that allows loading from in-memory strings. These are always assumed to be normal JavaScript.
 * */

export function compile( src, watch = true, parent = null ) {
    var script = new SourceScript( src, parent );

    if( watch ) {
        script.watch();
    }

    return script;
}

export default class SourceScript extends Script {
    _onChange = null;

    constructor( src, parent = module ) {
        super( null, parent );

        if( src !== void 0 && src !== null ) {
            this.load( src );
        }
    }

    get filename() {
        return this._script.filename;
    }

    set filename( value ) {
        this._script.filename = value;
    }

    get baseUrl() {
        return dirname( this.filename );
    }

    set baseUrl( value ) {
        value = dirname( value );

        this.filename = value + basename( this.filename );
    }

    get watched() {
        return typeof this._onChange === 'function';
    }

    _do_load() {
        if( !this.loading || (this._loadingText && !this.textMode) ) {
            this.unload();

            if( !this.textMode ) {
                this._do_setup();

                this._loading     = true;
                this._loadingText = false;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );

                    } catch( err ) {
                        this._loading = false;

                        this.emit( 'loading_error', err );
                    }
                }

                this.source( 'utf-8' ).then( src => {
                    this._script._compile( src, this.filename );

                    this._script.loaded = true;

                    this._loading = false;

                    this.emit( 'loaded', this._script.exports );

                }, err => {
                    this._loading = false;

                    this.emit( 'loading_error', err );
                } );

            } else {
                this._loading     = true;
                this._loadingText = true;

                if( this._willWatch ) {
                    try {
                        this._do_watch( this._watchPersistent );

                    } catch( err ) {
                        this._loading     = false;
                        this._loadingText = false;

                        this.emit( 'loading_src_error', err );
                    }
                }

                this.source( 'utf-8' ).then( src => {
                    this._script.loaded = true;

                    this._loading     = false;
                    this._loadingText = false;

                    this.emit( 'loaded', this.loaded );

                }, err => {
                    this._loading     = false;
                    this._loadingText = false;

                    this.emit( 'loading_error', err );
                } );
            }
        }
    }

    _normalizeSource( src ) {
        assert( typeof src === 'string' || Buffer.isBuffer( src ),
            'Factory source must return string or Buffer as value' );

        src = stripBOM( src );

        if( !this.textMode && Script.extensions_enabled ) {
            src = injectAMD( src );
        }

        if( Buffer.isBuffer( src ) && typeof encoding === 'string' ) {
            src = src.toString( encoding );
        }

        return src;
    }

    source( encoding ) {
        if( typeof this._source === 'function' ) {
            return tryPromise( this._source() ).then( src => this._normalizeSource( src ) );

        } else {
            try {
                let src = this._normalizeSource( this._source );

                return Promise.resolve( src );

            } catch( err ) {
                return Promise.reject( err );
            }
        }
    }

    load( src, watch = true ) {
        assert( typeof src === 'string' ||
                Buffer.isBuffer( src ) ||
                typeof src === 'function', 'Source must be a string, Buffer or factory function' );

        this.close( false );

        this._source = typeof src === 'string' ? new Buffer( src ) : src;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    }
}
