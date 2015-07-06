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

let Scriptor = {
    Promise, Script, Manager, Reference
};

Script.Scriptor = Scriptor;

export default Scriptor;
