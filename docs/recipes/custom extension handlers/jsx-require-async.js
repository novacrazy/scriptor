define( ['Scriptor', 'promisify!fs', 'react-tools'], function(Scriptor, fs, React) {
    Scriptor.extensions['.jsx'] = function(module, filename) {
        return fs.readFileAsync( filename, 'utf-8' ).then( function(src) {

            src = React.transform( Scriptor.common.stripBOM( src ) );

            module._compile( Scriptor.common.injectAMD( src ), filename );

            return src;
        } );
    };
} );
