Scriptor
========

### This project is defunct and outdated. I would not recommend using it, but feel free to browse the code and steal anything useful.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][npm-url]
[![Codacy Score][codacy-image]][codacy-url]
[![MIT License][license-image]][npm-url]

# Introduction
Scriptor is the ultimate library for dynamically loading, reloading and running scripts, with built-in support for file watching to automatically reload when necessary.

A script is defined as a file which can be 'required' via CommonJS `require` function in node and io.js. It can be a `.js`, `.json`, and even `.node` or any other installed extension. For the asynchronous build of Scriptor, custom extensions can even be defined that take advantage of Promises and Coroutines.

Additionally, Scriptor includes a Manager class that helps to coordinate many scripts and even allow them to cross-reference each other to form more complex multi-script applications.

As of Version 2.0, Scriptor now has a command line interface capable of running Scriptor AMD scripts either synchronously or asynchronously. It can effectively replace `node` in the case of AMD scripts. By default, it uses the custom extension handler to inject the define function and load files.

# Purpose
The initial purpose of Scriptor was to create a system for writing simple scripts that generate web pages. It has since become a standalone library.

# Topics
* [Quick Start](#quick-start)
* [Features](#scriptor-features)
* [Documentation](#documentation)
    * [API Documentation](/docs/api.md)
    * [Asynchronous Module Definitions](/docs/amd.md)
    * [CLI Documentation](/docs/cli.md)
* [Example Code](#example-code-and-useful-recipes)
* [Support](#support)
* [Changelog](/CHANGELOG.md)
* [License](#license)

# Quick Start
`npm install scriptor` or `npm install -g scriptor`

Then:

`var Scriptor = require('scriptor');`

Or for the command line interface:

```
$scriptor -h

   Usage: scriptor [options] files...

   Options:

     -h, --help               output usage information
     -V, --version            output the version number
     -d, --dir <path>         Directory to run Scriptor in
     -a, --async              Run scripts asynchronously
     -c, --concurrency <n>    Limit script concurrency to n when executed asynchronously (default: max_recursion + 1)
     -q, --close              End the process when all scripts finish
     -w, --watch              Watch scripts for changes and re-run them when changed
     -p, --propagate          Propagate changes upwards when watching scripts
     -l, --long_stack_traces  Display long stack trace for asynchronous errors
     -r, --repeat <n>         Run script n times (in parallel if async)
     -u, --unique             Only run unique scripts (will ignore duplicates in file arguments)
     --debounce <n>           Wait n milliseconds for debounce on file watching events (default: 50ms)
     --use_strict             Enforce strict mode
     --max_listeners <n>      Set the maximum number of listeners on any particular script
     --max_recursion <n>      Set the maximum recursion depth of scripts (default: 9)
     -v, --verbose [n]        Print out extra status information (0 - normal, 1 - info, 2 - verbose)
     --cork                   Cork stdout before calling scripts
     -s, --silent             Do not echo anything
     --no_ext                 Disable use of custom extensions with AMD injection
     --no_signal              Do not intercept process signals
     --no_glob                Do not match glob patterns
     --no_title               Do not set process title
```

# Scriptor Features

##### Synchronous or Asynchronous
Scriptor comes in two variations. There is the normal, synchronous build, which lazily evaluates scripts, but returns values synchronously.

Then there is the asynchronous build, which not only lazily evaluates scripts, but can load scripts and wait on return values asynchronously using Promises and even run module factories using coroutines.

For the advantages or disadvantages of either, see [Here](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#foreword-about-the-sync-and-async-builds)

##### AMD
Inside a script, Scriptor injects a few extra functions into the global `module` variable that facilitates Asynchronous Module Definitions (AMD). It is a fully fledged AMD implementation complete with plugin support, lazy evaluation of defined modules, and (in the asynchronous build), fully asynchronous dependency resolution. All of which integrates gracefully with standard Node.js modules and Scriptor itself.

For a full tutorial on how to best use Scriptor with AMD, see [Here](/docs/amd.md)

##### Automatic Reloading
Scriptor utilizes file watchers to automatically reload and rename scripts as needed. No need to manually recompile scripts using complex file watcher code. It's all built-in.

##### References
Scriptor has a way overpowered system that can be used to 'reference' a single evaluation of a script and automatically reload and re-evaluate the reference when the script changes. In addition, Scriptor includes a fully fledged system for merging, transforming and generally manipulating references values while still propagating changes in the originating scripts.

For more information on this feature, see [Here](https://github.com/novacrazy/scriptor/blob/master/docs/api.md#reference)

# Documentation

* [API Documentation](/docs/api.md)
* [Asynchronous Module Definitions](/docs/amd.md)
* [CLI Documentation](/docs/cli.md)

# Example Code and Useful Recipes
* [Example Custom Extension Handlers](https://github.com/novacrazy/scriptor/tree/master/docs/recipes/custom%20extension%20handlers)
* [Example Server using React and Koa](https://github.com/novacrazy/scriptor/tree/master/docs/recipes/react-server)
* [Example AMD Plugin](https://github.com/novacrazy/scriptor/tree/master/docs/recipes/async-plugin)

# Support
* [Github issues for bugs and feature requests](/issues)
* Email me at [novacrazy@gmail.com](mailto://novacrazy@gmail.com) for help and advice.

# License
The MIT License (MIT)

Copyright (c) 2015-2016 Aaron Trent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[npm-image]: https://img.shields.io/npm/v/scriptor.svg?style=flat
[npm-url]: https://npmjs.org/package/scriptor
[downloads-image]: https://img.shields.io/npm/dm/scriptor.svg?style=flat
[codacy-image]: https://img.shields.io/codacy/2143c559823843aa9a25ade263aff0e3.svg?style=flat
[codacy-url]: https://www.codacy.com/public/novacrazy/scriptor
[license-image]: https://img.shields.io/npm/l/scriptor.svg?style=flat
