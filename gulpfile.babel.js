/**
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

'use strict';

// This gulpfile makes use of new JavaScript features.
// Babel handles this without us having to do anything. It just works.
// You can read more about the new JavaScript features here:
// https://babeljs.io/docs/learn-es2015/

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import swPrecache from 'sw-precache';
import gulpLoadPlugins from 'gulp-load-plugins';
import ngrok from 'ngrok';
import {output as pagespeed} from 'psi';
import pkg from './package.json';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

function logUrl(urlLogInfo) {
	let length = urlLogInfo.length;
	console.log("=".repeat(length));
	console.log(urlLogInfo);
	console.log("=".repeat(length));
}

// Lint JavaScript
gulp.task('lint', () => {
	const eslintOptions = {
		"env": {
			"browser": true,
			"node": true,
			"es6": true,
			"jest": true
		},
		"rules": {
			"linebreak-style": 0,
			"no-unused-vars": 0,
			"indent": 0,
			"no-mixed-spaces-and-tabs": 0,
			"eol-last": 0,
			"require-jsdoc": 0,
			"no-trailing-spaces": 0,
			"max-len": 0,
			"quotes": 0,
			"no-multiple-empty-lines": 0,
			"no-multi-spaces": 0,
			"one-var": 0,
			"spaced-comment": 0,
			"arrow-parens": 0
		}
	};
	gulp.src(['app/scripts/**/*.js', '!app/scripts/**/*.min.js'])
		.pipe($.eslint(eslintOptions))
		.pipe($.eslint.format())
		.pipe($.if(!browserSync.active, $.eslint.failOnError()));
});

// Optimize images
gulp.task('images', () => {
	const imageminOptions = {
		progressive: true,
		interlaced: true,
		svgoPlugins: [
			{removeViewBox: false},
			{cleanupIDs: false}
		]
	};

	return gulp.src('app/images/**/*')
		.pipe($.cache($.imagemin(imageminOptions)))
		.pipe(gulp.dest('dist/images'))
		.pipe($.size({title: 'images'}));
});

// Copy all files at the root level (app)
gulp.task('copy', () => {
	return gulp.src([
		'app/**/*',
		'app/fonts/**/*',
		'!app/index.html',
		'!app/scripts',
		'!app/images',
		'!app/scss',
		'!app/styles',
		'node_modules/apache-server-configs/dist/.htaccess'
		], {dot: true})
			.pipe(gulp.dest('dist'))
			.pipe($.size({title: 'copy'}));
});

// Compile and automatically prefix stylesheets
gulp.task('styles', () => {
	const AUTOPREFIXER_BROWSERS = [
		'ie >= 9',
		'ie_mob >= 10',
		'ff >= 26',
		'chrome >= 30',
		'safari >= 7',
		'opera >= 23',
		'ios >= 7',
		'android >= 4.4',
		'bb >= 10'
	];

  // For best performance, don't add Sass partials to `gulp.src`, only add SCSS root file
	return gulp.src('app/scss/main.scss')
		.pipe($.newer('app/styles'))
		.pipe($.sass({
			precision: 10
		}).on('error', $.sass.logError))
		.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
		.pipe(gulp.dest('app/styles'))
		// Concatenate and minify styles
		.pipe($.if('*.css', $.cssnano()))
		.pipe($.size({title: 'styles'}));
});

// Concatenate and minify JavaScript. Optionally transpiles ES2015 code to ES5.
// to enables ES2015 support remove the line `"only": "gulpfile.babel.js",` in the
// `.babelrc` file.
gulp.task('scripts', () => {
	 gulp.src(['app/scripts/main.js'
		// Other scripts
	 ])
		.pipe($.newer('app/scripts'))
		.pipe($.sourcemaps.init())
		.pipe($.babel())
		.pipe($.sourcemaps.write())
		.pipe(gulp.dest('app/scripts'))
		.pipe($.concat('main.min.js'))
		.pipe($.uglify({preserveComments: 'some'}))
		// Output files
		.pipe($.size({title: 'scripts'}))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('dist/scripts'))
});

// Scan your HTML for assets & optimize them
gulp.task('useref', () => {
	const htmlminOptions = {
		removeComments: true,
		collapseWhitespace: true,
		collapseBooleanAttributes: true,
		removeAttributeQuotes: true,
		removeRedundantAttributes: true,
		removeEmptyAttributes: true,
		removeScriptTypeAttributes: true,
		removeStyleLinkTypeAttributes: true,
		removeOptionalTags: true
	};

	const uncssOptions = {
		html: [
			'app/index.html'
		],
		// CSS Selectors for UnCSS to ignore
		ignore: []
	};

	return gulp.src('app/**/*.html')
		.pipe($.useref())
		// Remove any unused CSS
		.pipe($.if('*.css', $.uncss(uncssOptions)))

		// Concatenate and minify styles
		// In case you are still using useref build blocks
		.pipe($.if('*.css', $.cssnano()))

		// Minify any HTML
		.pipe($.if('*.html', $.htmlmin(htmlminOptions)))
		// Output files
		.pipe($.if('*.html', $.size({title: 'html', showFiles: true})))

		.pipe($.if('*.js', $.uglify()))
		.pipe(gulp.dest('dist'));
});

// Clean output directory
gulp.task('clean', () => del(['.tmp', 'dist/*', '!dist/.git'], {dot: true}));

// Watch files for changes & reload
gulp.task('run', ['styles'], () => {
	browserSync.init({
		// Customize the Browsersync console logging prefix
		logPrefix: 'DEV',
		online: false,

		// Allow scroll syncing across breakpoints
		// scrollElementMapping: ['main', '.mdl-layout'],
		// Run as an https by uncommenting 'https: true'
		// Note: this uses an unsigned certificate which on first access
		//       will present a certificate warning in the browser.
		// https: true,
		server: { baseDir: 'app' },
		port: 8009,
		ui: { port: 13093 }
	});
	ngrok.connect(8009, (err, url) => {
	  	if (!err) {
			logUrl(`|   Your web app is currently available on ${url}   |`);
	  	}
	});

	gulp.watch(['app/**/*.html'], reload);
	gulp.watch(['app/scss/**/*.scss'], ['styles', reload]);
	gulp.watch(['app/scripts/**/*.js'], ['lint', reload]);
	gulp.watch(['app/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('run:dist', ['default'], () => {
  	browserSync({
	 	notify: false,
	 	online: false,
	 	logPrefix: 'DIST',
	 	// Allow scroll syncing across breakpoints
	 	// scrollElementMapping: ['main', '.mdl-layout'],
	 	// Run as an https by uncommenting 'https: true'
	 	// Note: this uses an unsigned certificate which on first access
	 	//       will present a certificate warning in the browser.
	 	// https: true,
	 	server: 'dist',
	 	port: 8010
  	});
  	ngrok.connect(8010, (err, url) => {
  	  	if (!err) {
  	  		logUrl(`|   Your web app is currently available on ${url}   |`);
  	  	}
  	});
});

// Run the production version without rebuilding it (you need to make sure that it's already built)
gulp.task('run-only', () => {
  	browserSync({
	 	notify: false,
	 	online: false,
	 	logPrefix: 'DIST',
	 	// Allow scroll syncing across breakpoints
	 	// scrollElementMapping: ['main', '.mdl-layout'],
	 	// Run as an https by uncommenting 'https: true'
	 	// Note: this uses an unsigned certificate which on first access
	 	//       will present a certificate warning in the browser.
	 	// https: true,
	 	server: 'dist',
	 	port: 8011
  	});
  	ngrok.connect(8011, (err, url) => {
  	  	if (!err) {
  	  		logUrl(`|   Your web app is currently available on ${url}   |`);
  	  	}
  	});
});

// Build production files, the default task
gulp.task('default', ['clean'], cb => {
	runSequence(
		'styles',
		['lint', 'useref', 'images'],
		'copy',
		'generate-service-worker',
		cb
	);
});

// Run PageSpeed Insights
gulp.task('pagespeed', cb => {
	// Update the below URL to the public URL of your site
	pagespeed('example.com', {
		strategy: 'mobile'
		// By default we use the PageSpeed Insights free (no API key) tier.
		// Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
		// key: 'YOUR_API_KEY'
	}, cb);
});

// Copy over the scripts that are used in importScripts as part of the generate-service-worker task.
gulp.task('copy-sw-scripts', () => {
	return gulp.src(['node_modules/sw-toolbox/sw-toolbox.js', 'app/scripts/sw/runtime-caching.js'])
		.pipe(gulp.dest('dist/scripts/sw'));
});

// See http://www.html5rocks.com/en/tutorials/service-worker/introduction/ for
// an in-depth explanation of what service workers are and why you should care.
// Generate a service worker file that will provide offline functionality for
// local resources. This should only be done for the 'dist' directory, to allow
// live reload to work as expected when serving from the 'app' directory.
gulp.task('generate-service-worker', ['copy-sw-scripts'], () => {
	const rootDir = 'dist';
	const filepath = path.join(rootDir, 'service-worker.js');

	return swPrecache.write(filepath, {
		// Used to avoid cache conflicts when serving on localhost.
		cacheId: pkg.name || 'web-starter-kit',
		// sw-toolbox.js needs to be listed first. It sets up methods used in runtime-caching.js.
		importScripts: [
			'scripts/sw/sw-toolbox.js',
			'scripts/sw/runtime-caching.js'
		],
		staticFileGlobs: [
			// Add/remove glob patterns to match your directory setup.
			`${rootDir}/images/**/*`,
			`${rootDir}/scripts/**/*.js`,
			`${rootDir}/styles/**/*.css`,
			`${rootDir}/*.{html,json}`
		],
		// Translates a static file path to the relative URL that it's served from.
		// This is '/' rather than path.sep because the paths returned from
		// glob always use '/'.
		stripPrefix: rootDir + '/'
	});
});

// Load custom tasks from the `tasks` directory
// Run: `npm install --save-dev require-dir` from the command-line
// try { require('require-dir')('tasks'); } catch (err) { console.error(err); }
