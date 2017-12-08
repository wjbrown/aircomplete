module.exports = function(grunt) {
    
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        cssmin: {
            target: {
                files: [{
                    expand: true,
                    src   : ['css/*.css', 'css/!*.min.css'],
                    dest  : 'dist/',
                    ext   : '.min.css',
                    extDot: 'last'
                }]
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'dist/js/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
            all: ['Gruntfile.js', 'src/**/*.js'],
            options: {
                // ignore defensive semicolon
                "-W032": true
            }
        },
        jscs: {
            src: "src/*.js",
            options: {
                config: ".jscs",
                esnext: false,
                verbose: true,
                fix: false,
                requireCurlyBraces: [ "if" ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', ['cssmin', 'jscs', 'jshint', 'uglify']);
    
};