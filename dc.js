/* NIA CLUB page runtime: renders the <template id="dc-tpl"> markup with the
   values from the Component class, and re-renders on setState. */
(function () {
  'use strict';
  var HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
  var ONLY_HOLE = /^\{\{\s*([\w.$]+)\s*\}\}$/;
  var comp, tpl, mount, pending = false;

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    this.state = Object.assign({}, this.state, patch);
    schedule();
  };
  window.DCLogic = DCLogic;

  function schedule() {
    if (pending) { return; }
    pending = true;
    Promise.resolve().then(function () { pending = false; render(); });
  }

  function lookup(path, scopes, vals) {
    var parts = path.split('.');
    var head = parts[0], v, found = false;
    for (var i = scopes.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(scopes[i], head)) { v = scopes[i][head]; found = true; break; }
    }
    if (!found) { v = vals[head]; }
    for (var j = 1; j < parts.length; j++) { if (v == null) { return undefined; } v = v[parts[j]]; }
    return v;
  }

  function interp(str, scopes, vals) {
    return str.replace(HOLE, function (_, p) { var v = lookup(p, scopes, vals); return v == null ? '' : String(v); });
  }

  function valueOf(raw, scopes, vals) {
    var m = ONLY_HOLE.exec(raw || '');
    return m ? lookup(m[1], scopes, vals) : raw;
  }

  function buildChildren(node, scopes, vals, out) {
    var list = node.content ? node.content.childNodes : node.childNodes;
    for (var i = 0; i < list.length; i++) { build(list[i], scopes, vals, out); }
  }

  function build(node, scopes, vals, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.data, scopes, vals))); return; }
    if (node.nodeType !== 1) { return; }
    var tag = node.localName;
    if (tag === 'sc-if') {
      var ok = valueOf(node.getAttribute('value'), scopes, vals);
      if (ok && ok !== 'false') { buildChildren(node, scopes, vals, out); }
      return;
    }
    if (tag === 'sc-for') {
      var items = valueOf(node.getAttribute('list'), scopes, vals) || [];
      var as = node.getAttribute('as') || 'item';
      for (var k = 0; k < items.length; k++) {
        var sc = {}; sc[as] = items[k];
        buildChildren(node, scopes.concat([sc]), vals, out);
      }
      return;
    }
    var el = node.namespaceURI && node.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(node.namespaceURI, tag)
      : document.createElement(tag);
    var handlers = {};
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name;
      if (name.indexOf('hint-') === 0) { continue; }
      if (/^on/i.test(name)) {
        var fn = valueOf(at.value, scopes, vals);
        if (typeof fn === 'function') { handlers[name.slice(2).toLowerCase()] = fn; }
        continue;
      }
      el.setAttribute(name, interp(at.value, scopes, vals));
    }
    el.__h = handlers;
    buildChildren(node, scopes, vals, el);
    out.appendChild(el);
  }

  function ensureBound(el) {
    if (!el.__h) { return; }
    Object.keys(el.__h).forEach(function (type) {
      var flag = '__b_' + type;
      if (el[flag]) { return; }
      el[flag] = true;
      el.addEventListener(type, function (e) { var f = el.__h && el.__h[type]; if (f) { f(e); } });
    });
  }

  function bindTree(root) {
    if (root.nodeType !== 1) { return; }
    ensureBound(root);
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) { ensureBound(all[i]); }
  }

  function same(a, b) {
    if (a.nodeType !== b.nodeType) { return false; }
    if (a.nodeType === 3) { return true; }
    return a.localName === b.localName && a.namespaceURI === b.namespaceURI;
  }

  function patchNode(a, b) {
    if (a.nodeType === 3) { if (a.data !== b.data) { a.data = b.data; } return; }
    var i, at;
    for (i = a.attributes.length - 1; i >= 0; i--) {
      at = a.attributes[i];
      if (!b.hasAttribute(at.name)) { a.removeAttribute(at.name); }
    }
    for (i = 0; i < b.attributes.length; i++) {
      at = b.attributes[i];
      if (a.getAttribute(at.name) !== at.value) { a.setAttribute(at.name, at.value); }
    }
    a.__h = b.__h;
    ensureBound(a);
    patchChildren(a, b);
  }

  function patchChildren(oldParent, newParent) {
    var fresh = Array.prototype.slice.call(newParent.childNodes);
    for (var i = 0; i < fresh.length; i++) {
      var a = oldParent.childNodes[i], b = fresh[i];
      if (!a) { oldParent.appendChild(b); bindTree(b); }
      else if (same(a, b)) { patchNode(a, b); }
      else { oldParent.replaceChild(b, a); bindTree(b); }
    }
    while (oldParent.childNodes.length > fresh.length) { oldParent.removeChild(oldParent.lastChild); }
  }

  function render() {
    var vals = comp.renderVals();
    var scratch = document.createElement('div');
    buildChildren(tpl, [], vals, scratch);
    patchChildren(mount, scratch);
  }

  function init() {
    tpl = document.getElementById('dc-tpl');
    mount = document.getElementById('dc-root');
    var logic = document.getElementById('dc-logic');
    var props = {};
    try {
      var decl = JSON.parse(logic.getAttribute('data-props') || '{}');
      Object.keys(decl).forEach(function (k) { if (k.charAt(0) !== '$' && 'default' in decl[k]) { props[k] = decl[k].default; } });
    } catch (err) {}
    var Component = new Function('DCLogic', logic.textContent + '\nreturn Component;')(DCLogic);
    comp = new Component(props);
    render();
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) { target.scrollIntoView(); }
    }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
