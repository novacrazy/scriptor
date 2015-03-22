/**
 * Created by novacrazy on 3/22/2015.
 */

//Define our module
define( ['koa', 'koa-router', './lib/react-factory', './lib/react-render', './lib/jsx-require-async.js'],
    function(koa, router, factory, render) {

        //create a new koa app that will handle the web stuff
        var app = koa();
        app.use( router( app ) );

        app.get( '/', function*() {
            this.type = 'text/html';
            this.body = render( yield factory( '../views/index.jsx' ), this );
        } );

        app.get( /.*?\.jsx$/g, function*() {
            this.type = 'text/html';
            this.body = render( yield factory( '../views' + this.path ) );
        } );

        var server = app.listen( 8080 );

        module.on( 'unload', function() {
            server.close();
        } );
    } );
