/**
 * Created by Aaron on 7/5/2015.
 */

import Promise from "bluebird";
import {readFile} from "fs";
import {stripBOM, injectAMDAndStripBOM} from "./utils.js";

let readFileAsync = Promise.promisify( readFile );

/*
 * These are basically asynchronous versions of the default .js and .json extension handlers found in node/lib/module.js,
 * but the .js one also goes ahead and inject the AMD header described in ./defaults.js
 * */

export default {
    '.js':   ( module, filename ) => {
        return readFileAsync( filename ).then( injectAMDAndStripBOM ).then( src => {
            module._compile( src.toString( 'utf-8' ), filename );

            return src;
        } )
    },
    '.json': ( module, filename ) => {
        return readFileAsync( filename ).then( stripBOM ).then( src => {
            try {
                module.exports = JSON.parse( src.toString( 'utf-8' ) );

            } catch( err ) {
                err.message = filename + ': ' + err.message;
                throw err;
            }

            return src;
        } );
    }
};
