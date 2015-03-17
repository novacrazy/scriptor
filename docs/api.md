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

------

##Table of contents
- [Static Methods](#static-methods)
    - [`Scriptor.load(filename : string, watch? : boolean, parent? : IModule)`](#scriptorloadfilename--string-watch--boolean-parent--imodule---script)
    - [`Scriptor.compile(src : string | Reference, watch? : boolean, parent? : IModule)`](#scriptorcompilesrc--string--reference-watch--boolean-parent--imodule---sourcescript)
    - [`Scriptor.installCustomExtensions(enable? : boolean)`](#scriptorinstallcustomextensionsenable--boolean---void)
    - [`Scriptor.disableCustomExtensions()`](#scriptordisablecustomextensions---void)
    - [`Scriptor.extensions`](#scriptorextensions---ext--string--handler)
    - [`Scriptor.extensions_enabled`](#scriptorextensions_enabled---boolean)
    - [`Scriptor.identity(left : Reference, right : Reference)`](#scriptoridentityleft--reference-right--reference---any--promiseany)

- [`Script`](#script)
    - [Quick Start](#quick-start)
    - [`new Script(filename? : string, parent? : Module)`](#new-scriptfilename--string-parent--module)
    - [`.load(filename : string, watch? : boolean)`](#loadfilename--string-watch--boolean---script)
    - [`.exports()`](#exports---any--promiseany)
    - [`.call(...args : any[])`](#callargs--any---any--promiseany)
    - [`.apply(args : any[])`](#applyargs--any---any--promiseany)
    - [`.reference(...args : any[])`](#referenceargs--any---reference)
    - [`.reference_apply(args : any[])`](#reference_applyargs--any---reference)
    - [`.require : IRequireFunction`](#require-irequirefunction)
        - [`.toUrl(path : string)`](#requiretourl-path--string----string)
        - [`.specified(id : string)`](#requirespecified-id--string----boolean)
        - [`.defined(id : string)`](#requiredefined-id--string----boolean)
        - [`.undef(id : string)`](#requireundef-id--string-)
        - [`.onError`](#requireonerror-err--any-)
        - [`.resolve( id : string )`](#requireresolve-id--string----string)
    - [`.define : IDefineFunction`](#define-idefinefunction)
        - [`.amd`](#defineamd---jquery-false)
        - [`.require : IRequireFunction`](#definerequire-irequirefunction)
    - [`.include(filename : string, load? : boolean)`](#includefilename--string-load--boolean---script)
    - [`.unload()`](#unload---boolean)
    - [`.reload()`](#reload---boolean)
    - [`.watch(persistent? : boolean)`](#watchpersistent--boolean---boolean)
    - [`.unwatch()`](#unwatch---boolean)
    - [`.propagateEvents(enable? : boolean)`](#propagateeventsenable--boolean---boolean)
    - [`.close(permanent? : boolean)`](#closepermanent--boolean)
    - [`.baseUrl`](#baseurl---string)
    - [`.imports`](#imports---key--string--any)
    - [`.id`](#id---string)
    - [`.children`](#children---imodule)
    - [`.parent`](#parent---imodule)
    - [`.loaded`](#loaded---boolean)
    - [`.pending`](#pending---boolean)
    - [`.watched`](#watched---boolean)
    - [`.filename`](#filename---string)
    - [`.maxRecursion`](#maxrecursion---number)
    - [`.manager`](#manager---manager)
    - [`.isManaged()`](#ismanaged---boolean)

- [`SourceScript`](#sourcescript)
    - [`new Script(src? : string|Reference, parent? : Module)`](#new-scriptsrc--stringreference-parent--module---sourcescript)
    - [`.load(src? : string|Reference, watch? : boolean)`](#loadsrc--stringreference-watch--boolean---sourcescript)
    - [`.source()`](#source---stringpromisestring)

- [Script Environment](#script-environment)
    - [`module.define : IDefineFunction`](#moduledefine-idefinefunction)
    - [`module.include(filename : string, load? : boolean)`](#moduleincludefilename--string-load--boolean---script)
    - [`module.on('unload', Function)`](#moduleonunload-function)
    - [Note about custom extensions and AMD injection](#note-about-custom-extensions-and-amd-injection)

- [`Reference`](#reference)
    - [About References](#about-references)
    - [`ITransformFunction`](#itransformfunction)
    - [`new Reference(script : Script, args : any[])`](#new-referencescript--script-args--any---reference)
    - [`.value()`](#value---any--promiseany)
    - [`.close(recursive? : boolean)`](#closerecursive--boolean)
    - [`.left()`](#left---reference)
    - [`.right()`](#right---reference)
    - [`.transform(transform? : ITransformFunction)`](#transformtransform--itransformfunction---reference)
    - [`.join(ref : Reference, transform? : ITransformFunction)`](#joinref--reference-transform--itransformfunction---reference)
    - [`.ran`](#ran---boolean)
    - [`.closed`](#closed---boolean)
    - Static
        - [`Reference.resolve(value : any)`](#referenceresolvevalue--any---reference)
        - [`Reference.join(left : Reference, right : Reference, transform : ITransformFunction)`](#referencejoinleft--reference-right--reference-transform--itransformfunction---reference)
        - [`Reference.join_all(refs : Reference[], transform : ITransformFunction)`](#referencejoin_allrefs--reference-transform--itransformfunction---reference)
        - [`Reference.transform(ref : Reference, transform : ITransformFunction)`](#referencetransformref--reference-transform--itransformfunction---reference)

- [`Manager`](#manager)
    - [About Managers](#about-managers)
    - [`new Manager(grandParent? : IModule)`](#new-managergrandparent--imodule---manager)
    - [`.add(filename : string, watch? : boolean)`](#addfilename--string-watch--boolean---script)
    - [`.get(filename : string)`](#getfilename--string---script)
    - [`.remove(filename: string, close?: boolean)`](#removefilename-string-close-boolean---boolean)
    - [`.call(filename : string, ...args : any[])`](#callfilename--string-args--any---any--promiseany)
    - [`.apply(filename : string, args : any[])`](#applyfilename--string-args--any---any--promiseany)
    - [`.cwd()`](#cwd---string)
    - [`.chdir(dir : string)`](#chdirdir--string---string)
    - [`.reference(filename : string, ...args : any[])`](#referencefilename--string-args--any---reference)
    - [`.reference_apply(filename : string, args : any[])`](#reference_applyfilename--string-args--any---reference)
    - [`.clear(close? : boolean)`](#clearclose--boolean)
    - [`.propagateEvents(enable? : boolean)`](#propagateeventsenable--boolean)
    - [`.parent`](#parent---imodule-1)
    - [`.scripts`](#scripts---mapscript)

------

##Static Methods

To make things easier, Scriptor provides two methods for loading and compiling scripts for files or source code directly, as well as helper functions for enabling custom extension handler (See [HERE]()), and an `identity` function for `References`.

#####`Scriptor.load(filename : string, watch? : boolean, parent? : IModule)` -> `Script`

This is effectively a shortcut for `new Script(filename, parent)`, but allows pre-emptively disabling file watching, as it is enabled by default when just using the constructor.

Additionally, a script cache is kept for loaded scripts, mostly so that non-managed scripts requiring other scripts don't create additional memory leaks. Otherwise it behaves normally. This does prevent a single script from being created more than once, but if you need that kind of functionality, it would be better to create your own functions and use the `Script` constructor.

------

#####`Scriptor.compile(src : string | Reference, watch? : boolean, parent? : IModule)` -> `SourceScript`

This is effectively a shortcut for `new SourceScript(src, parent)`.

Unlike `Scriptor.load`, `Scriptor.compile` does not have a script cache, and every compiled script is unique.

Sources can be watched for changes if they are a `Reference` instance.

------

#####`Scriptor.installCustomExtensions(enable? : boolean)` -> `void`

If `enable` is true, custom extension handlers will be enabled. By default, this will create handlers for `.js` and `.json` files so they can be loaded asynchronously or just have the AMD functions injected directly.

For the asynchronous build, the custom handlers load files asynchronously, injects the AMD functions and compiles the scripts. For the synchronous version, it loads them synchronously and injects the AMD functions and compiles the scripts.

For information on how to write your own extension handlers see [Custom Extension Handlers]()

------

#####`Scriptor.disableCustomExtensions()` -> `void`

The same as [`Scriptor.installCustomExtensions(false)`](#scriptorinstallcustomextensionsenable--boolean---void)

------

#####`Scriptor.extensions` <-> `{[ext : string] : handler}`

This is an object that holds the custom extension handlers for Scriptor to use when loading files.

See [Custom Extension Handlers]() for more information on how to use this.

------

#####`Scriptor.extensions_enabled` -> `boolean`

Simple boolean flag for if extensions are enabled. It *can* be changed manually, but it's much safer to set it via [`Scriptor.installCustomExtensions()`](#scriptorinstallcustomextensionsenable--boolean---void) instead.

------

#####`Scriptor.identity(left : Reference, right : Reference)` -> `any | Promise<any>`

Returns the value of the left reference.

While it seems a bit strange to leave the right reference unused, identity is a type of [`ITransformFunction`](#itransformfunction) and should acknowledge that. If passed into [`Reference.transform`](#transformtransform--itransformfunction---reference), the transform function only takes parameter, but when passed to [`.join`](#joinref--reference-transform--itransformfunction---reference), it takes two. So in either case the identity will return something.

```javascript
function identity(left : Reference, right : Reference) {
    return left.value();
}
```

------

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
Scriptor.installCustomExtensions(); //Enable asynchronous file loading and AMD injection

var main = new Scriptor.Script( 'app.js' );
main.call().then( function(app) {
    app.listen( 8080 );
} );
```
See [Example 1](https://github.com/novacrazy/scriptor/tree/master/examples/example%201) for source files.

------

#####`new Script(filename? : string, parent? : Module)`

Creates a new Script instance, optionally loading a script file from the constructor. A parent module can also be specifified, but defaults to the Scriptor module.

If a filename is given, the constructor calls [`.load(filename)`](#loadfilename--string-watch--boolean---script), which does watch the file by default. If no filename is given, then nothing is loaded and `.load` must be called manually.

Since JavaScript does not have destructors, it is highly recommended to call [`.close()`](#closepermanent--boolean) on Script instances when they are no longer required, especially in long-running processes where memory is essential.

------

#####`.load(filename : string, watch? : boolean)` -> `Script`

Tells the script to load a file to be used as the script code. If custom extensions are enabled, it will be handled via those handlers, otherwise it will use the built-in extension handlers.

If `watch` is true, it will watch the file for changes and take care of reloading or renaming whenever necessary. It does start watching the file immediately, even if the file has not been loaded or compiled yet.

`watch` defaults to true.

------

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

See [Example 2](https://github.com/novacrazy/scriptor/tree/master/examples/example%202) for source files.

Scriptor is primarily lazily evaluated, so if the script has not been loaded from file or has not been compiled, it will be done so in this function.

------

#####`.call(...args : any[])` -> `any | Promise<any>`

If `.exports()` is a function, `.call` will invoke that function safely with any arguments given. If `.exports()` is not a function, it will not invoke anything and just return `.exports()` untouched.

------

#####`.apply(args : any[])` -> `any | Promise<any>`

Same as [`.call`](#callargs--any---any--promiseany), but instead of a variadic function this takes an array of arguments to apply to `.exports()`

------

#####`.reference(...args : any[])` -> [`Reference`](#reference)

Same as `new Reference(this, args)`.

Creates a new [`Reference`](#reference) with the variadic arguments.

------

#####`.reference_apply(args : any[])` -> [`Reference`](#reference)

Like [`.reference`](#referenceargs--any---reference), but instead of a variadic function this takes an array of arguments.

------

#####`.require : `[`IRequireFunction`](#irequirefunction)

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
    require(['path', 'assert'], function(path, assert) {
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

#####`IRequireFunction`

```typescript
interface IRequireFunction {
    ( path : string ) : Promise<any>;
    ( id : any, cb? : ( deps : any ) => any, errcb? : ( err : any ) => any ) : any | Promise<any>
    ( id : string[], cb? : ( ...deps : any[] ) => any, ecb? : ( err : any ) => any ) : any | Promise<any[]>;
    ( id : string, cb? : ( deps : any ) => any, ecb? : ( err : any ) => any ) : any | Promise<any>;

    toUrl( path : string ) : string;
    specified( id : string ) : boolean;
    defined( id : string ) : boolean;
    undef( id : string ) : void;
    onError( err : any ) : void;
    resolve( id : string ) : string;

    define : IDefineFunction;
}
```

#####`.require.toUrl( path : string )` -> `string`
Uses url.resolve to resolve `path` relative to this script's `baseUrl`

#####`.require.specified( id : string )` -> `boolean`
Returns true if the module `id` has been defined via the `define` function.

#####`.require.defined( id : string )` -> `boolean`
Returns true if the module `id` defined via the `define` function has been evaluated and possibly resolved as a dependency to some other function.

Example:
```javascript
//somescript.js
define('myModule', function(){
    return "Hello, World!";
});

define(function(require){
    console.log(require.specified('myModule'); //true
    console.log(require.defined('myModule'); //false

    require('myModule', function(myModule) {
        console.log(myModule); //Hello, World!
        console.log(require.defined('myModule'); //true
    });
});
```

#####`.require.undef( id : string )`
Removes the module `id` from a script. Any attempt to `require` it or include it as a dependency after it has been undefined will result in an error.

#####`.require.onError( err : any )`
The default error handler for `require` and dependency resolving functions.

#####`.require.resolve( id : string )` -> `string`
This will attempt to find the absolute location of a file path given as `id` relative to the script's `baseUrl`. Very much like the normal `module.require.resolve`, and can throw errors like it.

------

#####`.define : `[`IDefineFunction`](#idefinefunction)

`define` is full-fledged implementation of the AMD `define` function. It's used to define modules and export values, either directly or using a factory function that is run whenever the script is evaluated.

It supports AMD-ish plugins, relative file dependencies, and for the asynchronous build full support for asynchronous dependency resolution and asynchronous plugins.

Additionally in the asynchronous build, the factory function can be a coroutine, passed to [tj/co] internally for evaluation. This allows for some simpler control flow in some cases.

Even more, it is fully integrated into Scriptor, with built-in plugins for script imports (using the `import` plugin) and promisification via bluebird's `Promise.promisify` and `Promise.promisifyAll` using the `promisify` plugin, automatically cloning objects so modules like `fs` aren't cluttered with `*Async` functions elsewhere in your programs.

For example, using the asynchronous build:
```javascript
//someScript.js
define(['promisify!fs'], function*(fs, require) {
    var config = yield fs.readFileAsync('config.json', 'utf-8');
    config = JSON.parse(config);

    return function() {
        return config;
    };
});
```

Or even better, taking advantage of the `include` plugin:
```javascript
//someScript.js
define(['include!config.json'], function(configScript) {
    return function() {
        return configScript.exports();
    };
});
```

Now when `someScript.js` is run multiple times, any changes in `config.json` will show up since the script created by the `import` plugin will be watching `config.json` for changes and will reload it automatically.

#####`IDefineFunction`
```typescript
interface IDefineFunction {
    ( id : string, deps : string[], factory : ( ...deps : any[] ) => any ) : void;
    ( id : string, deps : string[], factory : {[key : string] : any} ) : void;
    ( deps : string[], factory : ( ...deps : any[] ) => any ) : void;
    ( deps : string[], factory : {[key : string] : any} ) : void;
    ( factory : ( ...deps : any[] ) => any ) : void;
    ( factory : {[key : string] : any} ) : void;

    amd: {
        jQuery: boolean; //false
    };

    require : IRequireFunction;
}
```

#####`.define.amd` -> `{jQuery: false}`

This is a helper value for anything that might use it. Some common requirejs plugins or other stuff sometimes check this value to determine if jQuery is present. In Scriptor, it is not, so this is always false.

#####`.define.require : `[`IRequireFunction`](#irequirefunction)

Simply a reference to [`.require`](#require-irequirefunction).

------

#####`.include(filename : string, load? : boolean)` -> `Script`

If the script is managed by a [`Manager`](#manager) instance, this will use the manager to get a Script instance with `filename` as the file. By default, `load` is false, and the script will not be forcefully evaluated, but if `load` is true, a call to [`.reload`](#reload---boolean) will trigger evaluation before the Script is returned.

If the script is NOT managed, this will throw an error.

-----

#####`.unload()` -> `boolean`

This will clear defined modules, unload the script and mark it as not evaluated. Additionally, it will emit an `unload` event that script instances can listen on to act as a sort of destructor.

This is not a recursive or propagating event, and will not invalidate any [`Reference`](#reference).

Return true if the script was unloaded, or false if it was already unloaded (or never loaded in the first place).

-----

#####`.reload()` -> `boolean`

This will trigger reevaluation of scripts, sometimes synchronously. However, it cannot force asynchronous processes to evaluate synchronously, so this function may return before the script is actually done evaluating.

This function is not recommended for normal usage. It is included as an occasional convenience.

Returns true if the script was already loaded before `.reload` was called.

-----

#####`.watch(persistent? : boolean)` -> `boolean`

This will watch the script file for changes and rename events, using the standard `fs.watch` function. If changed, it will unload the script and propagate the change event. If renamed, it will automatically take care of filename changes and propagate those if necessary.

If `persistent` is true, the file watcher may keep the process open so long as the file is being watch. `persistent` defaults to false.

Returns false if the file was already being watched, or true if it now being watched.

-----

#####`.unwatch()` -> `boolean`

If the script file was being watched, this will close the watcher and stop watching the file for changes.

Returns true if the file watcher was closed, or returns false if it was not closed.

-----

#####`.propagateEvents(enable? : boolean)` -> `boolean`

Sometimes it is useful to have events like `change` to bubble up script inclusions and requires to their parent scripts. Enabling event propagation will do this.

When enabled, event propagation will trigger `change` events and unload their parent scripts when they themselves change. If a script included by a script included by a script included by a script (etc) changes, the change will bubble up to the highest script and the entire chain will be reevaluated when needed next.

This effect can be disabled, even in the middle of propagating.

Returns true if events were already being propagated, false otherwise.

-----

#####`.close(permanent? : boolean)`

This will unload and unwatch the script.

If `permanent` is true, it will also irrevocably delete the underlying `IModule` instance and removed it from the `parent.children[]` array. Once permanently closed, the Script is useless and cannot be used again no matter what.

`permanent` defaults to false.

-----

#####`.baseUrl` -> `string`

The directory the script file is in. Equal to `path.dirname(this.filename)`.

So if `this.filename` was `"D:/code/my_script.js"`, `this.baseUrl` would be `"D:/code/"`.

-----

#####`.imports` <-> `{[key : string] : any}`

`imports` is a property that can be assigned to at will by the user, and is meant for the script to access when evaluated. It will be injected into the script's `module` as `module.imports` and it can be require-able via the AMD `require` provided, as well.

Example:
```javascript
//index.js
var Scriptor = require( 'scriptor' );
Scriptor.installCustomExtensions();

var script = new Scriptor.Script( 'something.js' );

script.imports = {
    message: 'Hello, World!'
};

script.call();
```

```javascript
//something.js
define( ['imports'], function(imports) {
    console.log( imports.message ); //Hello, World!
} );
```

See [Example #3](https://github.com/novacrazy/scriptor/tree/master/examples/example%203) for the source files

It's just a simple way of sending 'compile-time' or 'evaluation-time' values to a script.

-----

#####`.id` <-> `string`

The script id is usually just the basename of the file given to it, but it can be assigned anything and is rarely used by Scriptor.

-----

#####`.children` -> `IModule[]`

A Scriptor Script still contains a valid `IModule` instance internally, and it might be assigned children when requiring modules. This is a quick access to that array of children modules.

-----

#####`.parent` -> `IModule`

A Scriptor Script still contains a valid `IModule` instance internally, and it will have a parent module. This is a quick access to that module.

-----

#####`.loaded` -> `boolean`

Equal to true if the script has been loaded and has finished evaluating.

-----

#####`.pending` -> `boolean`

If the script is being loaded asynchronously, then this is true if the loading and evaluation has been initiated, but hasn't actually finished.

-----

#####`.watched` -> `boolean`

True if the script file is being watched for file changes.

-----

#####`.filename` -> `string`

The filename of the current script file loaded. If no script file has been loaded, this is null.

-----

#####`.maxRecursion` <-> `number`

Scriptor Scripts contain a built-in recursion protection system that will throw an error if it goes too deep. To set or get the limit, use this variable.

`Infinity` is considered a valid number for this. Defaults to 9.

-----

#####`.manager` -> `Manager`

If the script is managed by a [`Manager`](#manager) instance, this will be a reference to that manager. If it is not managed, this will be null or undefined.

-----

#####`.isManaged()` -> `boolean`

Returns true if this Script instance is managed by a [`Manager`](#manager).

-----

##`SourceScript`

Instead of loading from a file, a `SourceScript` will accept a string, in which it will compile into a valid script instance that can be run and worked with just like a normal `Script` can.

#####`new Script(src? : string|Reference, parent? : Module)` -> `SourceScript`

Returns a new `SourceScript` instance, optionally initializing it with a `src` of some sort or a parent module.

For a source, SourceScript's can use either a raw string, or a [`Reference`](#reference) instance which should resolve to a string, allowing for the use of the Reference transform system and whatever else to create source code.

-----

#####`.load(src? : string|Reference, watch? : boolean)` -> `SourceScript`

As stated above, a SourceScript can get the source code from either a raw string or a [`Reference`](#reference) instance.

If a `Reference` instance is given, it can also watch that `Reference` for changes in a similar fashion to how a normal Script would watch a file. Whenever the `Reference` is invalidated, so is the SourceScript and it will reevaluate it next time whenever needed.

-----

#####`.source()` -> `string|Promise<string>`

Will process the source and return a string of code or a Promise to the string of code, depending on which Scriptor build is used.

-----

##Script Environment

In addition to managing the loading and evaluation of scripts, Scriptor will also add some custom properties and functions to the global-ish `module` variable inside scripts.

#####`module.define : `[`IDefineFunction`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#idefinefunction)

This is the exact same function as [`define`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#define-idefinefunction), but made available to the script.

If custom extensions are enabled and installed, `define` is made global to the running script so it can use it directly.

For example, without custom extensions:
```javascript
module.define({
    result: 42
});
```

With custom extensions:
```javascript
define({
    result: 42
});
```

They are the exact same.

-----

#####`module.include(filename : string, load? : boolean)` -> `Script`

This is the exact same function as [`include`](#includefilename--string-load--boolean---script), but made available to the script.

However, if AMD style modules are preferred, it is recommended to use the [`include!`]() plugin instead of `module.include`.

`load` defaults to false.

-----

#####`module.on('unload', Function)`

`module.on`, `module.addListener` and `module.once` are all available and are only available for the event `unload`, which is emitted when the module is unloaded.

Since JavaScript doesn't include any sort of destructor, this allows modules to clean up after themselves when needed. Like closing a server, database connection or anything else.

For example:
```javascript
//server.js
define(['./app.js', 'http'], function(app, http) {
    var server = http.createServer(app()).listen(8080);

    module.on('unload', function() {
        server.close();
    });
});
```

So that way if the script needs to be reloaded and reevaluated, it won't get an error saying the port is in use, since the previous server was closed.

Trying to listen for any other event will throw an error.

-----

#####Note about custom extensions and AMD injection

As already shown, when using Scriptor with the custom extensions installed, it is able to inject the `define` function directly into 'global' namespace, allowing for very convenient AMD scripts.

-----

##`Reference`

#####About References
A Reference, in Scriptor terms, is a single evaluation of a Script with a particular set of arguments, which will automatically re-run the Script when it changes, with the previous set of arguments, without having to explicitly do so. Otherwise, if the Script never changes, the previous result from running the script the previous time is kept and reused.

Additionally, References come with an extensive transformation system that propagates change events and lazily runs and reruns scripts and transform functions when needed.

#####`ITransformFunction`

An integral part in the use of References is a transform function. It takes an input (or two), and returns a single output.

The interface definition of the Transform function in Scriptor Reference is as follows:
```typescript
interface ITransformFunction {
    ( left : Reference, right : Reference ) : any | Promise<any>;
}
```

The reason it passes left and/or right References directly into the transform function instead of their values it because the transform function may choose to completely ignore one or both References. It's up to the user.

Additionally, the transform function can be a coroutine in the asynchronous build, in the form of a generator function. More on that in the [`.transform`](#transformtransform--itransformfunction---reference) and [`.join`](#joinref--reference-transform--itransformfunction---reference) sections.

Scriptor includes a simple identity function as well, as detailed in the [`Scriptor.identity`](#scriptoridentityleft--reference-right--reference---any--promiseany) section. It only returns the value of the left Reference, ignore the right one if one even exists.

-----

#####`new Reference(script : Script, args : any[])` -> `Reference`

**NOTE**: It is not recommended to do this manually. It is better to use [`Script.reference`](#referenceargs--any---reference) instead of creating a new Reference manually.

This creates a new Reference instance with the specified script and arguments to be bound to. Once created, the arguments cannot be changed, nor can the referenced script.

-----

#####`.value()` -> `any | Promise<any>`

If the Reference has not been evaluated, this will evaluate it, calling any transforms or joins or anything down the line, and will return the resulting value or, in the case of the asynchronous build, return a Promise that resolves to the resulting value.

If the Reference has already been evaluated, the previous result was stored automatically and another call to `.value()` will simply retrieve the previous value, without having to re-run the scripts and transforms and stuff.

-----

#####`.close(recursive? : boolean)`

This will delete the stored arguments and cached results, and make the Reference unusable. It will also stop any event propagation from the Reference that could potentially invalidate other References.

If `recursive` is true, it will also close any References that the current Reference is using. For example, if given a long chain of transforms and joins, closing the top most one recursively will also close all the other created References.

`recursive` defaults to false.

-----

#####`.left()` -> `Reference`

If the Reference was created by a `transform`, `join` or `join_all` call, it will have a `left` child Reference which it listens on for changes to potentially invalidate itself.

If the Reference was not created by a `transform`, `join` or `join_all` call, it will not have a `left` child, and `.left()` will return null.

-----

#####`.right()` -> `Reference`

If the reference was created by a `join` or `join_all` call, it will have a `right` child Reference which it listens on for changes to potentially invalidate itself.

If the Reference was not created by a `join` or `join_all` call, it will not have a `right` child, and `.right()` will return null.

-----

#####`.transform(transform? : ITransformFunction)` -> `Reference`

This created a new Reference that will apply a transformation function to the value of the current Reference before returning it.

Simple example:
```javascript
var Scriptor = require( 'scriptor/sync' );
var Reference = Scriptor.Reference;

var ref = Reference.resolve( 32 );

ref = ref.transform( function(left) {
    return left.value() + 10;
} );

console.log( ref.value() ); //42
```

See [Example 4](https://github.com/novacrazy/scriptor/tree/master/examples/example%204) for full source code.

Or, for the synchronous build, ES6 coroutines can be used inside transform function to make operations more clear.

For example:
```javascript
var Scriptor = require( 'scriptor/async' );
var Reference = Scriptor.Reference;

var ref = Reference.resolve( 'World!' );

ref = ref.transform( function*(left) {
    return 'Hello, ' + (yield left.value());
} );

ref.value().then( console.log ); //Hello, World!
```

See [Example 5](https://github.com/novacrazy/scriptor/tree/master/examples/example%205) for full source code.

-----

#####`.join(ref : Reference, transform? : ITransformFunction)` -> `Reference`

Almost identical to `.transform`, `.join` allows two separate Reference to be joined together via a transform function.

For example, a variation on [Example 5](https://github.com/novacrazy/scriptor/tree/master/examples/example%205):
```javascript
var Scriptor = require( 'scriptor/async' );
var Reference = Scriptor.Reference;

var a = Reference.resolve( 'Hello, ' );
var b = Reference.resolve( 'World!' );

var ref = a.join( b, function*(left, right) {
    return (yield left.value()) + (yield right.value());
} );

ref.value().then( console.log ); //Hello, World!
```

See [Example 6](https://github.com/novacrazy/scriptor/tree/master/examples/example%206) for full source code.

It should be noted that extensive use of `.join` and `.transform` will eventually create an implicit linked list and/or binary tree -ish structure, and that should be taken into consideration when using many transforms.

For convenience, Scriptor includes a helper function to create a real-ish balanced tree structure out of an array of References and a single transform function. For more details on that, see [`Reference.join_all`](#referencejoin_allrefs--reference-transform--itransformfunction---reference).

-----

#####`.ran` -> `boolean`

True if the Reference has already been evaluated, false otherwise.

-----

#####`.closed` -> `boolean`

True if the Reference has been closed, false otherwise.

-----

#####Static Reference Functions

#####`Reference.resolve(value : any)` -> [`Reference`](#reference)

This is a helper function that creates a Reference that will always evaluate to `value` when `.value()` is called.

It is similar to bluebird's `Promise.resolve` function, just with Scriptor References.

-----

#####`Reference.join(left : Reference, right : Reference, transform : ITransformFunction)` -> [`Reference`](#reference)

Exactly the same as `left.join(right, transform)`, but made static.

-----

#####`Reference.join_all(refs : Reference[], transform : ITransformFunction)` -> [`Reference`](#reference)

This will recursively join together References with the specified transform function from the first and last elements to the middle ones, creating a balanced tree-like implicit structure of joined References.

For example:
```javascript
var Scriptor = require( 'scriptor/sync' );
var Reference = Scriptor.Reference;

var refs = [];

for( var i = 0; i < 10; i++ ) {
    refs.push( Reference.resolve( i ) );
}

var root = Reference.join_all( refs, function(left, right) {
    return left.value() + ', ' + right.value();
} );

console.log( root.value() ); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9
```

See [Example 7](https://github.com/novacrazy/scriptor/tree/master/examples/example%207) for full source code.

Here is a small printout of the actual 'tree' like structure of the above code:
```
root
├─ value: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
├─ left
│  ├─ value: 0, 1, 2, 3, 4
│  ├─ left
│  │  ├─ value: 0, 1
│  │  ├─ left
│  │  │  ├─ value: 0
│  │  └─ right
│  │     ├─ value: 1
│  └─ right
│     ├─ value: 2, 3, 4
│     ├─ left
│     │  ├─ value: 2
│     └─ right
│        ├─ value: 3, 4
│        ├─ left
│        │  ├─ value: 3
│        └─ right
│           ├─ value: 4
└─ right
   ├─ value: 5, 6, 7, 8, 9
   ├─ left
   │  ├─ value: 5, 6
   │  ├─ left
   │  │  ├─ value: 5
   │  └─ right
   │     ├─ value: 6
   └─ right
      ├─ value: 7, 8, 9
      ├─ left
      │  ├─ value: 7
      └─ right
         ├─ value: 8, 9
         ├─ left
         │  ├─ value: 8
         └─ right
            ├─ value: 9
```

-----

#####`Reference.transform(ref : Reference, transform : ITransformFunction)` -> [`Reference`](#reference)

Exactly the same as `ref.transform(transform)`, but made static.

-----

##Manager

#####About Managers

Managers offer an easy way to both manage many scripts and allows scripts to interact with each other via 'includes' and so forth, as well as set the current working directory for all added scripts to be resolved from.

Internally, managers create a single 'fake' module to act as the parent to all managed scripts, so as to not clutter real modules with many children.

#####`new Manager(grandParent? : IModule)` -> `Manager`

This creates a new Manager instance with the specified grandparent module, which will serve as the parent to the new module created internally.

-----

#####`.add(filename : string, watch? : boolean)` -> `Script`

This adds a script to the manager and optionally watches it for changes, then returns the new script instance.

If the script was already added to the manager, it will return the previously created script. Duplicates are avoided as much as possible.

`watch` defaults to true.

-----

#####`.get(filename : string)` -> `Script`

Retrieves the associated Script instance given for `filename`.

Returns null or undefined if the Script instance does not exist. `.get` does not create a new Script instance.

-----

#####`.remove(filename: string, close?: boolean)` -> `boolean`

Removes a script from the manager, optionally closing it via [`Script.close`](#closepermanent--boolean).

Returns true if the Script was removed, or false if it wasn't or was never there to begin with.

`close` defaults to true.

-----

#####`.call(filename : string, ...args : any[])` -> `any | Promise<any>`

Equivalent to `.add(filename, false).call(...args)`

It will add the script to the manager if it doesn't already exist, call it, then return the result.

-----

#####`.apply(filename : string, args : any[])` -> `any | Promise<any>`

Equivalent to `.add(filename, false).apply(args)`

It will add the script to the manager if it doesn't already exist, call it, then return the result.

-----

#####`.cwd()` -> `String`

Returns the Manager's current working directory, to which all script filenames resolve relative to.

This default to `process.cwd()` upon the instantiation of a new Manager.

-----

#####`.chdir(dir : string)` -> `String`

Changes the Manager's current working directory relative to the previous one, and returns the new one.

-----

#####`.reference(filename : string, ...args : any[])` -> [`Reference`](#reference)

Equivalent to `.add(filename, false).reference(...args)`

It will add the script to the manager if it doesn't already exist, then creates a new Reference with the arguments provided.

-----

#####`.reference_apply(filename : string, args : any[])` -> [`Reference`](#reference)

Equivalent to `.add(filename, false).reference_apply(args)`

It will add the script to the manager if it doesn't already exist, then creates a new Reference with the arguments provided.

-----

#####`.clear(close? : boolean)`

Removes all scripts from the Manager, making it a clean slate to add more. If `close` is true, it will also close them via [`Script.close`](#closepermanent--boolean)

`close` defaults to true.

-----

#####`.propagateEvents(enable? : boolean)`

Will enable or disable event propagation in any current and future scripts managed by the Manager instance.

`enable` defaults to true.

-----

#####`.parent` -> `IModule`

A reference to the created module that serves as the parent for every script managed by the Manager instance.

-----

#####`.scripts` -> `Map<Script>`

Reference to the internal Map instance in which the Script instances of held, with their filenames serving as their lookup keys.
