/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react', './components/hello-world.jsx'], function( React, Hello ) {

    var Index = React.createClass( {
        render: function() {
            return (
                <Hello/>
            );
        }
    } );

    return function() {
        return Index;
    };
} );
