'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _diff = require('virtual-dom/diff');

var _diff2 = _interopRequireDefault(_diff);

var _serialize = require('vdom-serialized-patch/serialize');

var _serialize2 = _interopRequireDefault(_serialize);

var _fromJson = require('vdom-as-json/fromJson');

var _fromJson2 = _interopRequireDefault(_fromJson);

var _index = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (_ref) {
  var redux = _ref.redux;
  var view = _ref.view;
  var workerContext = _ref.workerContext;
  var _ref$debug = _ref.debug;
  var debug = _ref$debug === undefined ? false : _ref$debug;

  var currentVDom = undefined;

  var render = function render() {
    var state = redux.getState();
    var title = undefined;
    var newVDom = undefined;

    // our entire app in one line:
    var result = view(state);

    // allow main app to optionally return
    // {
    //   vdom: {{ VIRTUAL DOM }},
    //   title: {{ PAGE TITLE STRING }}
    // }
    if (result.hasOwnProperty('vdom')) {
      title = result.title;
      newVDom = result.vdom;
    } else {
      newVDom = result;
    }

    // do the diff
    var patches = (0, _diff2.default)(currentVDom, newVDom);

    // cache last vdom so we diff against
    // the new one the next time through
    currentVDom = newVDom;

    var message = {
      url: state.url,
      patches: (0, _serialize2.default)(patches)
    };

    if (title !== undefined) {
      message.title = title;
    }

    // send patches and current url back to the main thread
    workerContext.postMessage(message);
  };

  workerContext.onmessage = function (_ref2) {
    var data = _ref2.data;

    if (debug) console.log('action:', data);
    if (data.type === _index.FEATHER_INIT) {
      currentVDom = (0, _fromJson2.default)(data.vdom);
    }

    // let redux do its thing
    redux.dispatch(data);
  };

  redux.subscribe(render);
};