'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

var styles = './css/*.sass'

gulp.task('sass', function () {
  return gulp.src(styles)
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./css'));
});

gulp.task('watch', function () {
  gulp.watch(styles, ['sass']);
})