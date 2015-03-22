Basic Server Using Scriptor
===========================

The original motivation for Scriptor was to create a server that would automatically reload scripts when the files changed, so it would only make sense to include an example of that.

To run it, simply download the directory via a git clone or whatever you prefer, then run `npm run setup`. To actually run the server, run `npm run server`. Please report any issues.

The basic idea behind this is that a koa app controls the web part of it, and the react parts control the rendering of views. To do this, it uses a custom extension handler for the `.jsx` file extension, a factory module that keeps track of file changes while making sure there is always an up-to-date factory for the components, and a render module that takes a component factory and renders it to static markup, which is then passed back to koa for it to serve as the body of a reply.

The factory module is probably the most interesting one, as it uses References and transform functions to lazily create factory functions out of raw components, but re-use old ones if the component files haven't changed. It's quite neat, if I do say so.

###Some things to note:
* Views themselves export functions, while components export React components
    * This is so views have to be called, while components are simply used directly
* I prefer doT templates for the higher HTML stuff because I can shove in other stuff that isn't really for React, like meta tags and IE-specific condition script inclusions and so forth.
* Views and components should not use advanced Scriptor stuff like coroutines and built-in modules. They should generally be designed so that they can be wrapped up nicely with the RequireJS Optimizer and sent to the client to become live.
* Using the references and includes in the factory and top stuff allows for Scriptor to reload those scripts when they change, effectively making it live-updating very easily.
