/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aaron Trent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ****/
"use strict";
/**
 * Created by novacrazy on 3/2/2015.
 */
var __extends = this.__extends || function( d, b ) {
        for( var p in b ) {
            if( b.hasOwnProperty( p ) ) {
                d[p] = b[p];
            }
        }
        function __() {
            this.constructor = d;
        }

        __.prototype = b.prototype;
        d.prototype = new __();
    };
var events = require( 'events' );
var _ = require( 'lodash' );
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
var ScriptorBase;
(function( ScriptorBase ) {
    function hasPropagationHandler( emitter, event, target ) {
        var listeners = emitter.listeners( event );
        for( var it in listeners ) {
            if( listeners.hasOwnProperty( it ) ) {
                var listener = listeners[it];
                if( listener.__target__ !== void 0 && listener.__target__ === target ) {
                    return true;
                }
            }
        }
        return false;
    }

    var EventPropagator = (function( _super ) {
        __extends( EventPropagator, _super );
        function EventPropagator() {
            _super.apply( this, arguments );
            this._propagateEvents = false;
        }

        EventPropagator.prototype.propagateEvents = function( enable ) {
            if( enable === void 0 ) {
                enable = true;
            }
            var wasPropagating = this._propagateEvents;
            this._propagateEvents = enable;
            return wasPropagating;
        };
        EventPropagator.prototype._addPropagationHandler = function( emitter, event, handler, target ) {
            var _this = this;
            if( target === void 0 ) {
                target = this;
            }
            if( this._propagateEvents && !hasPropagationHandler( emitter, event, target ) ) {
                var propagate = _.once( function() {
                    if( !propagate._hasPropagated && _this._propagateEvents ) {
                        handler.call( target );
                        propagate._hasPropagated = true;
                    }
                    emitter.removeListener( event, propagate );
                } );
                propagate.__target__ = target;
                emitter.on( event, propagate );
                propagate._hasPropagated = false;
            }
        };
        Object.defineProperty( EventPropagator.prototype, "isPropagatingEvents", {
            get:          function() {
                return this._propagateEvents;
            },
            enumerable:   true,
            configurable: true
        } );
        return EventPropagator;
    })( events.EventEmitter );
    ScriptorBase.EventPropagator = EventPropagator;
})( ScriptorBase || (ScriptorBase = {}) );
module.exports = ScriptorBase;
