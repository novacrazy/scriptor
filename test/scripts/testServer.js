/**
 * Created by novacrazy on 9/15/14.
 */

module.define( ['http'], function(http) {

    return function(done) {

        var server = http.createServer( function(req, res) {
            //res.setEncoding('utf8');

            res.writeHead( 200, {'Content-Type': 'text/plain'} );
            res.end( 'Hello, World!\n' );

            server.close();

        } ).listen( 8080, done );

    }

} );
