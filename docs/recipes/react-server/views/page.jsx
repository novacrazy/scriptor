/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react', './react-top.jsx'], function(React, Top) {
    var Hello = React.createClass( {
        render: function() {
            return (
                <Top>
                    <h1>Hello, World!</h1>
                    <div>
                        <hr/>
                        <p>This is some example text.</p>
                    </div>
                </Top>
            );
        }
    } );

    return function() {
        return Hello;
    };
} );
