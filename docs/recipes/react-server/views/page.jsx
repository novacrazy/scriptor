/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react', './components/hello-world.jsx'], function(React, Hello) {
    var Page = React.createClass( {
        render: function() {
            return (
                <div>
                    <Hello/>
                    <div>
                        <hr/>
                        <p>This is some example text.</p>
                    </div>
                </div>
            );
        }
    } );

    return function() {
        return Page;
    };
} );
