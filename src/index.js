/**
 * Created by Aaron on 7/5/2015.
 */

/*
 * NOTE: This file uses ES7 export extensions
 * */

import Promise from "bluebird";
import Script, {load} from "./script.js";
import SourceScript, {compile} from "./source_script.js";
import TextScript from "./text_script.js";
import Manager from "./manager.js";
import * as utils from "./utils.js";

const Scriptor = {
    Promise,
    Script,
    SourceScript,
    TextScript,
    Manager,
    load,
    compile,
    utils
};

//Provide a circular reference to Scriptor from Script
Script.Scriptor = Scriptor;

export default Scriptor;
