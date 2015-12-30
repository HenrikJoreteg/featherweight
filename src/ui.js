import virtualize from 'vdom-virtualize'
import toJson from 'vdom-as-json/toJson'
import applyPatch from 'vdom-serialized-patch/patch'
import { getLocalPathname } from 'local-links'

export default ({worker, rootElement}) => {
  // any time we get a message from the worker
  // it will be a set of "patches" to apply to
  // the real DOM. We do this on a requestAnimationFrame
  // for minimal impact
  worker.onmessage = ({data}) => {
    const { url, payload, pageTitle } = data
    window.requestAnimationFrame(() => {
      applyPatch(rootElement, payload)
    })
    // we only want to update the URL
    // if it's different than the current
    // URL. Otherwise we keep pushing
    // the same url to the history with
    // each render
    if (window.location.pathname !== url) {
      window.history.pushState(null, null, url)
    }

    // if page.title
    if (document.title !== pageTitle) {
      document.title = pageTitle
    }
  }

  // we start things off by sending a virtual DOM
  // representation of the *real* DOM along with
  // the current URL to our worker
  worker.postMessage({
    type: '@@feather/INIT',
    vdom: toJson(virtualize(rootElement))
  })

  // if the user hits the back/forward buttons
  // pass the new url to the worker
  window.addEventListener('popstate', () => {
    worker.postMessage({
      type: 'SET_URL',
      url: window.location.pathname
    })
  })

  // listen for all clicks globally
  rootElement.addEventListener('click', (event) => {
    // handles internal navigation defined as
    // clicks on <a> tags that have `href` that is
    // on the same origin.
    // https://www.npmjs.com/package/local-links
    const pathname = getLocalPathname(event)
    if (pathname) {
      // stop browser from following the link
      event.preventDefault()
      // instead, post the new URL to our worker
      // which will trigger compute a new vDom
      // based on that new URL state
      worker.postMessage({type: 'SET_URL', url: pathname})
      return
    }

    // this is for other "onClick" type events we want to
    // respond to. We check existance of an `data-click`
    // attribute and if it exists, post that back.
    const click = event.target['data-click']
    if (click) {
      event.preventDefault()
      worker.postMessage(click)
    }
  })
}
