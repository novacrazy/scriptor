/**
 * Created by novacrazy on 7/8/14.
 */

module.exports = function(grunt) {

    grunt.loadNpmTasks( 'grunt-ts' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-banner' );

    var LICENSE = '/****\n * ' + grunt.file.read( './LICENSE', {encoding: 'utf-8'} ).replace( /\n/ig, '\n * ' )
                  + '\n ****/';

    grunt.initConfig( {
        ts:        {
            options: {
                target:         'es5',
                module:         'commonjs',
                sourceMap:      false,
                declaration:    false,
                removeComments: false
            },
            'build': {
                src:       ['./ts_src/**/*.ts'],
                outDir:    './ts_build/',
                reference: './ts_src/reference.ts'
            }
        },
        usebanner: {
            build_strict: {
                options: {
                    position:  'top',
                    banner:    '"use strict";',
                    linebreak: true
                },
                files:   {
                    src: ['./ts_build/**/*.js']
                }
            },
            license:      {
                options: {
                    position:  'top',
                    banner:    LICENSE,
                    linebreak: true
                },
                files:   {
                    src: ['./ts_build/**/*.js']
                }
            }
        },
        clean:     {
            build: {
                src: ['./ts_build']
            }
        }
    } );

    grunt.registerTask( 'ts-build', ['clean:build', 'ts:build', 'usebanner:build_strict', 'usebanner:license'] );
    grunt.registerTask( 'default', ['ts-build'] );
};
