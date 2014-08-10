/**
 * Created by novacrazy on 8/9/14.
 */


module.exports = function(grunt) {

    grunt.loadNpmTasks( 'grunt-ts' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );


    grunt.initConfig( {
        ts:    {
            options: {
                target:         'es5',
                module:         'commonjs',
                sourceMap:      false,
                declaration:    false,
                removeComments: false
            },
            build:   {
                src:       ['!./src/reference.ts', './src/**/*.ts'],
                outDir:    './',
                reference: './src/reference.ts'
            }
        },
        clean: {
            build:   {
                src: ['./lib/**/*.js', './test']
            },
            post:    {
                src: ['./**/.baseDir.*', './reference.js']
            },
            release: {
                src: ['./.tscache']
            }
        }
    } );

    grunt.registerTask( 'build', ['clean:build', 'ts:build', 'clean:post'] );

    grunt.registerTask( 'release', ['build', 'clean:release'] );

    grunt.registerTask( 'default', ['build'] );
};
