Scriptor AMD Plugins
====================

Scriptor strives to have a complete AMD implementation, and part of that is plugins.

For the complete plugin API, see [The RequireJS docs page on the matter](http://requirejs.org/docs/plugins.html)

It should be noted that Scriptor only supports a subset of the full plugin API, as it does not need to execute any of the functions for optimization purposes.

Scriptor will only acknowledge the following plugin format:
```typescript
interface IOnLoadFunction {
    (module : any);
    onError(err : Error);
    fromText(source : string|Reference);
}

interface IAMDPlugin {
    load( name : string, require : IRequireFunction, onLoad : IOnLoadFunction, config : any );
    normalize( name : string, normalize : Function ) : string;
}
```

`write`, `writeFile`, `pluginBuilder`, and `onLayerEnd` are not supported and will be ignored.
