import diff from 'virtual-dom/diff'
import serializePatch from 'vdom-serialized-patch/serialize'
import fromJson from 'vdom-as-json/fromJson'

export default ({redux, view, workerContext}) => {
  let currentVDom
  let renderCount = 0

  const render = () => {
    const state = redux.getState()
    // our entire app in one line:
    const newVDom = view(state)

    // do the diff
    const patches = diff(currentVDom, newVDom)

    // cache last vdom so we diff against
    // the new one the next time through
    currentVDom = newVDom

    // just for fun
    console.log('render count:', ++renderCount)

    // send patches and current url back to the main thread
    workerContext.postMessage({
      url: state.url,
      title: state.title,
      patches: serializePatch(patches)
    })
  }

  workerContext.onmessage = ({data}) => {
    if (data.type === '@@feather/INIT') {
      currentVDom = fromJson(data.vdom)
    }

    // let redux do its thing
    redux.dispatch(data)
  }

  redux.subscribe(render)
}
