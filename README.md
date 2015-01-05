Scriptor
========

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Codacy Score][codacy-image]][codacy-url]

## Introduction

Scriptor is the ultimate library for dynamically loading, reloading and running scripts without having to restart the process, with built-in support for file watching to automatically reload when necessary.

A script is defined as a file which can be 'required' by Node, be it a `.js`, `.json`, or any other installed extension. Even binary '.node' extensions are supported.

Scriptor does this by exploiting the `module` module's classes and functions that Node uses internally. However, code can only be compiled/evaluated synchronously. So to make the impact of this as little as possible, all compilation and evaluation of scripts is done lazily. That means even if you create a Script instance, it will not load or compile the script until it is actually needed.

Additionally, with the use of the Manager class, Scriptor provides a way of referencing and calling other scripts relative to itself, allowing you to chain together complex tasks easily.

As of [Version 1.3.0](#130), Scriptor References (special objects that house immutable script results), can be transformed in any way possible, with several utilities for doing it the best way.

## Purpose

The original purpose for this system was to create a framework for writing simple scripts that generate web pages. That is still in development, but being able to separate out, reuse and update code without having to restart my server process was key.

Now Scriptor can be used for almost anything requiring the loading and evaluation of code or anything `require`-able.

Using extensions like [`dot-require`](https://github.com/novacrazy/dot-require) and others, Scriptor can load and evaluate a script, then using the `once` functions and `References` create huge and complex transformation chains and trees to manipulate data in any way you can imagine, and still have it all done lazily.

## Documentation

All documentation for this project is in TypeScript syntax for typed parameters.

- [Static](#static)
    - [`Scriptor.load(filename : string, watch? : boolean)`](#scriptorloadfilename--string-watch--boolean---script)
    - [`Scriptor.compile(src : string|Reference, watch? : boolean)`](#scriptorcompilesrc--stringreference-watch--boolean---sourcescript)

- [`Script`](#script)
    - [`new Script(filename? : string, parent? : Module)`](#new-scriptfilename--string-parent--module---script)
    - [`.load(filename : string, watch? : boolean)`](#loadfilename--string-watch--boolean---script)
    - [`.call(...args : any[])`](#callargs--any---any)
    - [`.apply(args : any[])`](#applyargs--any---any)
    - [`.call_once(...args : any[])`](#call_onceargs--any---reference)
    - [`.apply_once(args : any[])`](#apply_onceargs--any---reference)
    - [`.require(path : string)`](#requirepath--string---any)
    - [`.unload()`](#unload---boolean)
    - [`.reload()`](#reload---boolean)
    - [`.watch()`](#watch---boolean)
    - [`.unwatch()`](#unwatch---boolean)
    - [`.close(permanent? : boolean)`](#closepermanent--boolean)
    - [`.imports`](#imports---any)
    - [`.exports`](#exports---any)
    - [`.id`](#id---string)
    - [`.children`](#children---module)
    - [`.parent`](#parent---module)
    - [`.loaded`](#loaded---boolean)
    - [`.watched`](#watched---boolean)
    - [`.filename`](#filename---string)
    - [`.maxRecursion`](#maxrecursion---number)
    - Special functions when used with a Manager:
        - [`.reference(filename : string, ...args : any[])`](#referencefilename--string-args--any---any)
        - [`.reference_apply(filename : string, args : any[])`](#reference_applyfilename--string-args--any---any)
        - [`.reference_once(filename : string, ...args : any[])`](#reference_oncefilename--string-args--any---reference)
        - [`.include(filename : string, load? : boolean)`](#includefilename--string-load--boolean---script)

- [`SourceScript`](#sourcescript)
    - [`new Script(src? : string|Reference, parent? : Module)`](#new-scriptsrc--stringreference-parent--module---sourcescript)
    - [`.load(src? : string|Reference, watch? : boolean)`](#loadsrc--stringreference-watch--boolean---sourcescript)
    - [`.source`](#source---string)

- [Script Environment](#script-environment)
    - [`module.define(id? : string, deps? : string[], factory : Function)`](#moduledefineid--string-deps--string-factory--function)
    - [`module.reference(filename : string, ...args : any[])`](#modulereferencefilename--string-args--any---any)
    - [`module.reference_apply(filename : string, args : any[])`](#modulereference_applyfilename--string-args--any---any)
    - [`module.reference_once(filename : string, ...args : any[])`](#modulereference_oncefilename--string-args--any---reference)
    - [`module.include(filename : string, load? : boolean)`](#moduleincludefilename--string-load--boolean---script)
    - [`module.imports`](#moduleimports---any)

- [`ITransformFunction`](#itransformfunction)

- [`Reference`](#reference)
    - [`.value()`](#value---any)
    - [`.ran`](#ran---boolean)
    - [`.transform(transform : ITransformFunction)`](#transformtransform--itransformfunction---reference)
    - [`.join(ref : Reference, transform? : ITransformFunction)`](#joinref--reference-transform--itransformfunction---reference)
    - [`.left()`](#left---reference)
    - [`.right()`](#right---reference)
    - [`.close(recursive? : boolean)`](#closerecursive--boolean)
    - [`.closed`](#closed---boolean)
    - [`Reference.join(left : Reference, right : Reference, transform? : ITransformFunction)`](#referencejoinleft--reference-right--reference-transform--itransformfunction---reference)
    - [`Reference.join_all(refs : Reference[], transform? : ITransformFunction)`](#referencejoin_allrefs--reference-transform--itransformfunction---reference)

- [`Manager`](#manager)
    - [`new Manager(grandParent? : Module)`](#new-managergrandparent--module---manager)
    - [`.add(filename : string, watch? : boolean)`](#addfilename--string-watch--boolean---script)
    - [`.remove(filename : string, close? : boolean)`](#removefilename--string-close--boolean---boolean)
    - [`.call(filename : string, ...args : any[])`](#callfilename--string-args--any---any)
    - [`.apply(filename : string, args : any[])`](#applyfilename--string-args--any---any)
    - [`.call_once(filename : string, ...args : any[])`](#call_oncefilename--string-args--any---reference)
    - [`.once_apply(filename : string, args : any[])`](#once_applyfilename--string-args--any---reference)
    - [`.get(filename : string)`](#getfilename--string---script)
    - [`.clear(close? : boolean)`](#clearclose--boolean)

- [Rational and Behavior](#rational-and-behavior)

- [Changelog](#changelog)

##Static

#####`Scriptor.load(filename : string, watch? : boolean)` -> `Script`

This creates a new Script instance with filename as the script to be loaded.

If `watch` is true, `Scriptor.load` will set up file watching.

`watch` defaults to true.

<hr>

#####`Scriptor.compile(src : string|Reference, watch? : boolean)` -> `SourceScript`

A variation to `Scriptor.load` which takes a string or a Reference that returns a string when `.value()` is called, and returns a [`SourceScript`](#sourcescript).

If `watch` is true, `Scriptor.load` will set up 'file' watching.

Refer to SourceScript documentation for details about how exactly it can watch a static string.

`watch` defaults to true.

<hr>

##Script

A Script is the central part of Scriptor. It represents a single executable script, and manages modules, file changes and cleanup of the script. It also takes care of injecting the extra values into `module` when compiled.

#####`new Script(filename? : string, parent? : Module)` -> `Script`

Creates a new Script instance, optionally loading it with the filename specified, and with the specified parent context. `parent` defaults to the Scriptor module context.

Example:
```javascript
    var Scriptor = require('scriptor');

    var script = new Scriptor.Script('something.js');

    var result = script.call(some, arguments, here);
```

If `filename` is given, the constructor calls `.load` for you with that filename.

<hr>

#####`.load(filename : string, watch? : boolean)` -> `Script`

Since Scriptor emphasizes lazy evaluation, all `.load` really does is mark the script instance as not loaded and tells it to load and evaluate `filename` whenever it is needed. So this operation has no performance hit.

It does set `.id` to the basename of this filename given, but that can be overwritten manually anytime after. See the documentation of [`.id`](#id---string) for more on that.

If `watch` is true, a file watcher is spawned to watch the script for changes. For more information on how Scriptor handles this situation, refer to [`.watch`](#watch).

`watch` defaults to true.

<hr>

#####`.call(...args : any[])` -> `any`

`.call` evaluates the script with any arguments passed to it. What this really does is, if module.exports of the targeted script is a function, calls that function with the arguments given.

It reflects the behavior of `Function.prototype.call` but without the `this` argument.

Though if module.exports is an object or any other type it will simply return that, as it cannot be evaluated any further.

*NOTE for React.js users*: React.js classes are functions, so a factory function is required to return them.

Example:
```javascript
/**** HelloMessage.js ****/
module.define(['react'], function(React) {
    var HelloMessage = React.createClass({displayName: "HelloMessage",
        render: function() {
            return React.createElement("div", null, "Hello ", this.props.name);
        }
    });

    //amdefine sets module.exports to equal the function below
    return function() {
        return HelloMessage;
    }
});

/**** main.js ****/
var React = require('react');

var hello = new Scriptor.Script('HelloMessage.js');

var html = React.renderToStaticMarkup(React.createElement(hello.call(), {name: "John"}));
```

<hr>

#####`.apply(args : any[])` -> `any`

To reflect a `Function`, a Script instance has a `.apply` method that takes an array to be applied to the function, similar to `Function.prototype.apply`, but again without the `this` argument.

Used together, `.call` and `.apply` can generally satisfy any common way of evaluating a script.

<hr>

#####`.call_once(...args : any[])` -> `Reference`

Returns a Reference for this script with the arguments provided.

If this script already has been referenced via a `once` function, this returns the previous Reference.

<hr>

#####`.apply_once(args : any[])` -> `Reference`

Returns a Reference for this script with the arguments provided.

If this script already has been referenced via a `once` function, this returns the previous Reference.

<hr>

#####`.require(path : string)` -> `any`

This is an alias to the native `require` function used within the script.

<hr>

#####`.unload()` -> `boolean`

Marks the script as not loaded and returns true if it was loaded before `.unload` was called, false otherwise.

This does not delete the script, remove the file watcher or anything other than mark it as not loaded. It doesn't even delete the cached module.exports.

Any calls to `.call` or `.apply` after this will re-load and re-evaluate the script.

To permanently close a script and make it unusable so it can be garbage collected, refer to [`.close`](#closepermanent--boolean).

<hr>

#####`.reload()` -> `boolean`

**_WARNING_**: Usage of this function is not recommended. Use `.unload` if possible.

`.reload` forces re-loading and re-evaluation of the script, synchronously. It's the only function that is not lazy, hence why it is not recommended. However, it can have use in some rare conditions. It is still recommended to use `.unload` to achieve the same end lazily.

<hr>

#####`.watch()` -> `boolean`

Creates a file watcher to watch for any changes of the target script. If a change is detected, such as actual file changes or file renaming, this script is marked as not loaded and, in the case of renaming, the `.filename` attribute is updated.

On the next invocation of `.call` or `.apply`, the script is then loaded and evaluated as usual, but with the changes accounted for.

Returns true if a file watcher was added, false if one already existed.

If the script is updated often but invoked infrequently, the lazy evaluation of the script means there is almost no performance hit caused by repeated file changes.

In the event of file deletion, the script is unloaded, unwatched and `.filename` is set to null. Due to the limitations of the file watcher system, it cannot automatically pick up on a new file with the same name if it were to be placed back. Probably because the new file would have a different inode value or something.

After file deletions, a call to `.load` will set things back up correctly.

NOTE: For simple renames without changing file content, the script is not unloaded, but the `.filename` attribute is updated accordingly.

<hr>

#####`.unwatch()` -> `boolean`

Removes a file watcher if one existed.

Returns true if it was able to remove an existing file watcher, false if one didn't exist in the first place.

NOTE: After a call to `.unwatch`, file watching is disabled, and any file changes will not be reflected.

<hr>

#####`.close(permanent? : boolean)`

Unloads and unwatches the script.

`permanent` defaults to true.

If `permanent` is true, the script module is deleted from the parent module, and from the Script instance. After a call to `.close(true)`, the script instance is rendered useless. This should only be used when the script is not needed again. In order to invoke the script again, a new instance must be created.

<hr>

#####`.imports` <-> `any`

`.imports` is a variable passed into the script module when it is run. It can be set to anything, but defaults to an empty object like `module.exports`

See [`module.imports`](#moduleimports---any) for example usage.

<hr>

#####`.exports` -> `any`

If the script has already been evaluated, this is the same object as `module.exports` within the script. If the script has not been evaluated, `.exports` is null.

<hr>

#####`.id` <-> `string`

This attribute is a simple identifier used by the Node.js module system for stuff. Calls to `.load` set it to the basename of the filename given, but it can be overwritten manually.

Example:
```javascript

var script = new Scriptor.Script('something.js');

script.id = "My Script";

script.call(); //'module.id' within the script context is "My Script"
```

<hr>

#####`.children` -> `Module[]`

Although this is rare, a script is still technically a module underneath, so it is possible for it to have children. This is allows access to them.

<hr>

#####`.parent` -> `Module`

Reference to the parent module.

<hr>

#####`.loaded` -> `boolean`

True if the script is loaded and compiled, or false if it is not.

<hr>

#####`.watched` -> `boolean`

True if the script file is being watched, false otherwise.

<hr>

#####`.filename` -> `string`

Returns the filename of the script. If no file has been given or the file has been deleted, this equals null.

<hr>

#####`.maxRecursion` <-> `number`

To prevent accidental infinite recursion on scripts, the default `maxRecursion` is set to 1, meaning a script cannot reference itself at all without throwing a `RangeError`. To increase this limit, just assign it a higher number.

Example:
```javascript
/**** fib.js ****/
module.exports = function fibonacci(n) {
    if(n < 2) {
        return n;
    } else {
        return module.reference('fib.js', n - 1) + module.reference('fib.js', n - 2);
    }
}

/**** main.js ****/
var fib = new Scriptor.Script('fib.js');

fib.maxRecursion = 45;

console.log(fib.call(20));
```

Prints 6765.

Also, please don't use a recursive fibonacci function. There are many better ways of calculating fibonacci numbers out there.

<hr>

###Special functions when used with a Manager:

These functions are added to the Script when the scripts are created via a Manager instance.

Unlike the manager functions, these work with filenames relative to the script, which make it easier to work with complex directory structures where dealing with a root directory is way too much of a hassle. Of course absolute paths work as well.

#####`.reference(filename : string, ...args : any[])` -> `any`

This is effectively a call to `<manager>.add(filename).call(...args)`

It is useful when referring to other scripts within a Manager.

<hr>

#####`.reference_apply(filename : string, args : any[])` -> `any`

This is effectively a call to `<manager>.add(filename).apply(args)`

It is useful when referring to other scripts within a Manager.

<hr>

#####`.reference_once(filename : string, ...args : any[])` -> `Reference`

This can be a very powerful system function if used correctly. It basically evaluates a script ONCE, and returns a reference to the result in the form of a `Reference` class instance. By calling `.value()` on the Reference the returned value of the script can be accessed.

What is powerful about this is that even though it acts as a static variable, it takes into account file changes like the rest of Scriptor.

When a script referenced by `.reference_once` changes, the Reference picks up that change and re-evaluates it with the arguments that were initially given to it by `.reference_once`.

It also does this lazily, too. If the Reference has not invoked the script, it will the next time `.value()` is called.

A particularly good use for this is configuration files. As stated before, Scriptor can load anything `require` can, including JSON files.

Example:
```javascript
/**** Inside a script ****/
var config = module.reference_once('./configs/main.json');

var _ = require('lodash');

module.exports = function() {
    return _.extend(config.value(), {
        myCustomConfig: 'Hello'
    });
};
```

The above example, as used within a script, allows for a modified configuration to be returned, but with the config variable being static throughout the duration of the program unless `./configs/main.json` is changed, at which point it is marked stale and re-evaluated and stored as static until any further changes.

Although it can be a bit difficult to use concisely, automatically updating static variables are quite useful.

Furthermore, any more calls to `.reference_once` from anywhere else for the file `./configs/main.json` will return the exact same Reference instance, and will have access to the same automatically updating static value.

<hr>

#####`.include(filename : string, load? : boolean)` -> `Script`

This is effectively a call to `<manager>.add(filename)`

It is useful when referring to other scripts within the same manager, and when you need access to the script itself instead of just invoking it.

If `load` is true, it forces evaluation of the script before it is returned. If the script is new and not evaluated, it may be in an incomplete state.

`load` defaults to false.

<hr>

##SourceScript

A SourceScript is a specialization of Script that can handle direct compilation from source code provided to it in the form of a string or a Reference that returns a string when `.value()` is called.

**NOTE**: All normal functions from [Script](#script) are inherited and work the exact same. The only function changed is `.load`.

If the source code given to a SourceScript is a Reference, the SourceScript can 'watch' that Reference similarly to how a Script watches a file. When the Reference becomes invalidated, so does the SourceScript, and will recompile and reevaluate with the most recent code given to it by the Reference.

This is particularly useful for loading code of some sort that is not JavaScript and needs an additional step of compilation by some other system. Like JSX, CoffeeScript, etc.

Using Reference.transform and Reference.join, it should be possible to manipulate code in any way needed before giving it to the SourceScript, and it will STILL re-evaluate when needed as all changes propegate through the References and into the SourceScript.

#####`new Script(src? : string|Reference, parent? : Module)` -> `SourceScript`

Create a new SourceScript and optionally called `.load` with the `src` provided.

<hr>

#####`.load(src? : string|Reference, watch? : boolean)` -> `SourceScript`

Marks the SourceScript to draw the source code from a new source, be it a static string or a Reference.

Due to the lazy evaluation, it will not be compiled/evaluated until it is next needed.

If `watch` is true and `src` is a Reference, the SourceScript will watch for changes of that Reference and recompile/re-evaluate the script as necessary.

`watch` defaults to true. If `src` is a string, `watch` has no effect.

<hr>

#####`.source` -> `string`

Returns the source for the compiled script. If a Reference was given as a source, this dereferences it to get the value. If the value was not a string, this will throw an assertion error.

<hr>

##Script Environment

Although the scripts are run by the native Node.js module system, Scriptor adds a couple functions into it to make things easier.

#####`module.define(id? : string, deps? : string[], factory : Function)`

This is arguably not needed, but is useful nonetheless. Using the amdefine library, Scriptor injects this function into the module before running the script, allowing the script to use this.

It's not quite as elegant as just having `define` by itself, but it had to work within the bounds of the module system.

<hr>

#####`module.reference(filename : string, ...args : any[])` -> `any`

This is alias for `<script>.reference`, with script being the Script instance that runs the code.

<hr>

#####`module.reference_apply(filename : string, args : any[])` -> `any`

This is alias for `<script>.reference_apply`, with script being the Script instance that runs the code.

<hr>

#####`module.reference_once(filename : string, ...args : any[])` -> `Reference`

This is alias for `<script>.reference_once`, with script being the Script instance that runs the code.

<hr>

#####`module.include(filename : string, load? : boolean)` -> `Script`

This is alias for `<script>.include`, with script being the Script instance that runs the code.

<hr>

#####`module.imports` -> `any`

Variable(s) passed into the script by the user by setting `Script.imports` before the script has been evaluated.

Example:
```javascript
/**** compile.js ****/
var doT = require('dot');

module.exports = function compile(src, opts) {
    return doT.template(src, opts, module.imports.templateSettings);
}

/**** main.js ****/
var compile = new Scriptor.Script('compile.js');

compile.imports.templateSettings = {
    strip: false
};

var template = compile.call('Some template', null);
```

<hr>

##ITransformFunction

A unique part of Scriptor is the ability to chain or join together script results (in the form of References) via transform functions.

Transform function are defined as follows:
```typescript
interface ITransformFunction {
    (left : Reference, right : Reference) => any;
}
```

Now, if you don't know TypeScript, the above is simply a definition for a function that accept two References and returns a result.

For example, the merge function used in the Reference examples:
```javascript
//left and right are References
function merge(left, right) {
    return _.merge({}, left.value(), right.value(), function(a, b) {
        return _.isArray(a) ? a.concat(b) : void 0;
    } );
}
```

Where `_` is lodash.

The neat thing about this specification is that it is useful in both the `.join` and `.transform` modifiers.

When used with `.join`, both left and right References are passed to it, but when used with `.transform`, only a left Reference is passed to it, and right is null.

This is because `.transform` only works on a single Reference at a time, and the `.left` documentation states it will return `this` for an unjoined Reference. Although it may seem confusion, even a joined Reference is considered unjoined when being transformed simply because it has only one `.value` to read from, not two. It in itself takes care of the left and right References.

So, to sum up all that, because it isn't very clear, here is an example of each:
```javascript

var manager = new Scriptor.Manager();

var package = manager.once('package.json');

var name = package.transform(function(ref) {
    return 'Name: ' + ref.value().name;
});

console.log(name.value()); //"Name: scriptor"

//Using the same files defined below
var a = manager.once('a.json');
var c = manager.once('c.json');

var helloworld = a.join(b, function(left, right) {
    return right.value().Goodbye + ', ' + left.value().Hello;
});

console.log(helloworld.value()); //"Hello, World!"
```

Or chain them as much as you desire:

```javascript
var html_hello = helloworld.transform(function(ref) {
    return '<p>' + ref.value() + '</p>';
});

console.log(html_hello.value()); //<p>Hello, World!</p>
```

And if every source is being watched, any change to those files will be reflected at any level.

<hr>

##Reference

The Reference class is a tiny wrapper around the behavior for `reference_once`. It keeps track of the initial arguments, the statically cached value and updating it when the script changes.

#####`.value()` -> `any`

Effectively 'dereferences' the reference and returns the value the script returned.

Due to the lazy evaluation nature of Scriptor, `.value()` might load and evaluate the script if need be. Though usually it doesn't need to and returns the cached value immediately.

If the value is an object, it is frozen automatically to prevent changes.

<hr>

#####`.ran` -> `boolean`

True if the script has already run (and therefore the value is already cached), false if the script has not run.

<hr>

#####`.transform(transform : ITransformFunction)` -> `Reference`

Allows References to be chained together via a transform function. See the reference on [`ITransformFunction`](#itransformfunction) for more details.

#####`.join(ref : Reference, transform? : ITransformFunction)` -> `Reference`

This function allows you to join together reference instances using a transform function, returning a new Reference to encompass it.

What this does is effectively create a tree of dependencies joined together by the transform function.

The initial use case of this system was for merging many config files, keeping constant performance, and reflecting updates in the individual config files.

For example, take these three JSON files:

a.json
```json
{
    "Hello": "World!"
}
```

b.json
```json
{
    "So long": "And thanks for the fish"
}
```

c.json
```json
{
    "Goodbye": "Hello"
}
```

and use them with Scriptor as such:
```javascript
var _ = require('lodash');

//left and right are References
function merge(left, right) {
    return _.merge({}, left.value(), right.value(), function(a, b) {
        return _.isArray(a) ? a.concat(b) : void 0;
    } );
}

var manager = new Scriptor.Manager();

var a = manager.once('a.json');
var b = manager.once('b.json');
var c = manager.once('c.json');

var abc = a.join(b, merge).join(c, merge);

console.log(abc.value());
```

The above example prints out:
```json
{ "Hello": "World!",
  "So long": "And thanks for the fish",
  "Goodbye": "Hello" }
```

And the structure of references inside it is this:
```
        abc
       /   \
      ab    c
     /  \
    a    b
```

So if `a` changes, it bubbles up to `ab`, which bubbles up to `abc`, and the next time `abc`'s `.value()` is called, it re-evaluates `abc`, which re-evaluates `ab`, which re-evaluates `a`.

Since `b` and `c` never changed, they are not re-evaluated, but are nonetheless sent through the transform functions.

After all of the required changes are re-evaluated, `abc` once again becomes static and constant, making for instance access.

Of course this system can be used in other ways, with any custom transform function.

By default, the transform function is `Scriptor.identity`, which is as follows;

```typescript
function(left : Reference, right : Reference) : any {
    return left.value();
}
```

It's a variation of the identity function that just returns the leftmost value and ignores the right. That is because `this` is the default left value, and `this` is always available.

The merge function provided above is quite useful, but as stated, any transform with the above form can be used, and transforms are unique to each join operation, so incredibly complex chains of almost anything is possible.

*NOTE*: Joining a Reference to itself is disabled.

<hr>

#####`.left()` -> `Reference`

Complementing `.right()`, `.left()` returns the left Reference in a joined Reference.

If called on an unjoined Reference, `.left()` returns `this`;

It does this because `a.join(b)` is really `Reference.join(a, b)`.

<hr>

#####`.right()` -> `Reference`

In order to reflect the tree nature of joined References, this function accesses the right Reference in a joined Reference.

If called on an unjoined Reference, `.right()` returns null.

<hr>

#####`.close(recursive? : boolean)`

Because Reference's listen for changes on scripts, it is occasionally desired to close a Reference and remove those listeners.

If the Reference has been joined with another, then `recursive` can be set to true to close all child References.

After the Reference has been closed, it's behavior is useless or undefined.

<hr>

#####`.closed` -> `boolean`

Returns true if the Reference has been closed. If the Reference is closed, it is useless and cannot be used. Discard it.

<hr>

#####`Reference.join(left : Reference, right : Reference, transform? : ITransformFunction)` -> `Reference`

For easier use of the joined Reference system, this static method joins a left and a right Reference to create a new joined Reference.

Example using the `.join()` files:
```javascript
var _ = require('lodash');

//left and right are References
function merge(left, right) {
    return _.merge({}, left.value(), right.value(), function(a, b) {
        return _.isArray(a) ? a.concat(b) : void 0;
    } );
}

var Reference = Scriptor.Reference;

var manager = new Scriptor.Manager();

var a = manager.once('a.json');
var b = manager.once('b.json');
var c = manager.once('c.json');

var ab  = Reference.join(a, b, merge);
var abc = Reference.join(ab, c, merge);

console.log(abc.value());
```

The above example prints out:
```json
{ "Hello": "World!",
  "So long": "And thanks for the fish",
  "Goodbye": "Hello" }
```

Using the static join method might help understand the implicit tree structure a bit more.

<hr>

#####`Reference.join_all(refs : Reference[], transform? : ITransformFunction)` -> `Reference`

Since the structure of joined References is similar to a binary tree, with each having left and right children to watch, it is very easy to create a lopsided tree using just `.join`.

So, `.join_all` takes an array of References and creates a balanced join of them all, using a single transform function.

Example using the same three JSON files as before:
```javascript
var Reference = Scriptor.Reference;

var _ = require('lodash');

var fs = require('fs');
var path = require('path');

//left and right are References
function merge(left, right) {
    return _.merge({}, left.value(), right.value(), function(a, b) {
        return _.isArray(a) ? a.concat(b) : void 0;
    } );
}

var manager = new Scriptor.Manager();

//Read all .json files in the current directory and map them to References
var refs = _(fs.readdirSync('./')).filter(function(file) {
    return path.extname(file) === '.json';
}).map(function(file) {
    return manager.once(file);
} ).value(); //part of lodash chain, not Reference.value

var merged_configs = Reference.join_all(refs, merge);

console.log(merged_configs.value());
```

The above example prints out:
```json
{ "Hello": "World!",
  "So long": "And thanks for the fish",
  "Goodbye": "Hello" }
```

Although the output is same, `.join_all` guarantees a balanced dependency tree, even for hundreds or thousands of References. So each time a file changes, the number of References that have to be re-evaluated and re-transformed is minimal.

*NOTE*: References toward the middle of the array end up closer to the top, and the front and back elements end up deeper in the tree. Additionally, the depth of the dependency tree is log(n) the number elements in the array. It really is a binary tree.

<hr>

##Manager

Scriptor provides a Manager class that can effectively coordinate many inter-referencing scripts together with little effort.

#####`new Manager(grandParent? : Module)` -> `Manager`

Create a new Manager instance, optionally giving it a Module it will use as a grandparent when creating child scripts.

Internally it creates a single Module representing itself that it gives to child scrips as their parent. This is so that many scripts being coordinated will not pollute the real module, but instead a single-purpose intermediary module.

<hr>

#####`.add(filename : string, watch? : boolean)` -> `Script`

This will create a new Script instance with `filename` as the script file,
and set up file watching on it.

`watch` is true by default.

If a script already exists in the Manager, a new one is not created and the old one is returned. Additionally, `watch` is an additive argument. Setting it to false on an already added and watched script will not unwatch it.

`.add` can be used as a shortcut for adding and/or getting scripts in the same function.

<hr>

#####`.remove(filename : string, close? : boolean)` -> `boolean`

Removes a script from the Manager instance.

If `close` is true, it will permanently close the script pointed to by `filename` according to the specification give by [`Script.close`](#closepermanent--boolean)

`close` defaults to true.

<hr>

#####`.call(filename : string, ...args : any[])` -> `any`

Equivalent to `.add(filename).call(...args)`

<hr>

#####`.apply(filename : string, args : any[])` -> `any`

Equivalent to `.add(filename).apply(args)`

<hr>

#####`.call_once(filename : string, ...args : any[])` -> `Reference`

Although this has the same effect as `reference_once` from a Script instance, it's adapted for use in the Manager. It behaves exactly the same otherwise.

<hr>

#####`.once_apply(filename : string, args : any[])` -> `Reference`

Same as the above, but allows an array of arguments instead of using variable argument function magic.

<hr>

#####`.get(filename : string)` -> `Script`

Will return the Script instance stored in the Manager. If one does not exist, undefined is returned.

#####`.clear(close? : boolean)`

This will clear out the Manager and reset it.

If `close` is true, the scripts within are closed according to the specifications of [`Script.close()'](#closepermanent--boolean).

`close` defaults to true.

<hr>

##Rational and Behavior

This project is probably the most interesting single library I've written. It took four or five rewrites to get it to be as concise and useful as it is now.

One of the most important implementation details of this is the exploitation of the Node.js module module (not a typo). Internally, `require` and other things use the module module to load and compile files to be returned. It compiles and evaluates them in a semi-contained context that was perfect for server-side scripting systems. However, require caches everything, so a call to require the second time doesn't reload the script, otherwise Node would be slow and bloated quite a bit.

But, what really sold me on trying to use it was the module system itself. Not just that it runs it, but that it gives the 'module' variable to the script and I can create my own and give them custom attributes (like `module.reference`). All that combined, it was the perfect match.

So, I reverse-engineered almost all of the node module system down to its core, created TypeScript type definitions of all its internals ([See Here](https://github.com/novacrazy/node-module)) and figured out just how easy it was.

Plus, with the module API locked down with very few changes in the last couple years, I was able to create Scriptor.

However, the only bad part was that the module module, because it is almost always used at the startup of Node in `require` calls, is synchronous. So, a major design emphasis of Scriptor was that everything be lazily evaluated. That way even if a file changes thousands of times, it is only even loaded, compiled and evaluated when it is actually needed. Thereby reducing unexpected delays and generally making the system more responsive.

As I stated in the introduction, I am actively using this project within my own server system, and so far it is incredibly useful. Additionally, because everything, once compiled, is effectively just functions, calling a top level script is the same as one large and nested function in terms of performance, depending on what your scripts actually have in them. It's certainly better than anything else.

I lost a big chunk of latter part of this explanation when my IDE crashed parsing out this large markdown file when I accidentally clicked 'preview'. I may update this section later if I have more to add.

<hr>

##Changelog

#####1.3.3
* Renamed all Referee stuff into Reference. Referee was such a horrible name in retrospect.

#####1.3.2
* Added some type assertions
* Fixed bug in script where References were not being stored
* `.load` now emits 'change' events
* Strip BOM on SourceScript if needed
* Fixed bug where join and transform functions might not have worked chained together
* Renamed Manager.once_apply to apply_once, and added call_once to manager.
* Prepping to move Referee stuff over to a new transform library, as it's a bit too much to have in a scripting library.
* Realized Referee is not a good name for those. "I are good namer."

#####1.3.1
* Updated package.json description.

#####1.3.0
* Added [`SourceScript`](#sourcescript)
* Added [`.transform`](#transformtransform--itransformfunction---reference) method
* Added documentation for [`ITransformFunction`](#itransformfunction)
* Reworked some internals and changed some defaults
* Added [`.call_once`](#call_onceargs--any---reference) and [`.apply_once`](#apply_onceargs--any---reference) methods
* Made [`.reload`](#reload---boolean) invalidate References
* Added [`Scriptor.load`](#scriptorloadfilename--string-watch--boolean---script) and [`Scriptor.compile`](#scriptorcompilesrc--stringreference-watch--boolean---sourcescript) methods
* Prevented multiple closing on References
* Updated left/right join semantics

#####1.2.4
* Added [`.close()`](#closerecursive--boolean) methods and [`.closed`](#closed---boolean) properties to References
* Fixed bug in [`.load()`](#loadfilename--string-watch--boolean---script) that prevented watching a new filename
* Removed all non-strict equalities and inequalities
* Use `void 0` where possible instead of null
* Overprotected file watcher system in case of potential file deletion events
    * Was unable to test it, though.
* Made forced reloading in [`.include()`](#includefilename--string-load--boolean---script) optional

#####1.2.3
* Forgot to freeze another part of Reference values

#####1.2.2
* Freeze Reference values to prevent accidental tampering by destructive functions

#####1.2.1
* Fixed a few things JSHint complained about.

#####1.2.0
* Added [`Reference.join_all`](#referencejoin_allrefs--reference-transform--function---reference) function
* Fixed typo

#####1.1.1
* Modified internal semantics for [`.join`](#joinref--reference-transform--function---reference)
* Added static [`Reference.join()`](#referencejoinleft--reference-right--reference-transform--function---reference) function
* Added [`.left()`](#left---reference) and [`.right()`](#right---reference)
* Fixed a few typos

#####1.1.0
* [`.join`](#joinref--reference-transform--function---reference) function on References
* [`.imports`](#imports---any) and [`.exports`](#exports---any) docs
* [`.maxRecursion`](#maxrecursion---number) and recursion protection

#####1.0.2
* README fixes

#####1.0.1
* Fixed a few typos in README.md
* Added npm badges

#####1.0.0

* First full release
* API improvements
* Full documentation
* A couple bugfixes
    * Reference wasn't actually marking the result as ran (fixed)

#####pre-1.0.0
* development

[npm-image]: https://img.shields.io/npm/v/scriptor.svg?style=flat
[npm-url]: https://npmjs.org/package/scriptor
[downloads-image]: https://img.shields.io/npm/dm/scriptor.svg?style=flat
[downloads-url]: https://npmjs.org/package/scriptor
[codacy-image]: https://img.shields.io/codacy/2143c559823843aa9a25ade263aff0e3.svg?style=flat
[codacy-url]: https://www.codacy.com/public/novacrazy/scriptor
