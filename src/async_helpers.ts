/**
 * Created by novacrazy on 2/12/2015.
 */

import Promise = require('bluebird');

module ScriptorAsyncHelpers {

    export function isThenable( obj : any ) : boolean {
        return (obj !== void 0 && obj !== null) && (obj instanceof Promise || typeof obj.then === 'function');
    }

    export function tryPromise( value : any ) {
        if( isThenable( value ) ) {
            return value;

        } else {
            return Promise.resolve( value );
        }
    }
}

export = ScriptorAsyncHelpers;
