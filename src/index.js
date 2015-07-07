/**
 * Created by Aaron on 7/5/2015.
 */

/*
 * This file uses ES7 export extensions
 * */

import Promise from 'bluebird';

import Script from './script.js';
import {load} from './script.js';

import SourceScript from './source_script.js';
import {compile} from './source_script.js';

import TextScript from './text_script.js';

import Manager from './manager.js';
import Reference from './reference.js';

import addYieldHandler from './yield_handler.js';

let Scriptor = {
    Promise, Script, SourceScript, TextScript, Manager, Reference, addYieldHandler, load, compile
};

Script.Scriptor = Scriptor;

export default Scriptor;
