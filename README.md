Scriptor
========

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][npm-url]
[![Codacy Score][codacy-image]][codacy-url]
[![MIT License][license-image]][npm-url]

# Introduction
Scriptor is the ultimate library for dynamically loading, reloading and running scripts without having to restart the process, with built-in support for file watching to automatically reload when necessary.

A script is defined as a file which can be 'required' via CommonJS `require` function in node and io.js. It can be a `.js`, `.json`, and even `.node` or any other installed extension. For the asynchronous build of Scriptor, custom extensions can even be defined that take advantage of Promises. See the [Extending](#extending) section for more detail on that.

Additionally, Scriptor includes a Manager class that helps to coordinate many scripts and even allow them to cross-reference each other to form more complex multi-script applications.

As of Version 2.0, Scriptor now has a command line interface capable of running Scriptor AMD scripts either synchronously or asynchronously. It can effectively replace `node` in the case of AMD scripts. By default, it uses the custom extension handler to inject the define function and load files.

# Purpose
The initial purpose of Scriptor was to create a system for writing simple scripts that generate web pages. It has since become a standalone library.

# Topics
* [Quick Start]()
* [Features]()
* [Documentation]()
    * [Synchronous API]()
    * [Asynchronous API]()
    * [Asynchronous Module Definitions]()
* [Example Code]()
* [Useful recipes]()
* [Support](#support)
* [Changelog](/CHANGELOG.md)
* [License](#license)

# Quick Start
`npm install scriptor` or `npm install -g scriptor`

Then:

`var Scriptor = require('scriptor');`

Or for the command line interface:

```
$scriptor --help

  Usage: scriptor [options] files...

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -d, --dir <path>         Directory to run Scriptor in
    -e, --ext                Disable use of custom extensions with AMD injection
    -a, --async              Run scripts asynchronously
    -q, --close              End the process when all scripts finish
    -c, --concurrency <n>    Limit script concurrency to n when executed asynchronously (default: max_recursion + 1)
    -l, --long_stack_traces  Display long stack trace for asynchronous errors
    -r, --repeat <n>         Run script n times (in parallel if async)
    -u, --unique             Only run unique scripts (will ignore duplicates in file arguments)
    --max_recursion <n>      Set the maximum recursion depth of scripts (default: 9)
    -v, --verbose [n]        Print out extra status information (0 - normal, 1 - info, 2 - verbose)
    --cork                   Cork stdout before calling scripts
    -s, --silent             Do not echo anything
```

# Scriptor Features

##### Synchronous or Asynchronous
Scriptor comes in two variations. There is the normal, synchronous build, which lazily evaluates scripts, but returns values synchronously. Then there is the asynchronous build, which also lazily evaluates scripts, but can load scripts and wait on return values asynchronously using Promises.

For the advantages or disadvantages of either, see [Here]()

##### AMD
Inside a script, Scriptor injects a few extra functions into the global `module` variable that facilitates Asynchronous Module Defintions (AMD). It is a fully fledged AMD implementation complete with plugin support, lazy evaluation of defined modules, and (in the asynchronous build), fully asynchronous dependency resolution. All of which integrates gracefully with standard Node.js modules and Scriptor itself.

For a full tutorial on how to best use Scriptor with AMD, see [Here]()

##### Automatic Reloading
Scriptor utilizes file watchers to automatically reload and rename scripts as needed. No need to manually recompile scripts using complex file watcher code. It's all built-in.

##### References
Scriptor has a way overpowered system that can be used to 'reference' a single evaluation of a script and automatically reload and re-evaluate the reference when the script changes. In addition, Scriptor includes a fully fledged system for merging, transforming and generally manipulating references values while still propagating changes in the originating scripts.

For more information on this feature, see [Here]()

# Documentation

* [Synchronous API]()
* [Asynchronous API]()
* [Asynchronous Module Definitions]()

# Example Code

* [Simple AMD Script]()
* [Asynchronous Plugins]()

# Useful recipes
* TODO

# Support
* [Github issues for bugs and feature requests](/issues)
* Email me at [novacrazy@gmail.com](mailto://novacrazy@gmail.com) for help and advice.

# License
The MIT License (MIT)

Copyright (c) 2014 Aaron Trent

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
