/**
 * Created by Aaron on 7/6/2015.
 */

import assert from 'assert';

import Promise from 'bluebird';

Promise.longStackTraces();

export function runTests( build, tests ) {
    assert( build === 'compat' || build === 'modern', 'Only modern and compat builds are supported' );

    let Scriptor;

    describe( `requiring ${build} build`, function() {
        Scriptor = require( `../../build/${build}/index.js` ).default;
    } );

    if( typeof tests === 'function' ) {
        tests( Scriptor, build );

    } else if( Array.isArray( tests ) ) {
        for( let test of tests ) {
            assert( typeof test === 'function', 'tests must be a function or array of functions' );

            test( Scriptor, build );
        }

    } else {
        throw new TypeError( 'tests must be a function or array of functions' );
    }
}
