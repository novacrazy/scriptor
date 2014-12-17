/**
 * Created by novacrazy on 7/8/14.
 */

module.exports = function(grunt) {

    grunt.loadNpmTasks( 'grunt-ts' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-banner' );

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
                src:       ['./src/**/*.ts'],
                outDir:    './build/',
                reference: './src/reference.ts'
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
                    src: ['./build/**/*.js']
                }
            }
        },
        clean:     {
            build: {
                src: ['./build']
            }
        }
    } );

    grunt.registerTask( 'ts-build', ['clean:build', 'ts:build', 'usebanner:build_strict'] );
    grunt.registerTask( 'default', ['ts-build'] );
};
