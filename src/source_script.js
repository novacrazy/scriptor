/**
 * Created by Aaron on 7/5/2015.
 */

import Script from './script.js';

import Promise from 'bluebird';

import _ from 'lodash';

import {basename, dirname} from 'path';
import {stripBOM, injectAMD} from './utils.js';

import {ReferenceBase} from './reference.js';

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
        return this._onChange !== void 0 && this._onChange !== null;
    }

    do_load() {
        if( !this.loading || (this._loadingText && !this.textMode) ) {
            this.unload();

            if( !this.textMode ) {
                this.do_setup();

                this._loading = true;
                this._loadingText = false;

                this.source( 'utf-8' ).then( src => {
                    this._script._compile( src, this.filename );

                    this._script.loaded = true;

                    this._loading = false;

                    this.emit( 'loaded', this._script.exports );

                } ).catch( err => {
                    this._loading = false;

                    this.emit( 'loading_error', err );
                } );

            } else {
                this._loading = true;
                this._loadingText = true;

                this.source( 'utf-8' ).then( src => {
                    this._script.loaded = true;

                    this._loading = false;
                    this._loadingText = false;

                    this.emit( 'loaded', this.loaded );

                } ).catch( err => {
                    this._loading = false;

                    this.emit( 'loading_error', err );
                } );
            }
        }
    }

    _normalizeSource( src ) {
        assert( typeof src === 'string' || Buffer.isBuffer( src ),
                'Reference source must return string or Buffer as value' );

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
        if( this._source instanceof ReferenceBase ) {
            return this._source.value().then( this::_normalizeSource ); //Note the function bind

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
                src instanceof ReferenceBase, 'Source must be a string or Reference' );

        this.close( false );

        this._source = typeof src === 'string' ? new Buffer( src ) : src;

        if( watch ) {
            this.watch();
        }

        this.emit( 'change', 'change', this.filename );

        return this;
    }

    watch() {
        if( !this.watched && this._source instanceof ReferenceBase ) {

            this._onChange = _.debounce( ( event, filename ) => {
                this.unload();
                this.emit( 'change', event, filename );

            }, this.debounceMaxWait );

            this._source.on( 'change', this._onChange );

            return true;
        }

        return false;
    }

    unwatch() {
        if( this.watched && this._source instanceof ReferenceBase ) {
            this._source.removeListener( 'change', this._onChange );
            return delete this['_onChange'];
        }

        return false;
    }
}
