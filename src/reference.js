/**
 * Created by Aaron on 7/5/2015.
 */

import assert from 'assert';

import Promise from 'bluebird';

import _ from 'lodash';

import {EventEmitter, makeEventPromise} from './events';

import {isGeneratorFunction, makeCoroutine, tryPromise, tryReject} from './utils.js';

export function identity( left, right ) {
    assert( left instanceof ReferenceBase, 'Cannot pass non-Reference to reference identity function.' );

    return left.value();
}

class ReferenceBase extends EventEmitter {
    _onChange = null;
    _value = void 0;
    _ran = false;
    _running = false;

    _left = void 0;
    _right = void 0;

    _run() {
        this.emit( 'value_error', new Error( 'Cannot get value from ReferenceBase' ) );
    }

    get ran() {
        return this._ran;
    }

    get running() {
        return this._running;
    }

    value() {
        if( this._ran ) {
            return Promise.resolve( this._value );

        } else {
            let waiting = makeEventPromise( this, 'value', 'value_error' );

            this._run();

            return waiting;
        }
    }

    join( ref, transform ) {
        return new JoinedTransformReference( this, ref, transform );
    }

    transform( transform ) {
        return new TransformReference( this, transform );
    }

    left() {
        return this._left;
    }

    right() {
        return this._right;
    }

    close() {
        delete this['_value'];
    }
}

export default class Reference extends ReferenceBase {
    _args = [];

    constructor( script, args ) {
        super();

        this._script = script;
        this._args = args;

        //Just mark this reference as not ran when a change occurs
        //other things are free to reference this script and evaluate it,
        //but this reference would still not be run
        this._onChange = ( event, filename ) => {
            this.emit( 'change', event, filename );

            this._ran = false;
        };

        script.on( 'change', this._onChange );
    }

    get closed() {
        return this._script === void 0 ||
               this._script === null;
    }

    _run() {
        if( !this._running ) {
            this._running = true;

            this._script.apply( this._args ).then( value => {
                if( typeof value === 'object' ) {
                    this._value = _.clone( value );

                    Object.freeze( this._value );

                } else {
                    this._value = value;
                }

                this._ran = true;
                this._running = false;

                this.emit( 'value', this._value );

            } ).catch( err => {
                this._running = false;

                this.emit( 'value_error', err );
            } );
        }
    }

    close() {
        if( !this.closed ) {
            this._script.removeListener( 'change', this._onChange );

            delete this['_args'];
            delete this['_script']; //Doesn't really delete or close it, just removes it from this

            super.close();
        }
    }

    static join( left, right, transform ) {
        return new JoinedTransformReference( left, right, transform );
    }

    static resolve( value ) {
        if( value instanceof ReferenceBase ) {
            return value;

        } else {
            return new ResolvedReference( value );
        }
    }

    //Creates a binary tree (essentially) of joins from an array of References using a single transform
    static join_all( refs, transform ) {
        assert( Array.isArray( refs ), 'join_all can only join arrays of References' );

        if( refs.length === 0 ) {
            return null;

        } else if( refs.length === 1 ) {
            return refs[0];

        } else if( refs.length === 2 ) {
            return Reference.join( refs[0], refs[1], transform );

        } else {
            var mid = Math.floor( refs.length / 2 );

            var left = Reference.join_all( refs.slice( 0, mid ), transform );
            var right = Reference.join_all( refs.slice( mid ), transform );

            return Reference.join( left, right, transform );
        }
    }

    static transform( ref, transform ) {
        return new TransformReference( ref, transform );
    }
}

class TransformReference extends ReferenceBase {
    _ref = null;
    _transform = null;

    constructor( ref, transform = identity ) {
        super();

        assert( ref instanceof ReferenceBase, 'transform will only work on References' );
        assert.strictEqual( typeof transform, 'function', 'transform function must be a function' );

        this._ref = ref;

        if( isGeneratorFunction( transform ) ) {
            this._transform = makeCoroutine( transform );

        } else {
            this._transform = transform;
        }

        this._onChange = ( event, filename ) => {
            this.emit( 'change', event, filename );

            this._ran = false;
        };

        ref.on( 'change', this._onChange );
    }

    get closed() {
        return this._ref === void 0;
    }

    _run() {
        if( !this._running ) {
            this._running = true;

            tryReject( this._transform, null, this._ref, null ).then( value => {
                if( typeof value === 'object' ) {
                    this._value = _.clone( value );

                    Object.freeze( this._value );

                } else {
                    this._value = value;
                }

                this._ran = true;
                this._running = false;

                this.emit( 'value', this._value );

            } ).catch( err => {
                this._running = false;

                this.emit( 'value_error', err );
            } );
        }
    }

    left() {
        return this._ref;
    }

    close( recursive = false ) {
        if( !this.closed ) {
            this._ref.removeListener( 'change', this._onChange );

            if( recursive ) {
                this._ref.close( recursive );
            }

            delete this['_ref'];

            super.close();
        }
    }
}

class JoinedTransformReference extends ReferenceBase {
    constructor( left, right, transform = identity ) {
        super();

        assert( left instanceof ReferenceBase && right instanceof ReferenceBase,
                'join will only work on References' );
        assert.notEqual( left, right, 'Cannot join to self' );
        assert.strictEqual( typeof transform, 'function', 'transform function must be a function' );

        this._left = left;
        this._right = right;

        if( isGeneratorFunction( transform ) ) {
            this._transform = makeCoroutine( transform );

        } else {
            this._transform = transform;
        }

        this._onChange = ( event, filename ) => {
            this.emit( 'change', event, filename );

            this._ran = false;
        };

        left.on( 'change', this._onChange );
        right.on( 'change', this._onChange );
    }

    get closed() {
        return this._left === void 0 || this._right === void 0;
    }

    _run() {
        if( !this._running ) {
            this._running = true;

            tryReject( this._transform, null, this._left, this._right ).then( value => {
                if( typeof value === 'object' ) {
                    this._value = _.clone( value );

                    Object.freeze( this._value );

                } else {
                    this._value = value;
                }

                this._ran = true;
                this._running = false;

                this.emit( 'value', this._value );

            } ).catch( err => {
                this._running = false;

                this.emit( 'value_error', err );
            } );
        }
    }

    close( recursive = false ) {
        if( !this.closed ) {
            this._left.removeListener( 'change', this._onChange );
            this._right.removeListener( 'change', this._onChange );

            if( recursive ) {
                this._left.close( recursive );
                this._right.close( recursive );
            }

            delete this['_left'];
            delete this['_right'];

            super.close();
        }
    }
}

class ResolvedReference extends ReferenceBase {
    constructor( value ) {
        super();

        this._value = value;

        this._run();
    }

    get closed() {
        return !this._running && !this._ran;
    }

    _run() {
        if( !this._running ) {
            this._running = true;

            tryPromise( this._value ).then( result => {
                if( typeof result === 'object' ) {
                    this._value = Object.freeze( result );

                } else {
                    this._value = result;
                }

                this._ran = true;
                this._running = false;

                this.emit( 'value', this._value );

            } ).catch( err => {
                this._running = false;

                this.emit( 'value_error', err );
            } );
        }
    }

    close() {
        if( this._ran ) {
            super.close();

            this._ran = false;
        }
    }
}