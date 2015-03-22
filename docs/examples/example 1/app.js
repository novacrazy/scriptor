//app.js
//NOTE: Coroutines only work for the asynchronous build
define( ['koa'], function*(koa, require) {
    //require returns a promise, which can be yielded to the coroutine
    var router = yield require( 'koa-router' );

    return function() {
        var app = koa();

        //Configure other parts of the app

        app.use( router( app ) );
        return app;
    };
} );
