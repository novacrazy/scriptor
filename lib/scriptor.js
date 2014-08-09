/**
 * Created by novacrazy on 8/9/14.
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
/// <reference path="../reference.ts" />
var events = require( 'events' );

var Scriptor;
(function(Scriptor) {
    var ScriptManager = (function(_super) {
        __extends( ScriptManager, _super );
        function ScriptManager(options) {
            _super.call( this );
            this.useGlobal = true;

            if( options != null ) {
                if( options.useGlobal != null ) {
                    this.useGlobal = options.useGlobal;
                }
            }
        }

        ScriptManager.prototype.addCompiler = function(extension, compiler) {
            this.compilers[extension] = compiler;
        };
        return ScriptManager;
    })( events.EventEmitter );
    Scriptor.ScriptManager = ScriptManager;
})( Scriptor || (Scriptor = {}) );

module.exports = Scriptor;
