/**
 * Created by novacrazy on 3/22/2015.
 */

define( ['react'], function(React) {
    return function(Content, options) {
        return React.renderToStaticMarkup( Content( options ) );
    };
} );
