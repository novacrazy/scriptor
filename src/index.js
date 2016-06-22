/**
 * Created by Aaron on 7/5/2015.
 */

/*
 * This file uses ES7 export extensions
 * */

import Promise from "bluebird";
import Script, {load} from "./script.js";
import SourceScript, {compile} from "./source_script.js";
import TextScript from "./text_script.js";
import Manager from "./manager.js";
import Reference from "./reference.js";
import * as utils from "./utils.js";

let Scriptor = {
    Promise,
    Script,
    SourceScript,
    TextScript,
    Manager,
    Reference,
    load,
    compile,
    utils
};

Script.Scriptor = Scriptor;

export default Scriptor;
