/**
 * Created by novacrazy on 1/14/2015.
 */

module MapAdapter {

    export class ObjectMap<V> implements Map<string, V> {
        private _map : {[key : string] : V} = {};

        get size() : number {
            return this.keys().length;
        }

        public clear() : void {
            this._map = {};
        }

        public delete( key : string ) : boolean {
            return delete this._map[key];
        }

        public entries() : any[][] {
            var result = [];

            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    result.push( [i, this._map[i]] );
                }
            }

            return result;
        }

        public forEach( cb : ( element : V, key : string, map : ObjectMap<V> ) => any, thisArg : any ) {
            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    cb.call( thisArg, this._map[i], i, this );
                }
            }
        }

        public get( key : string ) : V {
            if( this.has( key ) ) {
                return this._map[key];
            }

            return void 0;
        }

        public has( key : string ) : boolean {
            return this._map.hasOwnProperty( key );
        }

        public set( key : string, value : V ) : ObjectMap<V> {
            this._map[key] = value;

            return this;
        }

        public keys() : string[] {
            return Object.keys( this._map );
        }

        public values() : V[] {
            var result = [];

            for( var i in this._map ) {
                if( this._map.hasOwnProperty( i ) ) {
                    result.push( this._map[i] );
                }
            }

            return result;
        }
    }

    export function createMap<V>() : Map<string, V> {
        if( Map !== void 0 ) {
            return new Map<string, V>();

        } else {
            return new ObjectMap<V>();
        }
    }
}

export = MapAdapter;
