Scriptor API Documentation
===========================

**Note**: This documentation is for Scriptor 2.x and not valid for 1.x

##Foreword about the sync and async builds
Instead of having a couple thousand lines of documentation for each build of Scriptor, documentation has been combined and will point out the differences between methods for Synchronous and Asynchronous builds. However, the differences are usually quite simple, and commonly boils down to:
> The async build returns Promises for any function that might wait on a result, like `.exports()`, `.call()`, `.apply()`, `.value()`, and so forth. Anything in the async build that would return a Promise, does not in the sync build; it returns the value directly and synchronously.

###Limitations of the synchronous build
The synchronous build does not have features like coroutines and asynchronous plugins available. The synchronous build also comes with custom extensions, but they read the files synchronously and are just used to conveniently inject the AMD functions.

###Limitations of the asynchronous build
Keep in mind there are some things that cannot be made asynchronous without forking Node.js (or io.js) and making modifications to the core module system, so things like modules without a relative or absolute filepath and internal modules will resolve and be compiled synchronously using the built-in `require`, which cannot be made asynchronous.

Using custom extension handlers (of which `.js` and `.json` are included), Scriptor can load the script files asynchronously, but even then script compilation into executable code is **always** synchronous. However, its all done lazily in both builds to avert any unneeded hiccups wherever possible.

<hr>

##Table of contents
- [Static Methods]()
    - [`Scriptor.load(filename : string, watch? : boolean, parent? : IModule)`]()
    - [`Scriptor.compile(src : string | Reference, watch? : boolean, parent? : IModule)`]()
    - [`Scriptor.enableCustomExtensions(enable? : boolean)`]()
    - [`Scriptor.disableCustomExtensions()`]()
    - [`Scriptor.extensions`]()
    - [`Scriptor.extensions_enabled`]()
    - [`Scriptor.identity(left : Reference, right : Reference)`]()

- [`Script`]()
    - [Quick Start]()
    - [`new Script(filename? : string, parent? : Module)`]()
    - [`.load(filename : string, watch? : boolean)`]()
    - [`.exports()`]()
    - [`.call(...args : any[])`]()
    - [`.apply(args : any[])`]()
    - [`.reference(...args : any[])`]()
    - [`.reference_apply(args : any[])`]()
    - [`.require(path : string | string[], cb? : (...results : any[]) => any, errcb? : (err : any) => any)`]()
        - [`.toUrl(path : string)`]()
        - [`.specified(id : string)`]()
        - [`.defined(id : string)`]()
        - [`.undef(id : string)`]()
        - [`.onError`]()
    - [`.define(id? : string, deps? : string[], factory : Function)`]()
        - [`.require`]()
    - [`.include(filename : string, load? : boolean)`]()
    - [`.unload()`]()
    - [`.reload()`]()
    - [`.watch(persistent? : boolean)`]()
    - [`.unwatch()`]()
    - [`.propagateChanges(enable? : boolean)`]()
    - [`.close(permanent? : boolean)`]()
    - [`.baseUrl`]()
    - [`.imports`]()
    - [`.id`]()
    - [`.children`]()
    - [`.parent`]()
    - [`.loaded`]()
    - [`.watched`]()
    - [`.filename`]()
    - [`.maxRecursion`]()
    - [`.manager`]()
    - [`.pending`]()

- [`SourceScript`](#sourcescript)
    - [`new Script(src? : string|Reference, parent? : Module)`]()
    - [`.load(src? : string|Reference, watch? : boolean)`]()
    - [`.source()`]()

- [Script Environment]()
    - [`module.define(id? : string, deps? : string[], factory : Function)`]()
    - [`module.include(filename : string, load? : boolean)`]()
    - [`module.on('unload', Function)`]()
    - [Note about custom extensions and AMD injection]()

- [`Reference`]()
    - [About References]()
    - [`ITransformFunction`]()
    - [`new Reference(script : Script, args : any[])`]()
    - [`.value()`]()
    - [`.close(recursive? : boolean)`]()
    - [`.left()`]()
    - [`.right()`]()
    - [`.transform(transform? : ITransformFunction)`]()
    - [`.join(transform? : ITransformFunction)`]()
    - [`.ran`]()
    - [`.closed`]()
    - Static
        - [`Reference.resolve(value : any)`]()
        - [`Reference.join(left : Reference, right : Reference)`]()
        - [`Reference.join_all(refs : Reference[])`]()
        - [`Reference.transform(ref : Reference, transform : ITransformFunction)`]()

- [`Manager`]()
    - [About Managers]()
    - [`new Manager(grandParent? : IModule)`]()
    - [`.add(filename : string, watch? : boolean)`]()
    - [`.get(filename : string)`]()
    - [`.remove(filename: string, close?: boolean)`]()
    - [`.call(filename : string, ...args : any[])`]()
    - [`.apply(filename : string, args : any[])`]()
    - [`.cwd()`]()
    - [`.chdir(dir : string)`]()
    - [`.reference(filename : string, ...args : any[])`]()
    - [`.reference_apply(filename : string, args : any[])`]()
    - [`.clear(close? : boolean)`]()
    - [`.propagateChanges(enable? : boolean)`]()
    - [`.parent`]()
    - [`.scripts`]()

<hr>

##Static Methods

To make things easier, Scriptor provides two methods for loading and compiling scripts for files or source code directly, as well as helper functions for enabling custom extension handler (See [HERE]()), and an `identity` function for `References`.

#####`Scriptor.load(filename : string, watch? : boolean, parent? : IModule)` -> `Script`

This is effectively a shortcut for `new Script(filename, parent)`, but allows pre-emptively disabling file watching, as it is enabled by default when just using the constructor.

Additionally, a script cache is kept for loaded scripts, mostly so that non-managed scripts requiring other scripts don't create additional memory leaks. Otherwise it behaves normally. This does prevent a single script from being created more than once, but if you need that kind of functionality, it would be better to create your own functions and use the `Script` constructor.

<hr>

#####`Scriptor.compile(src : string | Reference, watch? : boolean, parent? : IModule)` -> `SourceScript`

This is effectively a shortcut for `new SourceScript(src, parent)`.

Unlike `Scriptor.load`, `Scriptor.compile` does not have a script cache, and every compiled script is unique.

Sources can be watched for changes if they are a `Reference` instance.

<hr>

#####`Scriptor.enableCustomExtensions(enable? : boolean)` -> `void`

If `enable` is true, custom extension handlers will be enabled. By default, this will create handlers for `.js` and `.json` files so they can be loaded asynchronously or just have the AMD functions injected directly.

For the asynchronous build, the custom handlers load files asynchronously, injects the AMD functions and compiles the scripts. For the synchronous version, it loads them synchronously and injects the AMD functions and compiles the scripts.

For information on how to write your own extension handlers see [Custom Extension Handlers]()
<hr>

#####`Scriptor.disableCustomExtensions()` -> `void`

The same as [`Scriptor.enableCustomExtensions(false)`]()

<hr>

#####`Scriptor.extensions` <-> `{[ext : string] : handler}`

This is an object that holds the custom extension handlers for Scriptor to use when loading files.

See [Custom Extension Handlers]() for more information on how to use this.

<hr>

#####`Scriptor.extensions_enabled` -> `boolean`

Simple boolean flag for if extensions are enabled. It *can* be changed manually, but it's much safer to set it via [`Scriptor.enableCustomExtensions()`]() instead.

<hr>

#####`Scriptor.identity(left : Reference, right : Reference)` -> `any | Promise<any>`

Returns the value of the left reference.

While it seems a bit strange to leave the right reference unused, identity is a type of [`ITransformFunction`]() and should acknowledge that. If passed into [`Reference.transform`](), the transform function only takes parameter, but when passed to [`Reference.join`](), it takes two. So in either case the identity will return something.

```javascript
function identity(left : Reference, right : Reference) {
    return left.value();
}
```

<hr>

##Script

The core of Scriptor is of course the Script class. It abstracts from modules, files, events and dependencies while retaining an comprehensive API for managing everything.

####Quick Start
A relatively simple example demonstrating a few of Scriptor's interesting features.

```javascript
//app.js
//NOTE: Coroutines only work for the asynchronous build
define( ['koa'], function*(koa, require) {
    //require returns a promise, which can be yielded to the coroutine
    var router = yield require( 'koa-router' );

    return function() {
        var app = koa();
        //Configure other parts of the app
        app.use( router(app) );
        return app;
    };
} );
```
```javascript
//index.js
var Scriptor = require( 'scriptor/async' );
Scriptor.enableCustomExtensions(); //Enable asynchronous file loading and AMD injection

var main = new Scriptor.Script( 'app.js' );
main.call().then( function(app) {
    app.listen( 8080 );
} );
```
See [Example 1]() for source files.

<hr>

#####`new Script(filename? : string, parent? : Module)`

Creates a new Script instance, optionally loading a script file from the constructor. A parent module can also be specifified, but defaults to the Scriptor module.

If a filename is given, the constructor calls [`.load(filename)`](), which does watch the file by default. If no filename is given, then nothing is loaded and `.load` must be called manually.

Since JavaScript does not have destructors, it is highly recommended to call [`.close()`]() on Script instances when they are no longer required, especially in long-running processes where memeory is essential.

<hr>

#####`.load(filename : string, watch? : boolean)` -> `Script`

Tells the script to load a file to be used as the script code. If custom extensions are enabled, it will be handled via those handlers, otherwise it will use the built-in extension handlers.

If `watch` is true, it will watch the file for changes and take care of reloading or renaming whenever necessary. It does start watching the file immediately, even if the file has not been loaded or compiled yet.

`watch` defaults to true.

<hr>

#####`.exports()` -> `any | Promise<any>`

This is to access to the primary exports of the executed script.

For example, suppose this script is the one being loaded in.
```javascript
//test.js
module.exports = 42;
```
Then it is loaded like so:
```javascript
//index.js
var assert = require( 'assert' );
var Scriptor = require( 'scriptor/sync' );

var main = new Scriptor.Script( 'test.js' );
assert.strictEqual( main.exports(), 42 );
```

See [Example 2]() for source files.

Scriptor is primarily lazily evaluated, so if the script has not been loaded from file or has not been compiled, it will be done so in this function.

<hr>

#####`.call(...args : any[])` -> `any | Promise<any>`

If `.exports()` is a function, `.call` will invoke that function safely with any arguments given. If `.exports()` is not a function, it will not invoke anything and just return `.exports()` untouched.

<hr>

#####`.apply(args : any[])` -> `any | Promise<any>`

Same as [`.call`](), but instead of a variadic function this takes an array of arguments to apply to `.exports()`

<hr>

#####`.reference(...args : any[])` -> [`Reference`]()

Same as `new Reference(this, args)`.

Creates a new [Reference]() with the variadic arguments.

<hr>

#####`.reference_apply(args : any[])` -> [`Reference`]()

Like [`.reference`](), but instead of a variadic function this takes an array of arguments.

<hr>

#####`.require(path : string | string[], cb? : (...results : any[]) => any, errcb? : (err : any) => any)` -> `any | Promise<any> | any[] | Promise<any[]>`

This is an all-in-one require function that leverages AMD semantics and functionality with the standard CommonJS `require` found in Node.

For the synchronous build, it can be used effectively the same way as the standard `require`, but for the asynchronous build it will return a Promise that resolves to the required module.

A callback and error callback can be given, which will be executed when the modules being required have been loaded.

An array of dependencies can be given to `.require`, too, and will be spread across the callback if one is provided, otherwise an array will be returned/resolved.

For example, using the synchronous build:
```javascript
var someScript = new Script('something.js');
var assert = someScript.require('assert');

someScript.require(['http', 'express'], function(http, express){
    //do whatever
});
```

However, using it outside of the script is kind of useless. The biggest use for it is within the script. For the AMD functions, like `module.define`, there are certain default dependencies added after any requested dependencies. The first of which is `require`.

Example:
```javascript
//somescript.js (synchronous)
define(['http', 'express'], function(http, express, require) {
    require(['path', 'assert], function(path, assert) {
        //do something
    });
});
```

In addition to that, it will also resolve defined modules in scripts.

Example:
```javascript
//somescript2.js
define('helper', ['path'], function(path, require) {
    return function(filename) {
        return path.resolve(__dirname, filename);
    };
});

define(['http', 'express', 'assert', 'path'], function(http, express, assert, path, require) {
    require('helper', function(helper) {
        assert.strictEqual(helper('test.js'), path.resolve(__dirname, 'test.js'));
    });
});
```





