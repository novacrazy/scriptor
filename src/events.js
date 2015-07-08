/**
 * Created by Aaron on 7/4/2015.
 */

import Promise from 'bluebird';

import {EventEmitter} from 'events';

export * from 'events';

import {once} from 'lodash';

export class EventPropagator extends EventEmitter {
    _propagateEvents = false;

    propagateEvents( enable = true ) {
        this._propagateEvents = enable;
    }

    isPropagatingFrom( emitter, event ) {
        let listeners = emitter.listeners( event );

        for( let listener of listeners ) {
            if( listener.__target__ === this ) {
                return true;
            }
        }

        return false;
    }

    propagateFrom( emitter, event, handler ) {
        if( this._propagateEvents && !this.isPropagatingFrom( emitter, event ) ) {
            var propagate = _.once( () => {
                if( !propagate._hasPropagated && this._propagateEvents ) {
                    handler.call( this );
                    propagate._hasPropagated = true;
                }

                emitter.removeListener( event, propagate );
            } );

            propagate.__target__ = target;

            emitter.on( event, propagate );

            propagate._hasPropagated = false;
        }
    }

    isPropagatingEvents() {
        return this._propagateEvents;
    }
}

export function makeEventPromise( emitter, resolve_event, reject_event ) {
    return new Promise( ( resolve, reject ) => {
        function resolve_handler( ...args ) {
            emitter.removeListener( reject_event, reject_handler );
            resolve( ...args );
        }

        function reject_handler( ...args ) {
            emitter.removeListener( resolve_event, resolve_handler );
            reject( ...args );
        }

        emitter.once( resolve_event, resolve_handler );
        emitter.once( reject_event, reject_handler );
    } );
}

/*
 * This is a more generic version of the above, but also costs more to run.
 * */
export function makeMultiEventPromise( emitter, resolve_events, reject_events ) {
    return new Promise( ( resolve, reject ) => {
        function resolve_handler( ...args ) {
            for( let event of reject_events ) {
                emitter.removeListener( event, reject_handler );
            }

            resolve( ...args );
        }

        function reject_handler( ...args ) {
            for( let event of resolve_events ) {
                emitter.removeListener( event, resolve_handler );
            }

            reject( ...args );
        }

        for( let event of resolve_events ) {
            emitter.once( event, resolve_handler );
        }

        for( let event of reject_events ) {
            emitter.once( event, reject_handler );
        }
    } );
}
