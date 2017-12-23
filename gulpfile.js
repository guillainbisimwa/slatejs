const fs =        require('fs');
const gulp =      require('gulp');
const cleanCss =  require('gulp-clean-css');
const concat =    require('gulp-concat');
const ejs =       require('gulp-ejs');
const gls =       require('gulp-live-server');
const gulpif =    require('gulp-if');
const open =      require('gulp-open');
const prettify =  require('gulp-prettify');
const rename =    require('gulp-rename');
const sass =      require('gulp-sass');
const uglify =    require('gulp-uglify');
const gutil =     require('gulp-util');
const del =       require('del');
const highlight = require('highlight.js');
const marked =    require('marked');
const yaml =      require('js-yaml');

const renderer = new marked.Renderer();
let COMPRESS = true;

renderer.code = function(code, language) {
   const highlighted = language ? highlight.highlight(language, code).value :
      highlight.highlightAuto(code).value;
   return '<pre class="highlight ' + language + '"><code>' + highlighted + '</code></pre>';
   };

const readIndexYml = function() {
   return yaml.safeLoad(fs.readFileSync('./source/index.yml', 'utf8'));
   };

const getPageData = function() {
   const config = readIndexYml();
   const includes = config.includes
      .map(function(include) { return './source/includes/' + include + '.md'; })
      .map(function(include) { return fs.readFileSync(include, 'utf8'); })
      .map(function(include) { return marked(include, { renderer: renderer }); });
   return {
      current_page: { data: config },
      page_classes: '',
      includes: includes,
      image_tag: function(filename, alt, className) {
         return '<img alt="' + alt + '" class="' + className + '" src="images/' + filename + '">';
         },
      javascript_include_tag: function(name) {
         return '<script src="javascripts/' + name + '.js" type="text/javascript"></script>';
         },
      stylesheet_link_tag: function(name, media) {
         return '<link href="stylesheets/' + name + '.css" rel="stylesheet" type="text/css" media="' + media + '" />';
         },
      langs: (config.language_tabs || []).map(function(lang) {
         return typeof lang == 'string' ? lang : lang.keys.first;
         })
      };
   };

gulp.task('clean', function() {
   return del(['build/*']);
   });

gulp.task('fonts', function() {
   return gulp.src('./source/fonts/**/*')
      .pipe(gulp.dest('build/fonts'));
   });

gulp.task('images', function() {
   return gulp.src('./source/images/**/*')
      .pipe(gulp.dest('build/images'));
   });

gulp.task('js', function() {
   const config = readIndexYml();
   const libs = [
      './source/javascripts/lib/_energize.js',
      './source/javascripts/lib/_jquery.js',
      './source/javascripts/lib/_jquery_ui.js',
      './source/javascripts/lib/_jquery.tocify.js',
      './source/javascripts/lib/_imagesloaded.min.js',
      ];
   const scripts = [
      './source/javascripts/app/_lang.js',
      './source/javascripts/app/_toc.js',
      ];
   if (config.search) {
      libs.push('./source/javascripts/lib/_lunr.js');
      libs.push('./source/javascripts/lib/_jquery.highlight.js');
      libs.push('./source/javascripts/app/_search.js');
      }
   return gulp.src(libs.concat(scripts))
      .pipe(concat('all.js'))
      .pipe(gulpif(COMPRESS, uglify()))
      .pipe(gulp.dest('./build/javascripts'));
   });

gulp.task('sass', function() {
   return gulp.src('./source/stylesheets/*.css.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(rename({ extname: ''}))
      .pipe(gulpif(COMPRESS, cleanCss()))
      .pipe(gulp.dest('./build/stylesheets'));
   });

gulp.task('highlightjs', function() {
   const config = readIndexYml();
   const path = './node_modules/highlight.js/styles/' + config.highlight_theme + '.css';
   return gulp.src(path)
      .pipe(rename({ prefix: 'highlight-'}))
      .pipe(gulpif(COMPRESS, cleanCss()))
      .pipe(gulp.dest('./build/stylesheets'));
   });

gulp.task('html', function() {
   const data = getPageData();
   return gulp.src('./source/*.html')
      .pipe(ejs(data).on('error', gutil.log))
      .pipe(gulpif(COMPRESS, prettify({ indent_size: 3 })))
      .pipe(gulp.dest('./build'));
   });

gulp.task('NO_COMPRESS', function() {
   COMPRESS = false;
   });

gulp.task('default', ['clean', 'fonts', 'images', 'highlightjs', 'js', 'sass', 'html']);
gulp.task('serve', ['NO_COMPRESS', 'default'], function() {
   gulp.watch(['./source/*.html', './source/includes/**/*'], ['html']);
   gulp.watch('./source/javascripts/**/*', ['js']);
   gulp.watch('./source/stylesheets/**/*', ['sass']);
   gulp.watch('./source/index.yml', ['highlightjs', 'js', 'html']);
   const server = gls.static('build', 4567);
   server.start();
   gulp.watch(['build/**/*'], function(file) {
      server.notify.apply(server, [file]);
      });
   gulp.src(__filename).pipe(open({ uri: 'http://localhost:4567' }));
   });
