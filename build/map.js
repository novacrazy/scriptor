/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Aaron Trent
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
 * Created by novacrazy on 1/14/2015.
 */
var MapAdapter;
(function(MapAdapter) {
    var ObjectMap = (function() {
        function ObjectMap() {
            this._map = {};
        }

        Object.defineProperty( ObjectMap.prototype, "size", {
            get:          function() {
                return this.keys().length;
            },
            enumerable:   true,
            configurable: true
        } );
        ObjectMap.prototype.clear = function() {
            this._map = Object.create( null );
        };
        ObjectMap.prototype.delete = function(key) {
            return delete this._map[key];
        };
        ObjectMap.prototype.entries = function() {
            var result = [];
            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    result.push( [i, this._map[i]] );
                }
            }
            return result;
        };
        ObjectMap.prototype.forEach = function(cb, thisArg) {
            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    cb.call( thisArg, this._map[i], i, this );
                }
            }
        };
        ObjectMap.prototype.get = function(key) {
            if( this._map.hasOwnProperty( key ) ) {
                return this._map[key];
            }
            return void 0;
        };
        ObjectMap.prototype.has = function(key) {
            return this._map.hasOwnProperty( key );
        };
        ObjectMap.prototype.set = function(key, value) {
            this._map[key] = value;
            return this;
        };
        ObjectMap.prototype.keys = function() {
            return Object.keys( this._map );
        };
        ObjectMap.prototype.values = function() {
            var result = [];
            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    result.push( this._map[i] );
                }
            }
            return result;
        };
        return ObjectMap;
    })();
    MapAdapter.ObjectMap = ObjectMap;
    function createMap() {
        if( Map !== void 0 ) {
            return new Map();
        }
        else {
            return new ObjectMap();
        }
    }

    MapAdapter.createMap = createMap;
})( MapAdapter || (MapAdapter = {}) );
module.exports = MapAdapter;
