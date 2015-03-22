Scriptor Internals
==================

Internally, Scriptor is not as simple as the standard API would have one believe. To simplify things, Scriptor takes advantage of TypeScript's inheritance to simplify tasks and modularity.

##Table of contents
- [Script inheritance](#script-inheritance)
    - [EventPropagator](#eventpropagator) extends EventEmitter
    - [ScriptBase](#scriptbase) extends [EventPropagator](#eventpropagator)
    - [AMDScript](#amdscript) extends [ScriptBase](#scriptbase)
    - [Script](#script) extends [AMDScript](#amdscript)
    - [ScriptAdapter](#scriptadapter) extends [Script](#script)

- [`Common` module](#common-module)
    - [`isAbsolutePath(filepath : string)`](#isabsolutepathfilepath--string---boolean)
    - [`isAbsoluteOrRelative(filepath : string)`](#isabsoluteorrelativefilepath--string---boolean)
    - [`bind(func : Function, ...args : any[])`](#bindfunc--function-args--any---function)
    - [`parseDefine(id : any, deps? : any, factory? : any)`](#parsedefineid--any-deps--any-factory--any---id-deps-factory)
    - [`normalizeError(id : any, type : string, err : any)`](#normalizeerrorid--any-type--string-err--any---error)
    - [`removeFromParent(script : IModule)`](#removefromparentscript--imodule)
    - [`stripBOM(content : string)`](#stripbomcontent--string---string)
    - [`injectAMD(content : string)`](#injectamdcontent--string---string)
    - [`injectAMDAndStripBOM(content : string)`](#injectamdandstripbomcontent--string---string)
    - [`shallowCloneObject(obj : any)`](#shallowcloneobjectobj--any---object)
    - [`AMD_Header`](#amd_header---string)
    - [`default_max_recursion`](#default_max_recursion---number)
    - [`default_dependencies`](#default_dependencies---string)

##Script Inheritance

So to separate out concerns for script components, Scriptor uses multiple layers of inheritance for implementing some things. I, the author, know that isn't necessarily a good pattern to go by, especially in statically typed and compiled languages like C++, but it works just fine for JavaScript/TypeScript where there is no runtime cost for doing so.

#####`EventPropagator`

Located in `base.js`, this is a simple class that takes care of event propagation.

#####`ScriptBase`

This is the base class for actual scripts. It takes care of the internal `IModule` instance and handles basic functionality like filenames, parent and children management, various flags and also a few helper functions for execution protection, including recursion protection.

-----

#####`AMDScript`

This is the class that handles the `define` and `require` function primarily. It contains various values and functions to facilitate those.

-----

#####`Script`

Actual implementation of file loading, compilation, evaluation and watching. Most of it.

See [`Scriptor.Script`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#script) for full documentation of everything in this class.

-----

#####`ScriptAdapter`

The ScriptAdapter class is a tiny extension of the normal Script that is used with Managers. Managers never actually use or return normal Scripts, they use ScriptAdapters, since the ScriptAdapter is extended to handle `include` and other managed-script specific stuff.

-----

##`Common` module

To reduce duplicate code, a lot of simple functions that work in both the synchronous and asynchronous builds are placed in the `Common` module.

This `Common` module is exported to Scriptor as `Scriptor.common`, note the capitalization difference.

-----

#####`isAbsolutePath(filepath : string)` -> `boolean`

Returns true if the path given is absolute.

In Node 0.11 and above, this uses `path.isAbsolute`, but for older versions it uses `path.resolve(filepath) === path.normalize(filepath)`, which is a cheap hack that works most of the time.

-----

#####`isAbsoluteOrRelative(filepath : string)` -> `boolean`

Just checks if the filepath is relative or absolute

```javascript
function isAbsoluteOrRelative( filepath : string ) : boolean {
    return filepath.charAt( 0 ) === '.' || isAbsolutePath( filepath );
}
```

-----

#####`bind(func : Function, ...args : any[])` -> `Function`

Binds a function to the arguments provided, including `this` as the first argument provided.

It then copies references to any attached properties to the newly bound function.

This is how `define` and `require` can have additional functions attached to them.

-----

#####`parseDefine(id : any, deps? : any, factory? : any)` -> `[id, deps, factory]`

Parses the raw `define` arguments, which are sort of variadic and out of order, and returns a tuple with the parsed arguments in them, or null for those that don't exist.

For example `define('myModule', {})` will result in the parsed arguments `['myModule', null, {}]`

This code is mostly taken from [amdefine](https://github.com/jrburke/amdefine/blob/ebcc612e924ab08e3e993238cbb42251b17d27a2/amdefine.js#L248)

-----

#####`normalizeError(id : any, type : string, err : any)` -> `Error`

Takes an error object and normalizes it according to how requirejs does it, with the `requireModules` and `requireType` values added to it.

This is used with `require` for error normalization.

-----

#####`removeFromParent(script : IModule)`

Takes a script and searches its parent for itself, then removes itself from the parent.

Used in [`Script.close(true)`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#closepermanent--boolean)

-----

#####`stripBOM(content : string)` -> `string`

If the string starts with `0xFEFF`, a Byte Order Marker, that character is removed from the string.

-----

#####`injectAMD(content : string)` -> `string`

Prepends [`AMD_Header`](#amd_header---string) to `content` and returns it.

-----

#####`injectAMDAndStripBOM(content : string)` -> `string`

[Removes BOM](#stripbomcontent--string---string) and [Injects AMD Header](#injectamdcontent--string---string) in one function.

-----

#####`shallowCloneObject(obj : any)` -> `Object`

Shallow clones an object. Used in the `promisify!` plugin to prevent polluting global state.

-----

#####`AMD_Header` -> `string`

```javascript
if(typeof define !== 'function' && typeof module.define === 'function') {
    var define = module.define;
}
```

-----

#####`default_max_recursion` -> `number`

Defaults to 9

-----

#####`default_dependencies` -> `string[]`

Defaults to `['require', 'exports', 'module', 'imports']`
