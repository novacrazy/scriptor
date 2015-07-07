/**
 * Created by Aaron on 7/5/2015.
 */

/*
 * This file uses ES7 export extensions
 * */

import Promise from 'bluebird';
import Script from './script';
import Manager from './manager';
import Reference from './reference';

import addYieldHandler from './yield_handlers.js';

let Scriptor = {
    Promise, Script, Manager, Reference, addYieldHandler
};

Script.Scriptor = Scriptor;

export default Scriptor;
