#Scriptor API Documentation
**Note**: This documentation is for Scriptor 2.x and not valid for 1.x

##Foreword about sync and async builds
Instead of having a couple thousand lines of documentation for each build of Scriptor, documentation has been combined and will point out the differences between methods for Synchronous and Asynchronous builds. However, the differences are usually quite simple, and commonly boils down to:
> The async build returns promises for any function that might wait on a result, like `.exports()`, `.call()`, `.apply()`, `.value()`, and so forth.


##Table of contents
- [Static]()
    - [`Scriptor.load(filename : string, watch? : boolean)`]()
    - [`Scriptor.compile(src : string | Reference, watch? : boolean)`]()
    - [`Scriptor.enableCustomExtensions(enable? : boolean)`]()
    - [`Scriptor.disableCustomExtensions()`]()
    - [`Scriptor.extensions`]()

- [`Script`]()
    - [`new Script(filename? : string, parent? : Module)`]()
    - [`.load(filename : string, watch? : boolean)`]()
    - [`.exports()`]()
    - [`.call(...args : any[])`]()
    - [`.apply(args : any[])`]()
    - [`.reference(...args : any[])`]()
    - [`.reference_apply(args : any[])`]()
    - [`.require(path : string | string[], cb? : (...results) => any, errcb? : (err : any) => any)`]()
        - [`.require.toUrl(path : string)`]()
        - [`.require.specified(id : string)`]()
        - [`.require.defined(id : string)`]()
        - [`.require.undef(id : string)`]()
        - [`.require.onError`]()
    - [`.define(id? : string, deps? : string[], factory : Function)`]()
        - [`.define.require`]()
    - [`.unload()`]()
    - [`.reload()`]()
    - [`.watch(persistent? : boolean)`]()
    - [`.unwatch()`]()
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
    - Special functions when used with a Manager:
        - [`.include(filename : string, load? : boolean)`]()

- [`SourceScript`](#sourcescript)
    - [`new Script(src? : string|Reference, parent? : Module)`]()
    - [`.load(src? : string|Reference, watch? : boolean)`]()
    - [`.source`]()

- [Script Environment]()
    - [`module.define(id? : string, deps? : string[], factory : Function)`]()
    - [`module.include(filename : string, load? : boolean)`]()
    - [`module.on('unload', Function)`]()
    - [Note about custom extensions and AMD injection]()

- [References]()
