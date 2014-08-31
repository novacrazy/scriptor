/**
 * Created by novacrazy on 8/12/14.
 */
var __extends = this.__extends || function(d, b) {
    for( var p in b ) {
        if( b.hasOwnProperty( p ) ) {
            d[p] = b[p];
        }
    }
    function __() {
        this.constructor = d;
    }

    __.prototype = b.prototype;
    d.prototype = new __();
};
var Module;
(function(_Module) {
    //Also happens to match the backwards compatibility in the 'module' module
    _Module.Module = require( 'module' );

    var ScriptModule = (function(_super) {
        __extends( ScriptModule, _super );
        function ScriptModule() {
            _super.apply( this, arguments );
            this.module = (this);
        }

        //CUSTOM FUNCTIONS
        ScriptModule.prototype.define = function(arg1, arg2, arg3) {
            var id = 'main';
            var deps = ['require', 'exports', 'module'];
            var factory;

            if( Array.isArray( arg1 ) && typeof arg2 === 'function' ) {
                deps = arg1;
                factory = arg2;
            } else if( typeof arg1 === 'string' && typeof arg2 === 'function' ) {
                id = arg1;
                factory = arg2;
            } else if( typeof arg1 === 'function' ) {
                factory = arg1;
            } else {
                throw new Error( 'No factory function given' );
            }

            return this.exports[id] = [id, deps, factory];
        };
        return ScriptModule;
    })( Module );
    _Module.ScriptModule = ScriptModule;
})( Module || (Module = {}) );

module.exports = Module;
