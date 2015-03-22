/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react', './react-top.jsx'], function(React, Top) {

    var Hello = React.createClass( {
        render: function() {
            return (
                <Top>
                    <p>Hello, World!</p>
                </Top>
            );
        }
    } );

    return function() {
        return Hello;
    };
} );
