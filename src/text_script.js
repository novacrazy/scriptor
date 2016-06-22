/**
 * Created by Aaron on 7/7/2015.
 */

import Script from "./script.js";

/*
 * This is just a variation on the normal script that forces it to always think it's in text mode
 * */
export default class TextScript extends Script {
    get textMode() {
        return true;
    }
}
