/**
 * Created by novacrazy on 7/8/14.
 */

module.exports = function( grunt ) {

    grunt.loadNpmTasks( 'grunt-babel' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-banner' );

    var LICENSE = '/****\n * ' + grunt.file.read( './LICENSE', {encoding: 'utf-8'} ).replace( /\n/ig, '\n * ' )
                  + '\n ****/';

    grunt.initConfig( {
        babel:     {
            options:      {
                loose:        "all",
                ast:          false,
                sourceMaps: false,
                nonStandard:  false,
                compact:      "false",
                modules:      "common",
                experimental: true
            },
            build_modern: {
                options: {
                    blacklist: [
                        'es3.memberExpressionLiterals',
                        'es3.propertyLiterals',
                        'regenerator', //es6.generators
                        'es6.properties.shorthand'
                    ],
                    optional:  [
                        'runtime',
                        'spec.undefinedToVoid',
                        'minification.constantFolding',
                        'minification.propertyLiterals',
                        'bluebirdCoroutines',
                        'es7.classProperties'
                    ]
                },
                files:   [{
                    expand: true,
                    cwd:    './src/',
                    src:    './**/*.js',
                    dest:   './build/modern/'
                }]
            },
            build_compat: {
                options: {
                    optional: [
                        'runtime',
                        'spec.undefinedToVoid',
                        'minification.constantFolding',
                        'minification.propertyLiterals',
                        'es7.asyncFunctions',
                        'regenerator',
                        'es7.classProperties'
                    ]
                },
                files:   [{
                    expand: true,
                    cwd:    './src/',
                    src:    './**/*.js',
                    dest:   './build/compat/'
                }]
            },
            build_binary: {
                options: {
                    optional: [
                        'runtime',
                        'spec.undefinedToVoid',
                        'minification.constantFolding',
                        'minification.propertyLiterals',
                        'es7.classProperties'
                    ]
                },
                files:   [{
                    expand: true,
                    cwd:    './bin/',
                    src:    './**/*.es6',
                    dest:   './bin/',
                    ext:    '.js'
                }]
            },
            build_tests:  {
                options: {
                    blacklist: [
                        'es3.memberExpressionLiterals',
                        'es3.propertyLiterals',
                        'regenerator', //es6.generators
                        'es6.properties.shorthand'
                    ],
                    optional:  [
                        'runtime',
                        'spec.undefinedToVoid',
                        'minification.constantFolding',
                        'minification.propertyLiterals'
                    ]
                },
                files:   [{
                    expand: true,
                    cwd:    './test/src/',
                    src:    './**/*.js',
                    dest:   './test/build/'
                }]
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
                    src: ['./build/**/*.js']
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

    grunt.registerTask( 'build', ['clean:build',
                                  'babel:build_modern',
                                  'babel:build_compat',
                                  'babel:build_binary',
                                  'usebanner:license'] );

    grunt.registerTask( 'build-tests', ['clean:tests', 'babel:build_tests'] );

    grunt.registerTask( 'default', ['build', 'build-tests'] );
};
