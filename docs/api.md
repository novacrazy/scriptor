#Scriptor API Documentation
**Note**: This documentation is for Scriptor 2.x and not valid for 1.x

##Foreword about the sync and async builds
Instead of having a couple thousand lines of documentation for each build of Scriptor, documentation has been combined and will point out the differences between methods for Synchronous and Asynchronous builds. However, the differences are usually quite simple, and commonly boils down to:
> The async build returns Promises for any function that might wait on a result, like `.exports()`, `.call()`, `.apply()`, `.value()`, and so forth. Anything in the async build that would return a Promise, does not in the sync build; it returns the value directly and synchronously.

###Limitations of the synchronous build
The synchronous build does not have features like coroutines and asynchronous plugins available. The synchronous build also comes with custom extensions, but they read the files synchronously and are just used to conveniently inject the AMD functions.

###Limitations of the asynchronous build
Keep in mind there are some things that cannot be made asynchronous without forking Node.js (or io.js) and making modifications to the core module system, so things like modules without a relative or absolute filepath and internal modules will resolve and be compiled synchronously using the built-in `require`, which cannot be made asynchronous.

Using custom extension handlers (of which `.js` and `.json` are included), Scriptor can load the script files asynchronously, but even then script compilation into executable code is **always** synchronous. However, its all done lazily in both builds to avert any unneeded hiccups wherever possible.

##Table of contents
- [Static]()
    - [`Scriptor.load(filename : string, watch? : boolean)`]()
    - [`Scriptor.compile(src : string | Reference, watch? : boolean)`]()
    - [`Scriptor.enableCustomExtensions(enable? : boolean)`]()
    - [`Scriptor.disableCustomExtensions()`]()
    - [`Scriptor.extensions`]()
    - [`Scriptor.identity(left : IReference, right : IReference)`]()

- [`Script`]()
    - [`new Script(filename? : string, parent? : Module)`]()
    - [`.load(filename : string, watch? : boolean)`]()
    - [`.exports()`]()
    - [`.call(...args : any[])`]()
    - [`.apply(args : any[])`]()
    - [`.reference(...args : any[])`]()
    - [`.reference_apply(args : any[])`]()
    - [`.require(path : string | string[], cb? : (...results : any[]) => any, errcb? : (err : any) => any)`]()
        - [`.require.toUrl(path : string)`]()
        - [`.require.specified(id : string)`]()
        - [`.require.defined(id : string)`]()
        - [`.require.undef(id : string)`]()
        - [`.require.onError`]()
    - [`.define(id? : string, deps? : string[], factory : Function)`]()
        - [`.define.require`]()
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
    - [`.source`]()

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
