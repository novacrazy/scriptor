/**
 * Created by Aaron on 7/5/2015.
 */

/*
 * This file uses ES7 export extensions
 * */

import Promise from 'bluebird';

import Script from './script';
import {load} from './script';

import SourceScript from './source_script';
import {compile} from './source_script';

import TextScript from './text_script';

import Manager from './manager';
import Reference from './reference';

import addYieldHandler from './yield_handler';

let Scriptor = {
    Promise, Script, SourceScript, TextScript, Manager, Reference, addYieldHandler, load, compile
};

Script.Scriptor = Scriptor;

export default Scriptor;
