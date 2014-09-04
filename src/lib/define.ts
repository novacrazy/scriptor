/**
 * Created by novacrazy on 8/31/14.
 */

import Module = require('./Module');

module AMD {
    export interface IDefine {
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => any );
        ( id : string, deps : string[], factory : ( ...deps : any[] ) => Function );

        ( deps : string[], factory : ( ...deps : any[] ) => any );
        ( deps : string[], factory : ( ...deps : any[] ) => Function );

        ( factory : ( ...deps : any[] ) => any );
        ( factory : ( ...deps : any[] ) => Function );
    }

    export interface IAMDefine {
        ( module : Module.IModule, require? : typeof require ) : IDefine;
    }

    export var amdefine : IAMDefine = require( 'amdefine' );
}

export = AMD;
