# featherweight

**PLEASE NOTE:** This is all highly experimental, I've not built anything major with this and there are holes in functionality and unsolved problems related to events. Also, just because I'm open sourcing doesn't mean I'll maintain it for you or do anything else with it, ever. This is a pure experiment at this point. I'm simply sharing it in the spirit of open source in case anyone finds it interesting.

![](https://img.shields.io/npm/dm/featherweight.svg)![](https://img.shields.io/npm/v/featherweight.svg)![](https://img.shields.io/npm/l/featherweight.svg)

The basic ideas of featherweight can be summarized as follows:

1. The UI of your app is a pure function of the current application state
2. All state lives in [Redux](https://github.com/rackt/redux)
3. 99% of your app code runs in a web worker
4. No fancy router, the url is just another piece of state
5. Pre-render as much HTML as possible before sending to the client
6. JS "takes over" on the clientside as soon as it's loaded.
7. All code necessary to do the above should be < 10kb min + gzipped


## understanding the application pattern

Unlike most apps featherweight is designed for running in a web worker. This means all the work of rendering, virtual dom generation, virtual dom diffing, and fetching data all happen in a Web Worker. 

**This leaves the main thread free to focus entirely on efficient DOM updates and listening for user interractions.**

It consists of two primary components:

1. The worker code: `import { worker } from 'featherweight'`
2. The main thread (ui thread) code: `import { ui } from 'featherweight'`


### Setting up the main thread

This does practically nothing, featherweight's `ui` handles most of this for you. The only custom code you need here, may be to import whatever styles you want (if you're using webpack).

Typically, it should look like this:

```js
// import the ui module
import { ui } from 'featherweight'

// import your worker code
import WorkerThread from './worker.thread'

// possibly import styles if you're using some sort of css/style loader with webpack
import './styles/main.styl'

ui({
  // pass it the worker thread
  worker: new WorkerThread(),

  // Pass in the root element where you
  // want the app to live. It's recommended
  // that this be something other than the
  // <body> in case other libraries or
  // browser plugins need to insert elements, etc,
  rootElement: document.body.firstChild
})
```

### setting up the worker thread

Here's where all the work happens, but again, most of your efforts will go into writing the Redux reducers and UI code.

The boilerplate inside the worker is pretty straight forward:

```js
// worker.thread.js
import { worker } from 'featherweight'
import appView from './views/app'
import configureRedux from './configureRedux'

worker({
  // pass it your redux main store
  // here we assume we're setting up
  // redux and it's reducers in another module
  // that exports a function we can use to
  // get the configured redux instance
  redux: configureRedux(),

  // This is the main application UI component that
  // you'll write. It should be a pure function returning
  // a new virtual DOM when passed the main application state
  // object we get from Redux. 
  view: appView,

  // To keep things easy to trace we also want to 
  // explicitily  pass in the reference to the worker
  // context. This will always just be `self`. 
  // 
  // If you're unfamiliar with this concept, it's just 
  // something that exists within all Web Workers. 
  // 
  // featherweight needs this in order to be able to listen for
  // and send DOM updates back to the ui thread.
  workerContext: self
})
```

### Writing the UI components

Feather components don't have state. **All state lives in Redux**, including the current URL of the app.

This means the entire UI needs to be a single pure function that takes the application state object and return a new virtual dom.

It's signature is simple:

```js
virtualDom = ui(state)
```

Of course, you still have to be able to break your application into small, modular components and show different things based on different urls. 

To address this, here's a super simple example:

```
import home from './home'
import about from './about'
import pageNotFound from './pageNotFound'

export default (state) => {
  // we just grab the `.url` property of state
  const { url } = state
  let page

  // We then grab a `page` component
  // conditionally based on that url
  if (url === '/') {
  	// here we can pass the state through
  	// if we'd like
    page = home(state)
  } else if (url === '/about') {
    // this page is just text content
    // so passing in state isn't necessary
    page = about()
  }

  // we could also handle URLs our app isn't
  // aware of with a fallback page
  if (!page) {
    page = pageNotFound()
  }

  // here we simply return the JSX and include
  // the `{page}` content as part of our layout
  return (
    // note that `main` here is just an HTML5 element
    // nothing special
    <main>
      <h1>Feather POC App</h1>
      <nav>
        <a href='/'>home</a> | <a href='/about'>about</a>
      </nav>
      {page}
    </main>
  )
}
```


### handling state

For cleanliness, I suggest setting up your Redux in a separate file.

That file may look something like this:

```js
import { createStore } from 'redux'
import * as reducers from './reducers/index'

export default () => {
  return createStore(reducers)
}

```

### pre-rendering at build time or as part of a server response

Because your app UI is a pure function, turning your view into HTML is quite simple.

Simply call your apps main UI function passing in whatever state you'd like to render to generate virtual DOM. 

Then you can use the `vdom-to-html` module from npm to generate an HTML string.


```js
import toHtml from 'vdom-to-html'
import app from './views/app'

// wherever you want to create the HTML string
const renderedHtml = toHtml(app({url: '/about'}))

```


### featherweight patterns

1. Under no circumstances should your complete app weigh more than 60 kb min+gzip JS. Ideally, much less.
1. **every. single. piece. of. state. lives. in. redux**
2. Leave the main thread alone
3. Never touch the DOM directly
4. The UI thread does nothing other than apply DOM updates and post events back to the worker thread
5. Never use `this`
6. Never use `function` use `() => {}` for everything
7. The UI is a pure function
8. There are no stateful components
9. Pretty much everything is a pure function 
10. Name all your modules with camelCase file names
11. Use [standard](https://github.com/feross/standard) for code style
12. The build step should turn your app into a set of static HTML, CSS, and JS files.

## install

```
npm install featherweight
```

## credits

If you like this follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter.

## license

[MIT](http://mit.joreteg.com/)

