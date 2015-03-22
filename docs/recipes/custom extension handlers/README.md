Custom Extension Handlers
=========================

##Topics
* [What is an extension handler?]()
* [So what makes Scriptor's custom extensions special?]()
* [Adding new custom extension handlers]()


One of the unique features about Scriptor is the ability to load and compile files using its own custom extension handlers. This allows it to load files asynchronously and inject code into them to add additional features. However, not many probably know exactly how Node.js and io.js load and compile files to begin with, so custom extensions can seem quite foreign, but they really aren't that bad.

###What is an extension handler?

Node.js can load multiple types of files, like `.js`, `.json` and `.node` binary extensions. It does this through specific functions for each file extension. Like `index.js` will be handled by the `.js` extension handler found in `require.extensions['.js']`, which is quite simple. Here is is below:

```javascript
// Native extension for .js
Module._extensions['.js'] = function(module, filename) {
  var content = fs.readFileSync(filename, 'utf8');
  module._compile(stripBOM(content), filename);
};
```

All it does is read the file in, strip the BOM characters off and uses `module._compile` to evaluate the script.

Internally, `module._compile` uses the `vm` module to execute the new code in an isolated context within a function wrapper. That's where `exports` and `require` come from, among other things. But the thing to take away is that if you pass valid source code to `module._compile`, it will compile and run it.

###So what makes Scriptor's custom extensions special?

Well, Scriptor prefers to 're-invent the wheel' so that it can both load files asynchronously and inject a bit of code that places `module.define` into the global namespace of that script, making AMD modules much easier to use.

However, a drawback of this is that in order to have Scriptor handle other file extensions, they must be installed manually.

So first, let's look at the basic synchronous module loading for Scriptor:
```javascript
Scriptor.extensions['.js'] = function(module, filename) {
    var content = fs.readFileSync( filename, 'utf8' );
      module._compile( Common.injectAMD( Common.stripBOM( content ) ), filename );
  };
```

Which is pretty much identical to the built-in handler for Node.js, but it also injects that AMD code mentioned previously.

But the real usefullness shows in the asynchronous build, as shown below:
```javascript
//Promisify using bluebird
var readFile = Promise.promisify(fs.readFile);
Scriptor.extensions['.js'] = function(module, filename) {
    return readFile( filename,
        'utf-8' ).then( Common.stripBOM ).then( Common.injectAMD ).then( function(content) {
            module._compile( content, filename );
        } );
};

Scriptor.extensions['.json'] = function(module, filename) {
   return readFile( filename, 'utf-8' ).then( Common.stripBOM ).then( function(content) {
       try {
           module.exports = JSON.parse( content );
       }
       catch( err ) {
           err.message = filename + ': ' + err.message;
           throw err;
       }
   } );
};
```

As shown, these extensions load the files asynchronously and returns a Promise for when they are done compiling.

###Adding new custom extension handlers

Of course all this complexity would be useless if it wasn't possible to add your own handlers.

To do so, you basically emulate the above behavior for either the synchronous or asynchronous build extensions.

For example, if you wanted to add a handler to asynchronously load React's `.jsx` file extension, it would look something like this:
```javascript
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
```

The dependency `Scriptor` is a special module in which Scriptor interprets should be itself, obviously. This also takes advantage of the internal api `Scriptor.Common`, which is described more in depth [HERE]()
