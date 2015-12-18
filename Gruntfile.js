/**
 * Created by novacrazy on 7/8/14.
 */

module.exports = function( grunt ) {

    grunt.loadNpmTasks( 'grunt-babel' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-banner' );

    var LICENSE = '/****\n * ' + grunt.file.read( './LICENSE', {encoding: 'utf-8'} ).replace( /\n/ig, '\n * ' )
                  + '\n ****/';

    var loose = {loose: true};

    grunt.initConfig( {
        babel:     {
            options:      {
                ast:        false,
                sourceMaps: false,
                compact:    false
            },
            build_modern: {
                options: {
                    plugins: [
                        [
                            "transform-async-to-module-method",
                            {"module": "bluebird", "method": "coroutine", loose: true}
                        ],
                        ["transform-class-constructor-call", loose],
                        ["transform-class-properties", loose],
                        ["transform-decorators", loose],
                        ["transform-do-expressions", loose],
                        ["transform-es2015-arrow-functions", loose],
                        ["transform-es2015-block-scoped-functions", loose],
                        ["transform-es2015-block-scoping", loose],
                        ["transform-es2015-classes", loose],
                        ["transform-es2015-computed-properties", loose],
                        ["transform-es2015-destructuring", loose],
                        ["transform-es2015-for-of", loose],
                        ["transform-es2015-function-name", loose],
                        ["transform-es2015-literals", loose],
                        ["transform-es2015-modules-commonjs", loose],
                        ["transform-es2015-object-super", loose],
                        ["transform-es2015-parameters", loose],
                        ["transform-es2015-shorthand-properties", loose],
                        ["transform-es2015-spread", loose],
                        ["transform-es2015-sticky-regex", loose],
                        ["transform-es2015-template-literals", loose],
                        ["transform-es2015-typeof-symbol", loose],
                        ["transform-es2015-unicode-regex", loose],
                        ["transform-exponentiation-operator", loose],
                        ["transform-export-extensions", loose],
                        ["transform-function-bind", loose],
                        ["transform-object-rest-spread", loose],
                        ["transform-undefined-to-void", loose],
                        ["transform-runtime", loose]
                    ]
                },
                files:   [
                    {
                        expand: true,
                        cwd:    './src/',
                        src:    './**/*.js',
                        dest:   './build/modern/'
                    },
                    {
                        expand: true,
                        cwd:    './test/src/',
                        src:    './**/*.js',
                        dest:   './test/build/'
                    }
                ]
            },
            build_compat: {
                options: {
                    presets: ["es2015", "stage-0"],
                    plugins: [
                        "transform-undefined-to-void",
                        "transform-runtime",
                        "transform-es5-property-mutators"
                    ]
                },
                files:   [
                    {
                        expand: true,
                        cwd:    './src/',
                        src:    './**/*.js',
                        dest:   './build/compat/'
                    },
                    {
                        expand: true,
                        cwd:    './bin/',
                        src:    './**/*.es6',
                        dest:   './bin/',
                        ext:    '.js'
                    }
                ]
            }
        },
        usebanner: {
            license: {
                options: {
                    position:  'top',
                    banner:    LICENSE,
                    linebreak: true
                },
                files:   {
                    src: ['./build/**/*.js', './bin/**/*.js']
                }
            }
        },
        clean:     {
            build: {
                src: ['./build', './bin/**/*.js', './bin/**/*.map']
            },
            tests: {
                src: ['./test/build']
            }
        }
    } );

    grunt.registerTask( 'build', [
        'clean:tests',
        'clean:build',
        'babel:build_modern',
        'babel:build_compat',
        'usebanner:license'
    ] );

    grunt.registerTask( 'default', ['build'] );
};
