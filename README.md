scriptor
========

Scriptor is a small library for dynamically loading, reloading and running scripts without having to restart the process.

Example top level usage:
```javascript
var express = require('express');
var Scriptor = require('scriptor');

var app = express();

var manager = new Scriptor.Manager(module);

app.get('/scripts/*', function (req, res) {

    try {
        var page = manager.run_script('.' + req.path /*, optional, arguments, here, ...*/);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(page);

    } catch (e) {
        if(e instanceof Error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(e.toString());

        } else {
            res.writeHead(500, { 'Content-Type': 'text/json' });
            res.end(JSON.stringify(e));
        }
    }
});

var server = app.listen(8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});
```

Example script:
```javascript
module.define(['moment'], function(moment) {
    var html = ['<html><head></head><body>', '</body></html>'];

    return function() {
        return html[0] + 'The current time is: ' + moment.utc().toString() + html[1];
    };
});
```
Shows off the AMD define function inserted into the module global

Alternative example script:
```javascript
var moment = require('moment');

var html = ['<html><head></head><body>', '</body></html>'];

module.exports = function() {
    return html[0] + 'The current time is: ' + moment.utc().toString() + html[1];
}
```

Or just use `module.exports` directly.

Another alternative example:
```javascript
var moment = require('moment');

var html = ['<html><head></head><body>', '</body></html>'];

module.exports = return html[0] + 'This script was compiled at: ' + moment.utc().toString() + html[1];
```
Or use a static string determined at load/compile time.


Additionally, a script can reference other scripts.

Example of script referencing:
```javascript
/**** generate.js ****/
var moment = require('moment');

module.exports = function(formatting) {
    return 'The current time is: ' + moment.utc().format(formatting);
}

/**** index.js ****/
var html = ['<html><head></head><body>', '</body></html>'];

module.exports = function() {
    return html[0] + module.reference('./generate.js', 'MMMM Do YYYY, h:mm:ss a') + html[1];
}
```
Also demonstrates the ability to pass arguments to the referenced script to influence its behavior.
