Scriptor Asynchronous Module Definitions
========================================

One of the original motivations for Scriptor 2.x was to create a script environment where the code is completely compatible with requirejs and AMD, so as to use some of the same exact code between servers and clients.

To do this, Scriptor provides a rudimentary but complete AMD implementation built right into every Script.

As show in the [API Documentation](https://github.com/novacrazy/scriptor/blob/master/docs/api.md), Script instances have a [`define`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#define-idefinefunction) and [`require`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#require-irequirefunction) functions that can be used to define modules and require dependencies. They work together as well to evaluate defined modules and resolve module dependencies, too.

Additionally, `define` is injected into the global `module` variable. However, that isn't exactly useful by itself, so by using custom extension handlers Scriptor can move that value into the 'global' namespace for each module. It does this by injecting this bit of code into the beginning of each script:
```javascript
if(typeof define !== 'function' && typeof module.define === 'function') {
    var define = module.define;
}
```

Which is similar to amdefine's header, but uses `module.define` instead.

This allows scripts to use AMD style declarations natively, like so:
```javascript
define(['fs'], function(fs, require) {
    var file = fs.readFileSync('something.txt', 'utf-8');

    require('assert', function(assert) {
        assert(true);
    });
});
```

Notice how the `require` passed into the factory function calls a callback instead of just returning the value. That's because (at least if the async build is being used), there is a distinct possibility that requiring a module could be asynchronous, and that callback should be executed whenever it's finally loaded.

Additionally, for the async build of scriptor, `require` returns a Promise in addition to the callback interface. This is useful for coroutines, which is discussed further down.

It should be noted that Scriptor's `require` is ONLY the one passed into the factory function, and NOT the global `require`. The global `require` is still Node's standard CommonJS require and is still synchronous. It's recommended to avoid external requires and just use the AMD form for dependencies.

Although requirejs doesn't support it, Scriptor's async build supports coroutines almost everywhere. For example:
```javascript
define(['promisify!fs'], function*(fs, require) {
    var file = yield fs.readFileAsync('something.txt', 'utf-8');
    var assert = yield require('assert');

    assert(true);
});
```

Using coroutines makes asynchronous code look much better while retaining much of the same performance as normal asynchronous code.

Internally, Scriptor uses Bluebird coroutines for asynchronous coroutine handling, so all the things that can be yielded for that can also be yielded in Scriptor factories, transform functions and even `main` functions returned from the factory. It's all automatic.

Scriptor's AMD implementation supports named submodules withing modules, any amount of dependencies, integration with Scriptor and Scriptor Managers, synchronous and asynchronous dependency resolution and plugins, and really anything requirejs does. However, if there is a feature missing or that you'd like to request, please post an issue about it and it will be reviewed and added post-haste.

Speaking of plugins, Scriptor comes with a few built-in plugins. For the synchronous and asynchronous builds, there is the 'include!' plugin, which uses the [`.include`](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#includefilename--string-load--boolean---script) function to include Script instances directly.

For just the asynchronous build, there is also the 'promisify!' plugin, which duplicates the dependency object and passes it through [bluebird's promisifyAll or promisify functions](https://github.com/petkaantonov/bluebird/blob/master/API.md#promisification)

