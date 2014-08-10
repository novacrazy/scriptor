/**
* Created by novacrazy on 8/10/14.
*/
var util = require('util');
var assert = require('assert');

var Injector = require('./../lib/injector');

function test1(one, two, three, four) {
    return util.format('%d, %d, %d, %d', one, two, three, four);
}

function test2(three, two, four, one) {
    return util.format('%d, %d, %d, %d', one, two, three, four);
}

var func_test1;

describe('test simple injection', function () {
    it('should create the Injector.Create<ITestInjectorParameters> function', function () {
        func_test1 = Injector.Create(test1);

        assert.equal(typeof func_test1, 'function');
    });

    it('should do basic injections', function () {
        var res = test1(1, 2, 3, 4);

        var res2 = func_test1({
            one: 1,
            two: 2,
            three: 3,
            four: 4
        });

        assert.equal(res, res2);
    });

    it('should not matter what order the object is in', function () {
        var res = test1(1, 2, 3, 4);

        var res2 = func_test1({
            four: 4,
            one: 1,
            three: 3,
            two: 2
        });

        assert.equal(res, res2);
    });

    it('should automatically organize the arguments', function () {
        var func2 = Injector.Create(test2);

        var res = func2({
            four: 4,
            one: 1,
            three: 3,
            two: 2
        });

        assert.equal(res, '1, 2, 3, 4');
    });

    it('should give access to the original', function () {
        assert.equal(typeof func_test1.original, 'function');
    });
});

describe('other invocation methods', function () {
    describe('orderOf', function () {
        it('should pass arguments in arbitrary orders', function () {
            var res = func_test1.orderOf(['two', 'three', 'one', 'four'], 2, 3, 1, 4);

            assert.equal(res, '1, 2, 3, 4');
        });
    });
    //More to come, probably
});

describe('calling the Injector.Create<T> on native functions', function () {
    it('should fail if invoked normally', function () {
        try  {
            var func = Injector.Create(JSON.stringify);

            assert(false);
        } catch (e) {
            if (e.name != null) {
                assert.notEqual(e.name, 'AssertionError');
            }

            assert(e instanceof Error);
        }
    });

    it('should not fail if given a hint', function () {
        try  {
            var func = Injector.Create(JSON.stringify, ['object', 'replacer', 'pretty']);

            assert.equal(typeof func, 'function');

            var res = func({
                object: {
                    test: 1
                },
                pretty: true
            });

            assert.equal(res, '{"test":1}');
        } catch (e) {
            if (e.name != null) {
                assert.notEqual(e.name, 'AssertionError');
            }

            assert(e instanceof Error);
        }
    });
});

describe('abusing the defaultValue', function () {
    it('should effectively insert values', function () {
        var func = Injector.Create(test1, null, 1);

        var res = func({
            two: 2,
            three: 3,
            four: 4
        });

        assert.equal(res, '1, 2, 3, 4');
    });
});
