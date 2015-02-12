/**
 * Created by novacrazy on 2/12/2015.
 */

define( ['promisify!fs'], function * (fs)
{
    var file = yield fs.readFileAsync( './test/scripts/empty.js', 'utf-8' );

    return file;
}
)
;
