/**
 * Created by novacrazy on 2/5/2015.
 */

module.define( 'md5', ['include!./md5.js'], function(md5) {
    return md5.exports();
} );

module.define( ['md5'], function(md5) {
    return md5;
} );
