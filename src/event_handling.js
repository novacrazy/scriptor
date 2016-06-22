/**
 * Created by Aaron on 7/4/2015.
 */

import Promise from "bluebird";
import {EventEmitter} from "events";
import {once} from "lodash";

/*
 * This is a modification of the EventEmitter class that allows it to automatically propagate certain events to
 * other specified event emitters/listeners. This is used to "bubble up" events from scripts.
 *
 * For example, if a depended upon script content changes on disk, then that script will be unloaded
 * and the 'change' event emitted, but because there are other scripts that depend on the changed script, that 'change'
 * event will propagate upwards into them and unload them as well. That way all scripts stay up to date.
 * */
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

    isPropagatingTo( emitter, event ) {
        return emitter.isPropagatingFrom( this, event );
    }

    propagateFrom( emitter, event, handler ) {
        if( this._propagateEvents && !this.isPropagatingFrom( emitter, event ) ) {

            var propagate = once( () => {
                if( !propagate._hasPropagated && this._propagateEvents ) {
                    handler.call( this );
                    propagate._hasPropagated = true;
                }

                emitter.removeListener( event, propagate );
            } );

            propagate.__target__ = this;

            emitter.on( event, propagate );

            propagate._hasPropagated = false;
        }
    }

    //Reverse logic to make it easier to understand.
    propagateTo( emitter, event, handler ) {
        emitter.propagateFrom( this, event, handler );
    }

    isPropagatingEvents() {
        return this._propagateEvents;
    }
}

/*
 * For a single pair of events, this will create a Promise that will resolve or reject when the associated event occurs.
 *
 * A good example is the 'end' event for resolving it, and the 'error' event for rejecting the Promise.
 *
 * This also cleans up after itself by removing the listeners once they have been triggered.
 * */
export function makeEventPromise( emitter, resolve_event, reject_event ) {
    return new Promise( ( resolve, reject ) => {
        function resolve_handler( ...args ) {
            emitter.removeListener( reject_event, reject_handler );
            emitter.removeListener( resolve_event, resolve_handler );

            resolve( ...args );
        }

        function reject_handler( ...args ) {
            emitter.removeListener( resolve_event, resolve_handler );
            emitter.removeListener( reject_event, reject_handler );

            reject( ...args );
        }

        emitter.addListener( resolve_event, resolve_handler );
        emitter.addListener( reject_event, reject_handler );
    } );
}

/*
 * This is a more generic version of the above,
 * but also costs more to run because it has to loop through all the provided events.
 * */
export function makeMultiEventPromise( emitter, resolve_events, reject_events ) {
    return new Promise( ( resolve, reject ) => {
        function resolve_handler( ...args ) {
            for( let event of reject_events ) {
                emitter.removeListener( event, reject_handler );
            }

            for( let event of resolve_events ) {
                emitter.removeListener( event, resolve_handler );
            }

            resolve( ...args );
        }

        function reject_handler( ...args ) {
            for( let event of reject_events ) {
                emitter.removeListener( event, reject_handler );
            }

            for( let event of resolve_events ) {
                emitter.removeListener( event, resolve_handler );
            }

            reject( ...args );
        }

        for( let event of resolve_events ) {
            emitter.addListener( event, resolve_handler );
        }

        for( let event of reject_events ) {
            emitter.addListener( event, reject_handler );
        }
    } );
}
