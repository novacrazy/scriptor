define( ['Scriptor', 'fs', 'dot'], function( Scriptor, fs, doT ) {
    Scriptor.extensions['.dot'] = function( module, filename ) {
        var src = fs.readFileSync( filename, 'utf-8' );
        src = Scriptor.common.stripBOM( src );

        try {
            module.exports = doT.template( src );

        } catch( err ) {
            err.message = filename + ': ' + err.message;
            throw err;
        }
    };
} );
