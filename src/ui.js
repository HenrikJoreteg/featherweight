import virtualize from 'vdom-virtualize'
import toJson from 'vdom-as-json/toJson'
import applyPatch from 'vdom-serialized-patch/patch'
import { getLocalPathname } from 'local-links'

export default ({worker, rootElement}) => {
  let firstChild = rootElement.firstChild

  if (!firstChild) {
    firstChild = document.createElement('div')
    rootElement.appendChild(firstChild)
  }
  // any time we get a message from the worker
  // it will be a set of "patches" to apply to
  // the real DOM. We do this on a requestAnimationFrame
  // for minimal impact
  worker.onmessage = ({data}) => {
    const { url, title, patches } = data
    window.requestAnimationFrame(() => {
      applyPatch(rootElement.firstChild, patches)
    })
    // we only want to update the URL
    // if it's different than the current
    // URL. Otherwise we'd keep pushing
    // the same url to the history with
    // each render
    if (window.location.pathname !== url) {
      window.history.pushState(null, null, url)
    }

    // if page title
    if (document.title !== title) {
      document.title = title
    }
  }

  // we start things off by sending a virtual DOM
  // representation of the *real* DOM along with
  // the current URL to our worker
  worker.postMessage({
    type: '@@feather/INIT',
    vdom: toJson(virtualize(firstChild)),
    url: window.location.pathname
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

  rootElement.addEventListener('submit', (event) => {
    const { target } = event
    const formAction = target['data-action']
    if (!formAction) {
      return
    }

    event.preventDefault()
    const data = {}
    const l = target.length
    for (let i = 0; i < l; i++) {
      const input = target[i]
      if (input.name) {
        data[input.name] = input.value
      }
    }
    worker.postMessage({type: formAction, data})
  })
}
