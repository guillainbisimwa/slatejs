// node-slate

// Imports
import browserSync  from 'browser-sync';
import cleanCss     from 'gulp-clean-css';
import concat       from 'gulp-concat';
import ejs          from 'gulp-ejs';
import gulp         from 'gulp';
import gulpIf       from 'gulp-if';
import highlight    from 'highlight.js';
import jsHint       from 'gulp-jshint';
import log          from 'fancy-log';
import mergeStream  from 'merge-stream';
import path         from 'path';
import prettify     from 'gulp-prettify';
import rename       from 'gulp-rename';
import sassCompiler from 'sass';
import sassPlugin   from 'gulp-sass';
import uglify       from 'gulp-uglify';
import yaml         from 'js-yaml';
import { marked } from 'marked';
import { readFileSync, writeFileSync } from 'fs';

// Setup
const port = 4567;
const sass = sassPlugin(sassCompiler);
const jsHintConfig = {
   jquery:  true,
   browser: true,
   undef:   true,
   unused:  true,
   };
const settings = {
   compress: true,
   };
const jsFiles = {
   libs: [
      'node_modules/jquery/dist/jquery.js',
      'node_modules/jquery-ui-dist/jquery-ui.js', //not ideal: https://stackoverflow.com/q/34219046
      'source/javascripts/lib/_jquery.tocify.js',
      'node_modules/tocbot/dist/tocbot.js',  //see: https://github.com/center-key/node-slate/issues/8
      'node_modules/imagesloaded/imagesloaded.pkgd.js',
      ],
   scripts: [
      'source/javascripts/app/_lang.js',
      'source/javascripts/app/_toc.js',
      ],
   search: [
      'node_modules/fuse.js/dist/fuse.js',
      'node_modules/jquery-highlight/jquery.highlight.js',
      'source/javascripts/app/_search.js',
      ],
   };

// Helper functions
const renderer = new marked.Renderer();
renderer.code = (code, language) => {
   const highlighted = language ? highlight.highlight(code, { language: language }).value :
      highlight.highlightAuto(code).value;
   return `<pre class="highlight ${language}"><code>${highlighted}</code></pre>`;
   };
const readIndexYml = () => yaml.load(readFileSync('source/index.yml', 'utf8'));
const getPageData = () => {
   const config = readIndexYml();
   const includes = config.includes
      .map(include => `source/includes/${include}.md`)
      .map(include => readFileSync(include, 'utf8'))
      .map(include => marked(include, { renderer: renderer }));
   const code = (filename) => filename.split('.')[0];
   const getPageData = {
      current_page: { data: config },
      page_classes: '',
      includes: includes,
      image_tag: (filename) =>
         `<img alt=${code(filename)} class=image-${code(filename)} src=images/${filename}>`,
      javascript_include_tag: (name) =>
         `<script src=javascripts/${name}.js></script>\n`,
      stylesheet_link_tag: (name, media) =>
         `<link href=stylesheets/${name}.css rel=stylesheet media=${media}>`,
      langs: (config.language_tabs || []).map(
         lang => typeof lang === 'string' ? lang : lang.keys.first),
      };
   return getPageData;
   };

// Tasks
const task = {
   runStaticAnalysis: () => {
      return gulp.src(jsFiles.scripts)
         .pipe(jsHint(jsHintConfig))
         .pipe(jsHint.reporter());
      },
   buildFonts: () => {
      return gulp.src('source/fonts/**/*')
         .pipe(gulp.dest('build/fonts'));
      },
   buildImages: () => {
      return gulp.src('source/images/**/*')
         .pipe(gulp.dest('build/images'));
      },
   buildJs: () => {
      const config = readIndexYml();
      return gulp.src(jsFiles.libs.concat(config.search ? jsFiles.search : [], jsFiles.scripts))
         .pipe(concat('all.js'))
         .pipe(gulpIf(settings.compress, uglify()))
         .pipe(gulp.dest('build/javascripts'));
      },
   buildCss: () => {
      return gulp.src('source/stylesheets/*.css.scss')
         .pipe(sass().on('error', sass.logError))
         .pipe(rename({ extname: '' }))
         .pipe(gulpIf(settings.compress, cleanCss()))
         .pipe(gulp.dest('build/stylesheets'));
      },
   addHighlightStyle: () => {
      const config = readIndexYml();
      const cssPath = 'node_modules/highlight.js/styles/' + config.highlight_theme + '.css';
      return gulp.src(cssPath)
         .pipe(rename({ prefix: 'highlight-' }))
         .pipe(gulpIf(settings.compress, cleanCss()))
         .pipe(gulp.dest('build/stylesheets'));
      },
   buildHtml: () => {
      const data = getPageData();
      return gulp.src('source/*.html')
         .pipe(ejs(data).on('error', log.error))
         .pipe(gulpIf(settings.compress, prettify({ indent_size: 3 })))
         .pipe(gulp.dest('build'));
      },
   build: () => {
      return mergeStream(
         task.buildFonts(),
         task.buildImages(),
         task.buildJs(),
         task.buildCss(),
         task.addHighlightStyle(),
         task.buildHtml(),
         );
      },
   buildUncompressed: () => {
      settings.compress = false;
      return task.build();
      },
   runServer: () => {
      gulp.watch('source/*.html',           gulp.parallel('build-html'));
      gulp.watch('source/includes/**/*',    gulp.parallel('build-html'));
      gulp.watch('source/javascripts/**/*', gulp.parallel('build-js'));
      gulp.watch('source/stylesheets/**/*', gulp.parallel('build-css'));
      gulp.watch('source/index.yml',        gulp.parallel('build-highlightjs', 'build-js', 'build-html'));
      const server = browserSync.create();
      server.init({
         open:      true,
         ui:        false,
         listen:    'localhost',
         port:      port,
         server:    { baseDir: '.' },
         startPath: 'build',
         });
      gulp.watch('build/**/*').on('change', server.reload);
      console.log('Slate markdown source:');
      console.log(path.resolve('source'));
      },
   publishToDocs: () => {
      // mkdirSync('docs');
      writeFileSync('docs/CNAME', 'node-slate.js.org\n');
      return gulp.src('build/**/*')
         .pipe(gulp.dest('docs'));
      },
   };

// Gulp
gulp.task('lint',               task.runStaticAnalysis);
gulp.task('build-js',           task.buildJs);
gulp.task('build-css',          task.buildCss);
gulp.task('build-html',         task.buildHtml);
gulp.task('build-highlightjs',  task.addHighlightStyle);
gulp.task('build-static-site',  task.build);
gulp.task('build-uncompressed', task.buildUncompressed);
gulp.task('serve',              task.runServer);
gulp.task('publish',            task.publishToDocs);
