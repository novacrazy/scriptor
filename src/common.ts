/**
 * Created by novacrazy on 1/18/2015.
 */

module ScriptorCommon {
    //Helper function to bind a function to an object AND retain any attached values
    //Also bounds a variable number of arguments to the function, which is neat.
    //The 'to' arguments is in ...args
    //The 'to' arguments is in ...args
    export function bind( func : Function, ...args : any[] ) {
        var res = Function.prototype.bind.apply( func, args );

        //This assumes sub-functions can handle their own scopes
        //or are closures that take that into account
        for( var i in func ) {
            if( func.hasOwnProperty( i ) ) {
                res[i] = func[i];
            }
        }

        return res;
    }

    //These *could* be changed is someone really wanted to, but there isn't a reason for it
    export var default_dependencies : string[] = ['require', 'exports', 'module', 'imports'];
}

export = ScriptorCommon;
