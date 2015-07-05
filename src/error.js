/**
 * Created by Aaron on 7/4/2015.
 */

export function normalizeError( id, type, err = {} ) {
    if( Array.isArray( err.requireModules )
        && !Array.isArray( id )
        && err.requireModules.indexOf( id ) === -1 ) {
        err.requireModules.push( id );

    } else {
        err.requireModules = Array.isArray( id ) ? id : [id];
    }

    err.requireType = err.requireType || type;

    err.message = (err.message || '') + ' - ' + id;

    return err;
}