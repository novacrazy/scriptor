define( ['Scriptor', 'promisify!fs', 'dot'], function(Scriptor, fs, doT) {
    Scriptor.extensions['.dot'] = function(module, filename) {
        return fs.readFileAsync( filename, 'utf-8' ).then( function(content) {
            if( content.charCodeAt( 0 ) === 0xFEFF ) {
                content = content.slice( 1 );
            }

            doT.templateSettings.strip = false;

            try {
                module.exports = doT.template( content );

            } catch( err ) {
                err.message = filename + ': ' + err.message;
                throw err;
            }
        } );
    };
} );
