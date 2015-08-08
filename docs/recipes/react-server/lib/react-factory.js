/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react'], function( React, require ) {
    //Create a cache map to be used in storing the references
    var cache = new Map();

    //Make sure whenever the script reloads that the cache map is cleared
    module.on( 'unload', function() {
        cache.clear();
    } );

    //Scriptor supports coroutines as the 'main' function of a script, so this takes advantage of that
    return function*( view ) {
        var ref;

        //If the view reference already exists, just return it
        if( cache.has( view ) ) {
            ref = cache.get( view );

        } else {
            //Otherwise, require and include the view as a script
            var script = yield require( 'include!' + view );

            //Use the script reference function to do a transform that creates a React factory
            ref = script.reference().transform( function*( left ) {
                return React.createFactory( yield left.value() );
            } );

            cache.set( view, ref );
        }

        //Return the value (or a Promise to the value in this case).
        return ref.value();
    };
} );
