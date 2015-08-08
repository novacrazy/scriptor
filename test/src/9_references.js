/**
 * Created by Aaron on 7/7/2015.
 */


import {runTests} from './runner.js';

import assert from 'assert';

let tests = ( Scriptor, build ) => {
    describe( `References (${build} build)`, function() {
        let {Reference, Script} = Scriptor;

    } );
};

runTests( 'compat', tests );
runTests( 'modern', tests );
