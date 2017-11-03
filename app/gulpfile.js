var gulp = require('gulp'),
  concat = require('gulp-concat'),
  watch = require('gulp-watch'),
  sourcemaps = require('gulp-sourcemaps')

var jsFiles = ['js/raje-core/init.js', 'js/raje-core/plugin/*.js'],
  jsDest = './js/raje-core';

gulp.task('watch', function () {
  gulp.watch(jsFiles, ['build']);
});

gulp.task('build', function () {
  return gulp.src(jsFiles)
    .pipe(sourcemaps.init())
    .pipe(concat('core.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(jsDest));
});