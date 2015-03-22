define( ['Scriptor', 'fs', 'react-tools'], function(Scriptor, fs, React) {
    Scriptor.extensions['.jsx'] = function(module, filename) {
        var src = fs.readFileSync( filename, 'utf-8' );
        src = Scriptor.common.injectAMDAndStripBOM( src );
        src = React.transform( src );
        module._compile( src, filename );
    };
} );
