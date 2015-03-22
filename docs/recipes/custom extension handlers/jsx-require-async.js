define( ['Scriptor', 'promisify!fs', 'react-tools'], function(Scriptor, fs, React) {
    Scriptor.extensions['.jsx'] = function(module, filename) {
        return fs.readFileAsync( filename, 'utf-8' ).then( function(content) {
            return Scriptor.common.injectAMDAndStripBOM( content );

        } ).then( function(src) {
            return React.transform( src );

        } ).then( function(src) {
            module._compile( src, filename );
        } );
    };
} );
