/**
 * Created by Aaron on 7/6/2015.
 */

'use strict';

var Promise = require( 'bluebird' );

module.exports = function* () {
    return yield new Promise.delay( 10 ).return( 42 );
};
