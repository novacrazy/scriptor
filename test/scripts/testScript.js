/**
 * Created by novacrazy on 9/1/14.
 */
module.define( 'test', ['fs'], function(fs) {
    return fs.readFileSync( module.filename, 'utf8' );
} );

module.define( ['test'], function(test) {

    return function() {
        return test;
    };
} );
