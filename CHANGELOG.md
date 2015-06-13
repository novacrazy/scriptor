Scriptor Changelog
==================

#####2.6.0
* Refactored all loading and pending promises to use the event system underneath. This should prevent leaky promises.
* In conjunction with the top, the unloading process has been changed somewhat and all loading operations are not allowed when it's already loading.

#####2.5.5
* Force textMode to false on require.

#####2.5.4
* Added `--max_listeners <n>` command line option to set max listeners on the host Manager

#####2.5.3
* Added `Manager.setMaxListeners` and `Manager.getMaxListeners` to control the maximum number of listeners on new scripts added to the Manager instance.

#####2.5.2
* Support exports['default'] AMD syntax, commonly used with ES6 modules.

#####2.5.1
* Prevent potential memory leaks caused by adding and calling many non-existent scripts to a Manager instance. For example, when serving scripts on a server, a DDoS could be possible just trying to access thousands of non-existent scripts, which although resulting in a 404, could create many unused Script instances in the Manager that are never used or cleared. This patch removes Script instances from Managers if an error is thrown while calling them.

#####2.5.0
Breaking changes:
* Moved from tj/co to bluebird coroutines
    * Bluebird coroutines are much less opinionated and allow better stack traces for complex code paths

#####2.4.0
* Upgraded the pseudo-RequireJS config normalization functions
* Only resolve paths relative to baseUrl when the path is relative (e.g., begins with a dot "./test.js")

#####2.3.2
* Fixed race condition mentioned in issue #6
* Added `.loading` value to scripts

#####2.3.1
* Added `.dependencies` to view script dependencies specified via `define`

#####2.3.0
* New TextScript class
* New `textMode` property on Scripts
* New `text!` plugin for TextScripts
* Buffers now used for source storage
* File watchers debounce changes. Debounce time can be set (before watching) via `debounceMaxWait` property
* Event propagation base improvements
* Limited support for RequireJS-like `.config` configuration settings with `paths` value for module lookup
* Optionally disable Scriptor from setting process title

#####2.1.0
* Added `.source()` on normal scripts, which custom extensions can populate by returning the source string

#####2.0.1
* Removed spacing in the AMD Header that would cause some line number issues

##Version 2.0
* Completely asynchronous build
* Many Reference types with advanced features
* Standalone executable
* Full AMD support natively
* Much better documentation and examples
* In general much, much better quality

##Pre-2.0

#####1.4.0-alpha.4
* Added in real async loading for situations that allows it
* Implemented more of the AMD spec
* Fixed and optimized a few things
* Still working on documentation
* Added async dependency for async.map

#####1.4.0-alpha.3
* added `clearReference` function
* Bettered inheritance model
* Working on documentation now

#####1.4.0-alpha.2
* Removed fake async require
* Added `require.specified`, `require.defined` and `onload.error` AMD functions
* Fixed bug in plugin loading

#####1.4.0-alpha.1
* use `url.resolve` instead of `path.resolve` in `requite.toUrl`
* assert AMD plugin is not null

#####1.4.0-alpha.0
* Big changes, though not breaking changes
* Removed amdefine dependency
* Implemented amdefine functionality into Scriptor natively
* More AMD features taking advantage of Scriptor systems
* Use of Map data structure where available, with standard object fallback.
* Have not documented changes yet, but that is in progress.

#####1.3.9
* Simplified a function call

#####1.3.8
* Upped protection of loading and executing scripts
* Script.exports now evaluates the script if it has not already done so, thereby allowing direct use of .exports
* Added `cwd` and `chdir` property and function to the script Manager class so scripts can have specific locations instead of relative to the manager.

#####1.3.7
* Fixed issue where the recursion protection would mess up and give false positives.

#####1.3.6
* Reverted last version changes because the issue was unrelated to the Scriptor library, but instead with dual module dependencies behaving weird.

#####1.3.5
* Fixed issue with instanceof not handling inherited classes

#####1.3.4
* Added `.change` function to script environment so it can trigger Reference resets

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
