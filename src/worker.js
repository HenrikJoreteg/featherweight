import diff from 'virtual-dom/diff'
import serializePatch from 'vdom-serialized-patch/serialize'
import fromJson from 'vdom-as-json/fromJson'
import { FEATHER_INIT } from './index'

export default ({redux, view, workerContext, debug = false}) => {
  let currentVDom

  const render = () => {
    const state = redux.getState()
    let title
    let newVDom

    // our entire app in one line:
    const result = view(state)

    // allow main app to optionally return
    // {
    //   vdom: {{ VIRTUAL DOM }},
    //   title: {{ PAGE TITLE STRING }}
    // }
    if (result.hasOwnProperty('vdom')) {
      title = result.title
      newVDom = result.vdom
    } else {
      newVDom = result
    }

    // do the diff
    const patches = diff(currentVDom, newVDom)

    // cache last vdom so we diff against
    // the new one the next time through
    currentVDom = newVDom

    const message = {
      url: state.url,
      patches: serializePatch(patches)
    }

    if (title !== undefined) {
      message.title = title
    }

    // send patches and current url back to the main thread
    workerContext.postMessage(message)
  }

  workerContext.onmessage = ({data}) => {
    if (debug) console.log('action:', data)
    if (data.type === FEATHER_INIT) {
      currentVDom = fromJson(data.vdom)
    }

    // let redux do its thing
    redux.dispatch(data)
  }

  redux.subscribe(render)
}
