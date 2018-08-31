const cleanCss = require('gulp-clean-css');
const concat = require('gulp-concat');
const del = require('del');
const ejs = require('gulp-ejs');
const fs = require('fs');
const gls = require('gulp-live-server');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const log = require('fancy-log');
const highlight = require('highlight.js');
const htmlHint = require('gulp-htmlhint');
const jsHint = require('gulp-jshint');
const marked = require('marked');
const mergeStream = require('merge-stream');
const open = require('gulp-open');
const prettify = require('gulp-prettify');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const w3cJs = require('gulp-w3cjs');
const yaml = require('js-yaml');

const pkg = require('./package.json');
const port = 4567;
const htmlHintConfig = {
    'attr-value-double-quotes': false
};
const jsHintConfig = {
    jquery: true,
    browser: true,
    undef: true,
    unused: true,
    globals: {
        setupLanguages: false,
        toc: false
    }
};
const renderer = new marked.Renderer();
let compress = true;

const jsFiles = {
    libs: [
        './source/javascripts/lib/_energize.js',
        './source/javascripts/lib/_jquery.js',
        './source/javascripts/lib/_jquery_ui.js',
        './source/javascripts/lib/_jquery.tocify.js',
        './source/javascripts/lib/_imagesloaded.min.js',
    ],
    scripts: [
        './source/javascripts/app/_lang.js',
        './source/javascripts/app/_toc.js',
    ],
    search: [
        './source/javascripts/lib/_lunr.js',
        './source/javascripts/lib/_jquery.highlight.js',
        './source/javascripts/app/_search.js'
    ]
};

renderer.code = function (code, language) {
    const highlighted = language ? highlight.highlight(language, code).value :
        highlight.highlightAuto(code).value;
    return '<pre class="highlight ' + language + '"><code>' + highlighted + '</code></pre>';
};

function readIndexYml() {
    return yaml.safeLoad(fs.readFileSync('./source/index.yml', 'utf8'));
}

function getPageData() {
    const config = readIndexYml();
    const includes = config.includes
        .map(function (include) {
            return './source/includes/' + include + '.md';
        })
        .map(function (include) {
            return fs.readFileSync(include, 'utf8');
        })
        .map(function (include) {
            return marked(include, {
                renderer: renderer
            });
        });
    return {
        current_page: {
            data: config
        },
        page_classes: '',
        includes: includes,
        image_tag: function (filename) {
            const code = filename.split('.')[0];
            return '<img alt=' + code + ' class=image-' + code + ' src=images/' + filename + '>';
        },
        javascript_include_tag: function (name) {
            return '<script src="javascripts/' + name + '.js"></script>';
        },
        stylesheet_link_tag: function (name, media) {
            return '<link href="stylesheets/' + name + '.css" rel="stylesheet" media="' + media + '">';
        },
        langs: (config.language_tabs || []).map(function (lang) {
            return typeof lang == 'string' ? lang : lang.keys.first;
        })
    };
}

const task = {
    clean: function () {
        console.log(pkg.name, 'v' + pkg.version);
        return del(['build/*']);
    },
    runStaticAnalysis: function () {
        function ignoreDuplicateIds(type, message) {
            return !/^Duplicate ID/.test(message);
        }
        return mergeStream(
            gulp.src('build/index.html')
            .pipe(w3cJs({
                verifyMessage: ignoreDuplicateIds
            }))
            .pipe(w3cJs.reporter())
            .pipe(htmlHint(htmlHintConfig))
            .pipe(htmlHint.reporter()),
            gulp.src(jsFiles.scripts)
            .pipe(jsHint(jsHintConfig))
            .pipe(jsHint.reporter())
        );
    },
    buildFonts: function () {
        return gulp.src('./source/fonts/**/*')
            .pipe(gulp.dest('build/fonts'));
    },
    buildImages: function () {
        return gulp.src('./source/images/**/*')
            .pipe(gulp.dest('build/images'));
    },
    buildJs: function () {
        const config = readIndexYml();
        return gulp.src(jsFiles.libs.concat(config.search ? jsFiles.search : [], jsFiles.scripts))
            .pipe(concat('all.js'))
            .pipe(gulpIf(compress, uglify()))
            .pipe(gulp.dest('./build/javascripts'));
    },
    buildCss: function () {
        return gulp.src('./source/stylesheets/*.css.scss')
            .pipe(sass().on('error', sass.logError))
            .pipe(rename({
                extname: ''
            }))
            .pipe(gulpIf(compress, cleanCss()))
            .pipe(gulp.dest('./build/stylesheets'));
    },
    addHighlightStyle: function () {
        const config = readIndexYml();
        const path = './node_modules/highlight.js/styles/' + config.highlight_theme + '.css';
        return gulp.src(path)
            .pipe(rename({
                prefix: 'highlight-'
            }))
            .pipe(gulpIf(compress, cleanCss()))
            .pipe(gulp.dest('./build/stylesheets'));
    },
    buildHtml: function () {
        const data = getPageData();
        return gulp.src('./source/*.html')
            .pipe(ejs(data).on('error', log.error))
            .pipe(gulpIf(compress, prettify({
                indent_size: 3
            })))
            .pipe(gulp.dest('./build'));
    },
    build() {
        return mergeStream(
            task.buildFonts(),
            task.buildImages(),
            task.buildJs(),
            task.buildCss(),
            task.addHighlightStyle(),
            task.buildHtml()
        );
    }
};

function disableCompress() {
    compress = false;
}

function runServer() {
    gulp.watch(['./source/*.html', './source/includes/**/*'], ['html']);
    gulp.watch('./source/javascripts/**/*', ['js']);
    gulp.watch('./source/stylesheets/**/*', ['sass']);
    gulp.watch('./source/index.yml', ['highlightjs', 'js', 'html']);
    const server = gls.static('build', port);
    server.start();

    function notifyServer(file) {
        server.notify.apply(server, [file]);
    }
    gulp.watch('build/**/*', notifyServer);
    gulp.src(__filename).pipe(open({
        uri: 'http://localhost:' + port
    }));
}

gulp.task('clean', task.clean);
gulp.task('lint', task.runStaticAnalysis);
gulp.task('build-static-site', task.build);
gulp.task('disable-compress', disableCompress);
gulp.task('serve', gulp.series(['disable-compress', 'build-static-site']), runServer);