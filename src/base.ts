/**
 * Created by novacrazy on 3/2/2015.
 */

import events = require('events');

/*
 * Propagating events is not a simple matter, at least not if you want to avoid memory leaks.
 *
 * So I created this base class to handle generic event propagation handle addition to
 * any old event emitter to a specified target, defaulting to this.
 *
 * That way script can inherit from the EventPropagator and will be able to add event
 * propagation into everything effortlessly.
 *
 * */

module ScriptorBase {
    interface IPropagationHandler extends Function {
        __target__ : EventPropagator;
    }

    function hasPropagationHandler( emitter : EventPropagator,
                                    event : string,
                                    target : EventPropagator ) : boolean {
        var listeners : any[] = emitter.listeners( event );
        for( var it in listeners ) {
            if( listeners.hasOwnProperty( it ) ) {
                var listener : IPropagationHandler = listeners[it];

                if( listener.__target__ !== void 0 && listener.__target__ === target ) {
                    return true;
                }
            }
        }

        return false;
    }

    export class EventPropagator extends events.EventEmitter {
        protected _propagateEvents : boolean = false;

        public propagateEvents( enable : boolean = true ) : boolean {
            var wasPropagating : boolean = this._propagateEvents;

            this._propagateEvents = enable;

            return wasPropagating;
        }

        protected _addPropagationHandler( emitter : EventPropagator,
                                          event : string,
                                          handler : Function,
                                          target : EventPropagator = this ) {
            if( this._propagateEvents && !hasPropagationHandler( emitter, event, target ) ) {
                var propagate : any = () => {
                    if( !propagate._hasPropagated && this._propagateEvents ) {
                        handler.call( target );
                        propagate._hasPropagated = true;
                    }

                    emitter.removeListener( event, propagate );
                };

                propagate.__target__ = target;

                emitter.on( event, propagate );

                propagate._hasPropagated = false;
            }
        }

        get isPropagatingEvents() : boolean {
            return this._propagateEvents;
        }
    }
}

export = ScriptorBase;
