Scriptor Command Line Interface Documentation
=============================================

Scriptor comes with a nifty little command line tool for executing simple scripts.

Here is the help text for the binary:
```
scriptor

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
    --use_strict             Enforce strict mode
    --max_recursion <n>      Set the maximum recursion depth of scripts (default: 9)
    -v, --verbose [n]        Print out extra status information (0 - normal, 1 - info, 2 - verbose)
    --cork                   Cork stdout before calling scripts
    -s, --silent             Do not echo anything
    --no_ext                 Disable use of custom extensions with AMD injection
    --no_signal              Do not intercept process signals
    --no_glob                Do not match glob patterns
```

##Internals

Internally, when valid scripts or globs are passed to the Scriptor CLI, it will create a Manager instance for either the synchronous or asynchronous builds, and run the scripts through those.

Using [`Manager.chdir()`](), it sets the current working directory for each script as set by the `--dir <path>` option.

##Concurrency and Recursion

It is important to note that `--max_recursion` and `--concurrency` can conflict with each other occasionally.

For example, passing the arguments `scriptor -alpw --max_recursion 4 --concurrency Infinity --repeat 10 index.js` will fail. It tries to repeat execution of `index.js` 10 times, running them all at the same time. Since they are the same script instance internally, it thinks that because the recursion counter has incremented the number of times it has executed, that it has overflown the maximum recursion limit, throwing an error.

Although that's kind of a rare situation, since `--repeat` probably won't be used much, it's still good to keep in mind. Additionally, co-recursive scripts may overflow the maximum recursion limit if run concurrently.

##Logging

Scriptor rolls its own tiny logger that supports various levels of verbosity.

The supported levels are:

| Level     | Meaning           |
|:---------:|:------------------|
| -2        | Errors only       |
| -1        | Silenced          |
|  0        | Normal/Warnings   |
|  1        | Extra information |
|  2        | Verbose           |
