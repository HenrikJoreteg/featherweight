'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _vdomVirtualize = require('vdom-virtualize');

var _vdomVirtualize2 = _interopRequireDefault(_vdomVirtualize);

var _toJson = require('vdom-as-json/toJson');

var _toJson2 = _interopRequireDefault(_toJson);

var _patch = require('vdom-serialized-patch/patch');

var _patch2 = _interopRequireDefault(_patch);

var _localLinks = require('local-links');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (_ref) {
  var worker = _ref.worker;
  var rootElement = _ref.rootElement;

  // any time we get a message from the worker
  // it will be a set of "patches" to apply to
  // the real DOM. We do this on a requestAnimationFrame
  // for minimal impact
  worker.onmessage = function (_ref2) {
    var data = _ref2.data;
    var url = data.url;
    var title = data.title;
    var patches = data.patches;

    window.requestAnimationFrame(function () {
      (0, _patch2.default)(rootElement, patches);
    });
    // we only want to update the URL
    // if it's different than the current
    // URL. Otherwise we keep pushing
    // the same url to the history with
    // each render
    if (window.location.pathname !== url) {
      window.history.pushState(null, null, url);
    }

    // if page title
    if (document.title !== title) {
      document.title = title;
    }
  };

  // we start things off by sending a virtual DOM
  // representation of the *real* DOM along with
  // the current URL to our worker
  worker.postMessage({
    type: '@@feather/INIT',
    vdom: (0, _toJson2.default)((0, _vdomVirtualize2.default)(rootElement))
  });

  // if the user hits the back/forward buttons
  // pass the new url to the worker
  window.addEventListener('popstate', function () {
    worker.postMessage({
      type: 'SET_URL',
      url: window.location.pathname
    });
  });

  // listen for all clicks globally
  rootElement.addEventListener('click', function (event) {
    // handles internal navigation defined as
    // clicks on <a> tags that have `href` that is
    // on the same origin.
    // https://www.npmjs.com/package/local-links
    var pathname = (0, _localLinks.getLocalPathname)(event);
    if (pathname) {
      // stop browser from following the link
      event.preventDefault();
      // instead, post the new URL to our worker
      // which will trigger compute a new vDom
      // based on that new URL state
      worker.postMessage({ type: 'SET_URL', url: pathname });
      return;
    }

    // this is for other "onClick" type events we want to
    // respond to. We check existance of an `data-click`
    // attribute and if it exists, post that back.
    var click = event.target['data-click'];
    if (click) {
      event.preventDefault();
      worker.postMessage(click);
    }
  });
};