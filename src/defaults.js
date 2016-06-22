/**
 * Created by Aaron on 7/4/2015.
 */

// This is the default amount of time any file watchers should debounce events for
export var default_max_debounceMaxWait = 50;

//This chunk of code is prepended to scripts before they are compiled so the define function can be made available to it
export var AMD_Header = "if(typeof define !== 'function' && typeof module.define === 'function') {var define = module.define;}";

//These are the default dependencies that all AMD scripts should have. They are appended to any other given dependencies
export var default_dependencies = ['require', 'exports', 'module', 'imports'];
