/**
 * Created by novacrazy on 3/22/2015.
 */

//Define our module
define( ['koa', 'koa-router', './lib/react-factory', './lib/react-render'],
    function*(koa, router, factory, render, require) {

        //Add custom extension handlers for .jsx and .dot files
        yield require( ['./lib/jsx-require-async.js', './lib/dot-require-async.js'] );

        //create a new koa app that will handle the web stuff
        var app = koa();
        app.use( router( app ) );

        //This is the outer HTML that wraps the react views
        //Notice we include it as a script, not as a module.
        //That allows it to be updated if modified, as Top.call will reload the script if needed
        var Top = yield require( 'include!./views/react-top.dot' );

        //Redirect to index page
        app.get( '/', function*() {
            this.redirect( '/index.jsx' );
        } );

        //All .jsx files represent views, render them view rendering their factory functions then wrap it in the top HTML.
        app.get( /.*?\.jsx$/g, function*() {
            this.type = 'text/html';
            //Call the Top script and pass in the correct values
            this.body = yield Top.call( {
                title:   this.path,
                content: render( yield factory( '../views' + this.path ), this )
            } );
        } );

        //Create HTTP server
        var server = app.listen( 8080 );

        //Make sure the server closes upon reloading, otherwise we get an 'Error: port in use' error.
        module.on( 'unload', function() {
            server.close();
        } );
    } );
