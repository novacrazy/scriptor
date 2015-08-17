/**
 * Created by Aaron on 7/5/2015.
 */

import Module from 'module';

import assert from 'assert';

import {resolve} from 'path';
import {normalizeConfig} from './utils.js';

import Script from './script.js';

class ScriptAdapter extends Script {
    _manager = null;

    constructor( manager, filename, parent ) {
        super( filename, parent );

        this._manager = manager;

        //When a script is renamed, it should be reassigned in the manager
        //Otherwise, when it's accessed at the new location, the manager just creates a new script
        this.on( 'rename', ( event, oldname, newname ) => {
            this._manager._scripts.set( newname, this._manager._scripts.get( oldname ) );
            this._manager._scripts.delete( oldname );
        } );
    }

    get manager() {
        return this._manager;
    }

    include( filename, load = false ) {
        //make sure filename can be relative to the current script
        var real_filename = resolve( this.baseUrl, filename );

        //Since add doesn't do anything to already existing scripts, but does return a script,
        //it can take care of the lookup or adding at the same time. Two birds with one lookup.
        var script = this._manager.add( real_filename );

        //Since include can be used independently of reference, make sure it's loaded before returning
        //Otherwise, the returned script is in an incomplete state
        if( load && !script.loaded ) {
            script.reload();
        }

        this.propagateFrom( script, 'change', () => {
            this.unload();
            this.emit( 'change', this.filename );
        } );

        script.propagateEvents( this.isPropagatingEvents() );

        script.maxRecursion = this.maxRecursion;

        return script;
    }

    close( permanent ) {
        if( permanent ) {
            this._manager.scripts.delete( this.filename );

            delete this['_manager'];
        }

        return super.close( permanent );
    }
}

export default class Manager {
    _debounceMaxWait = null;
    _maxListeners = null;
    _maxRecursion = null;

    _config = null;
    _cwd = process.cwd();

    _scripts = new Map();
    _parent = null;

    _propagateEvents = false;

    constructor( grandParent ) {
        this._parent = new Module( 'ScriptManager', grandParent );
    }

    get parent() {
        return this._parent;
    }

    get scripts() {
        return this._scripts;
    }

    get debounceMaxWait() {
        return this._debounceMaxWait;
    }

    set debounceMaxWait( time ) {
        if( time !== null && time !== void 0 ) {
            time = Math.floor( time );

            assert( !isNaN( time ), 'debounceMaxWait must be set to a number' );

            this._debounceMaxWait = time;

        } else {
            this._debounceMaxWait = null;
        }
    }

    cwd() {
        return this._cwd;
    }

    chdir( value ) {
        this._cwd = resolve( this.cwd(), value );

        return this._cwd;
    }

    setMaxListeners( value ) {
        if( value !== null && value !== void 0 ) {

            value = Math.floor( value );

            assert( !isNaN( value ), 'setMaxListeners must be passed a number' );

            this._maxListeners = value;

        } else {
            this._maxListeners = null;
        }
    }

    getMaxListeners() {
        return this._maxListeners;
    }

    set maxRecursion( value ) {
        if( value !== null && value !== void 0 ) {

            value = Math.floor( value );

            assert( !isNaN( value ), 'maxRecursion must be set to a number' );

            this._maxRecursion = value;

        } else {
            this._maxRecursion = null;
        }
    }

    get maxRecursion() {
        return this._maxRecursion;
    }

    config( config ) {
        this._config = normalizeConfig( config );

        this._scripts.forEach( script => {
            script.config( this._config, true );
            script.unload();
        } );
    }

    propagateEvents( enable = true ) {
        var wasPropagating = this._propagateEvents;

        this._propagateEvents = enable;

        if( wasPropagating && !enable ) {
            //immediately disable propagation by pretending it's already been propagated
            this._scripts.forEach( script => {
                script.propagateEvents( false );
            } );

        } else if( !wasPropagating && enable ) {
            this._scripts.forEach( script => {
                script.propagateEvents( true );
            } );
        }
    }

    _modifyScript( script ) {
        if( script !== void 0 ) {
            if( this._propagateEvents ) {
                script.propagateEvents();
            }

            if( this.debounceMaxWait !== null && this.debounceMaxWait !== void 0 ) {
                script.debounceMaxWait = this.debounceMaxWait;
            }

            if( this.maxRecursion !== null && this.maxRecursion !== void 0 ) {
                script.maxRecursion = this.maxRecursion;
            }

            if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
                script.setMaxListeners( this._maxListeners );
            }

            if( this._config !== null && this._config !== void 0 ) {
                script.config( this._config, true );
            }
        }

        return script;
    }

    //this and Script.watch are basically no-ops if nothing is to be added or it's already being watched
    //but this functions as a way to add and/or get a script in one fell swoop.
    //Since evaluation of a script is lazy, watch is defaulted to true, since there is almost no performance hit
    //from watching a file.
    add( filename, watch = true ) {
        filename = resolve( this.cwd(), filename );

        var script = this._scripts.get( filename );

        if( script === void 0 ) {
            script = new ScriptAdapter( this, null, this._parent );

            script.load( filename, watch );

            this._scripts.set( filename, script );
        }

        this._modifyScript( script );

        //Even if the script is added, this allows it to be watched, though not unwatched.
        //Unwatching still has to be done manually
        if( watch ) {
            script.watch();
        }

        return script;
    }

    //Removes a script from the manager. But closing it permenantly is optional,
    //as it may sometimes make sense to move it out of a manager and use it independently.
    //However, that is quite rare so close defaults to true
    remove( filename, close = true ) {
        filename = resolve( this.cwd(), filename );

        var script = this._scripts.get( filename );

        if( script !== void 0 ) {
            if( close ) {
                script.close();
            }

            return this._scripts.delete( filename );
        }

        return false;
    }

    call( filename, ...args ) {
        return this.apply( filename, args );
    }

    apply( filename, args ) {
        var script = this.add( filename, false );

        try {
            return script.apply( args );

        } catch( err ) {
            this.remove( filename, true );

            throw err;
        }
    }

    reference( filename, ...args ) {
        return this.reference_apply( filename, args );
    }

    reference_apply( filename, args ) {
        let ref = this.add( filename, false ).reference( args );

        if( this._maxListeners !== null && this._maxListeners !== void 0 ) {
            ref.setMaxListeners( this._maxListeners );
        }

        return ref;
    }

    get( filename ) {
        filename = resolve( this.cwd(), filename );

        return this._modifyScript( this._scripts.get( filename ) );
    }

    //Make closing optional for the same reason as .remove
    clear( close = true ) {
        if( close ) {
            this._scripts.forEach( script => {
                script.close();
            } );
        }

        this._scripts.clear();
    }
}
