/**
 * Created by Aaron on 7/5/2015.
 */

import Promise from 'bluebird';

import {readFile} from 'fs';

import {stripBOM, injectAMD, injectAMDAndStripBOM} from './utils.js';

let readFileAsync = Promise.promisify( readFile );

export default {
    '.js':   ( module, filename ) => {
        return readFile( filename ).then( injectAMDAndStripBOM ).then( src => {
            module._compile( src.toString( 'utf-8' ), filename );

            return src;
        } )
    },
    '.json': ( module, filename ) => {
        return readFile( filename ).then( stripBOM ).then( src => {
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