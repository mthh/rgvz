## rgvz

### Instructions for developers/contributors:

##### Install node dependencies:
```
$ npm install
```

##### Run local server and watch source files and rebuild on change:
```
$ npm run dev
```

##### Only watch source files and rebuild on change (no local server):
```
$ npm run watch
```

##### Only build source file:
##### (and set environnement variable NODE_ENV on "production" to build a minified/uglified file)
```
$ npm run build
```
##### Coding style
The code use ES6 (Javascript 2015) features and follow AirBnb javascript style guide
(2-spaces indent,space before leading brace and opening parenthesis in control statements, etc.)
with some 4 amendments (allows camelcase, plusplus in for loop, dangling underscore and mixed operators).
See the .eslintrc.json file for details.

##### Browser compatibility
Code is transpiled to ES5 thanks to babel and the intended compatibility
is Firefox 21 / Chrome 23 / IE9.
