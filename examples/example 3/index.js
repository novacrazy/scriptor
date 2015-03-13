//index.js
var Scriptor = require( 'scriptor' );
Scriptor.installCustomExtensions();

var script = new Scriptor.Script( 'something.js' );

script.imports = {
    message: 'Hello, World!'
};

script.call();
