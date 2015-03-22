/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react'], function(React) {
    var Top = React.createClass( {
        render: function() {
            return (
                <html>
                    <head>
                        <title>{this.props.title}</title>
                    </head>
                    <body>
                        <div id="react-mount">
                            {this.props.children}
                        </div>
                    </body>
                </html>
            );
        }
    } );

    return Top;
} );
