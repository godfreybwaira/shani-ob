(function (doc) {
    'use strict';
    doc.addEventListener('DOMContentLoaded', function () {
        Routing.shanify(this.body);
        Observers.mutate(this.body);
    });
    const Observers = (function () {
        const runScript = function (node) {
            if (node.hasAttribute('src')) {
                const found = doc.head.querySelector('script[src="' + node.src + '"]') !== null;
                if (!found) {
                    doc.head.appendChild(node);
                    node.addEventListener('load', function () {
                        Function(this.textContent)();
                    });
                }
            } else {
                Function(node.textContent)();
            }
        };
        const addNode = function (node) {
            if (node instanceof Element) {
                if (node.tagName === 'SCRIPT') {
                    return runScript(node);
                }
                Routing.shanify(node);
            }
        };
        const mo = function (changes) {
            for (let change of changes) {
                let nodes = change.addedNodes;
                for (let node of nodes) {
                    addNode(node);
                }
                nodes = change.removedNodes;
                for (let node of nodes) {
                    Watcher.OBSERVERS.delete(node);
                }
            }
        };
        const demand = function (changes) {
            for (let change of changes) {
                if (change.isIntersecting) {
                    change.target.dispatchEvent(new Event('demand'));
                    this.disconnect();
                }
            }
        };
        return {
            mutate(node) {
                new MutationObserver(mo).observe(node, {subtree: true, childList: true});
            }, intersect(node) {
                new IntersectionObserver(demand).observe(node);
            }
        };
    })();
    const Utils = (function () {
        return{
            dispatch(e, obj) {
                if (!obj.event) {
                    obj.event = new Set();
                }
                obj.event.add(e);
                doc.dispatchEvent(new CustomEvent('shani:' + e, {detail: Utils.object(obj)}));
                return this;
            },
            object(o) {
                return Object.setPrototypeOf(o || {}, null);
            }, getType(header) {
                return header ? header.substring(header.indexOf('/') + 1).split(';')[0] : null;
            }, isInput(node) {
                return ['INPUT', 'TEXTAREA'].indexOf(node.tagName) > -1;
            }, hasEvent(obj, evt) {
                if (evt instanceof Map) {
                    for (let e of obj.event) {
                        if (evt.has(e) || evt.has('*')) {
                            return true;
                        }
                    }
                }
                return obj.event.has(evt) || evt === '*';
            }, explode(str, sep) {
                const map = new Map();
                if (str) {
                    const raw = str.trim().split(sep || '|');
                    for (let val of raw) {
                        const pos = val.indexOf(':'), key = pos > 0 ? val.substring(0, pos) : val;
                        map.set(key.toLowerCase().trim(), pos > 0 ? val.substring(pos + 1).trim() : null);
                    }
                }
                return map;
            }, functionParams(items) {
                const idx = items.indexOf(':'), fp = Utils.object();
                fp.name = idx > -1 ? items.substring(0, idx) : items;
                fp.params = idx > -1 ? items.substring(idx + 1) : '';
                return fp;
            },
            getReqHeaders(req) {
                const type = Utils.getType(req.enctype), headers = Utils.explode(req.header);
                if (type && type !== 'form-data') {
                    headers.set('content-type', req.enctype.trim());
                }
                return headers;
            },
            logger(req, data) {
                if (req.log === 'true') {
                    console.log(data);
                }
                return this;
            }
        };
    })();
    const HTML = (function () {
        const mutateCSS = function (node, params) {
            const fp = Utils.functionParams(params);
            const args = fp.params.split(' ');
            if (fp.name === 'replace') {
                return node.classList.replace(args[0], args[1]);
            }
            for (let arg of args) {
                node.classList[fp.name](arg);
            }
        };
        const placeNode = function (target, data, mode, plainText) {
            if (mode === 'delete') {
                return target.remove();
            }
            const fn = 'insertAdjacent' + (plainText ? 'Text' : 'HTML');
            if (mode === 'remove') {
                target[fn]('afterend', data);
                return target.remove();
            }
            target[fn](mode, data);
        };
        const setInput = function (node, data, mode) {
            if (mode === 'first') {
                node.value = data + node.value;
            } else if (mode === 'last') {
                node.value += data;
            } else if (mode === 'replace') {
                node.value = data;
            } else {
                return true;
            }
        };
        const insertData = function (obj, mode) {
            const hd = obj.resp.headers, node = obj.req.emitter, data = obj.resp.data;
            const type = hd ? Utils.getType(hd.get('content-type')) : null;
            const plainText = node.getAttribute('watch-xss') === 'true' || type !== 'html';
            if (Utils.isInput(node)) {
                if (setInput(node, data, mode)) {
                    placeNode(node, data, mode, plainText);
                }
            } else if (mode !== 'replace') {
                placeNode(node, data, mode, plainText);
            } else if (plainText) {
                node.textContent = data;
            } else {
                node.innerHTML = data;
            }
        };
        return {
            handleCSS(obj) {
                if (obj.req.css) {
                    const pair = Utils.explode(obj.req.css);
                    for (let item of pair) {
                        if (Utils.hasEvent(obj, item[0])) {
                            mutateCSS(obj.req.emitter, item[1]);
                        }
                    }
                }
                return this;
            }, handleData(obj) {
                const mode = Utils.object({
                    before: 'beforebegin', after: 'afterend', remove: 'remove',
                    first: 'afterbegin', last: 'beforeend', delete: 'delete',
                    replace: 'replace'
                })[obj.req.insert];
                if (!obj.resp.data || obj.resp.data === '' || !mode) {
                    return;
                }
                insertData(obj, mode);
            }, handlePlugin(obj) {
                if (obj.req.plugin) {
                    const pair = Utils.explode(obj.req.plugin);
                    for (let item of pair) {
                        if (Utils.hasEvent(obj, item[0])) {
                            const fp = Utils.functionParams(item[1]);
                            obj.params = fp.params;
                            Utils.dispatch('plugin:' + fp.name, obj);
                        }
                    }
                }
                return this;
            }
        };
    })();
    const Watcher = (function () {
        const notify = function (watcher, detail) {
            const selectors = watcher.getAttribute('shani-watch').split(',');
            for (let val of selectors) {
                if (detail.req.emitter.matches(val)) {
                    return Shani.init(watcher, detail);
                }
            }
        };
        const listen = function (e) {
            for (let node of Watcher.OBSERVERS) {
                if (Utils.hasEvent(e.detail, node[1])) {
                    notify(node[0], e.detail);
                }
            }
        };
        const listener = function (node, attr) {
            if (!node.hasAttribute(attr)) {
                return;
            }
            let evt = node.getAttribute('watch-on');
            if (!evt) {
                evt = 'init';
                node.setAttribute('watch-on', evt);
            }
            evt = Utils.explode(evt);
            for (let e of evt) {
                doc.addEventListener('shani:' + e[0], listen);
            }
            Watcher.OBSERVERS.set(node, evt);
        };
        return {
            OBSERVERS: new Map(),
            watch(obj, self) {
                const attr = 'shani-watch';
                if (self) {
                    return listener(obj, attr);
                }
                Shani.create(obj, attr, listener);
            }
        };
    })();
    const Routing = (function () {
        const listener = function (e) {
            const node = e.target.closest('[shani-on~=' + e.type + ']');
            if (node) {
                if (['A', 'AREA', 'FORM'].indexOf(node.tagName) > -1) {
                    e.preventDefault();
                }
                Shani.init(node);
            }
        };
        const start = function (node, attr) {
            if (node.hasAttribute(attr)) {
                Routing.listen(node);
            }
        };
        return {
            listen(node) {
                let evt = node.getAttribute('shani-on');
                if (evt) {
                    evt = Utils.explode(evt);
                    for (let e of evt) {
                        if (e[0] === 'load') {
                            node.addEventListener(e[0], listener);
                            node.dispatchEvent(new Event(e[0]));
                        } else if (e[0] === 'demand') {
                            node.addEventListener(e[0], listener);
                            Observers.intersect(node);
                        } else {
                            doc.addEventListener(e[0], listener);
                        }
                    }
                } else {
                    evt = node.tagName === 'FORM' ? 'submit' : (Utils.isInput(node) || node.tagName === 'SELECT' ? 'change' : 'click');
                    node.setAttribute('shani-on', evt);
                    doc.addEventListener(evt, listener);
                }
            },
            shanify(obj, self) {
                if (self) {
                    start(obj, 'shani-fn');
                } else {
                    Shani.create(obj, 'shani-fn', start);
                }
                Watcher.watch(obj, self);
            }
        };
    })();
    const Features = (function () {
        if (!window.Shanify) {
            window.Shanify = function (nodes, attrs, self = false) {
                if (typeof nodes === 'string') {
                    nodes = doc.querySelectorAll(nodes);
                }
                if (!self) {
                    for (let node of nodes) {
                        for (let key in attrs) {
                            node.setAttribute(key, attrs[key]);
                        }
                    }
                }
                Routing.shanify(nodes, self);
            };
        }
        const setAttr = function (req, node, attrs, prefix) {
            for (let a of attrs) {
                req[a] = node.getAttribute(prefix + a);
            }
        };
        return {
            HTML_ATTR: ['enctype', 'method'],
            SHANI_ATTR: ['target', 'header', 'plugin', 'poll', 'insert', 'css', 'fn', 'scheme', 'log'],
            init(req, node) {
                req.url = node.getAttribute('href') || node.getAttribute('action') || node.value;
                setAttr(req, node, this.SHANI_ATTR, 'shani-');
                setAttr(req, node, this.HTML_ATTR, '');
                req.target = req.target ? doc.querySelector(req.target) : node;
                req.timer = Utils.object();
            }
        };
    })();
    const Shani = (function () {
        const Obj = function (node, detail) {
            this.srcNode = detail ? detail.req.emitter : null;
            this.detail = detail;
            this.emitter = node;
            Features.init(this, node);
            Utils.dispatch('init', {req: this});
        };
        Obj.prototype = {
            r() {
                /*Read*/
//                history.pushState(null, doc.title, this.url);
                sendReq(this, 'GET');
            },
            w() {
                /*Write*/
                sendReq(this, 'POST');
            },
            print() {
                if (window.print instanceof Function) {
                    const cover = getCover(this);
                    window.print();
                    cover.remove();
                }
            },
            fs() {
                /*FullScreen*/
                if (doc.fullscreenEnabled) {
                    const cover = getCover(this, 35);
                    doc.documentElement.requestFullscreen().then(function () {
                        doc.addEventListener('fullscreenchange', function () {
                            if (!doc.fullscreenElement) {
                                cover.remove();
                            }
                        });
                    }).catch(function () {
                        cover.remove();
                    });
                }
            },
            copy() {
                if (Utils.isInput(this.target)) {
                    this.target.select();
                    doc.execCommand('copy');
                } else {
                    const box = doc.createElement('TEXTAREA');
                    box.style.width = 0;
                    box.style.height = 0;
                    doc.body.appendChild(box);
                    box.value = this.target.innerText;
                    box.select();
                    doc.execCommand('copy');
                    box.remove();
                }
                Utils.dispatch('copy', {req: this});
            }
        };
        const sendReq = function (req, method) {
            if (req.scheme === 'ws') {
                return WSocket(req);
            }
            if (req.scheme === 'sse') {
                return ServerEvent(req);
            }
            let rem = req.emitter;
            if (rem.tagName === 'FORM') {
                rem = rem.querySelector('fieldset') || rem;
            }
            rem.style.opacity = 0.5;
            HTTP.send(req, req.method || method, function (data) {
                Utils.logger(req, data);
                rem.setAttribute('disabled', 'disabled');
            }, function (obj) {
                Utils.logger(obj.req, obj.resp);
                rem.removeAttribute('disabled');
                rem.style.opacity = null;
                HTTP.fire('end', obj).rerun(req, submit);
            });
        };
        const getCover = function (req, fs) {
            const cover = doc.createElement('div'), size = 100 + (fs || 0);
            const style = doc.createElement('div'), id = 'shn' + Date.now();
            cover.setAttribute('id', id);
            let content = 'body>:not(#' + id + '){display:none}#' + id + '{position:fixed;top:0;left:0;width:100%;';
            content += 'height:100%;padding:1rem;overflow-y:auto;font-size:' + size + '%;background:#fff;z-index:999;}';
            cover.innerHTML = req.target.outerHTML;
            cover.insertBefore(style, cover.firstChild);
            doc.body.insertBefore(cover, doc.body.firstChild);
            style.innerHTML = content;
            return cover;
        };
        const submit = function (req, trigger) {
            if (req.detail && !req.fn) {
                return trigger('ready', {req, resp: req.detail.resp}, req.detail.resp.code);
            }
            req[req.fn]();
        };
        return {
            init(node, detail) {
                if (!node.hasAttribute('disabled')) {
                    const req = new Obj(node, detail || null);
                    if (!req.poll || req.scheme === 'ws') {
                        submit(req, HTTP.fire);
                    } else if (req.poll) {
                        HTTP.polling(req, submit);
                    }
                }
            }, create(obj, sel, cb) {
                const nodes = obj instanceof NodeList ? obj : obj.querySelectorAll('[' + sel + ']');
                for (let n = 0; n < nodes.length; n++) {
                    cb(nodes[n], sel);
                }
            }
        };
    })();
    const Convertor = (function () {
        const json = function (data) {
            if (typeof data === 'string') {
                return Utils.object(JSON.parse(data));
            }
            return data;
        };
        return {
            map2json(map) {
                const obj = Utils.object();
                for (let m of map) {
                    obj[m[0]] = m[1];
                }
                return obj;
            },
            input2form(node) {
                if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(node.tagName) > -1) {
                    const name = node.getAttribute('name'), fd = new FormData();
                    if (!node.files) {
                        fd.append(name || 'value', node.value);
                    } else {
                        for (let f = 0; f < node.files.length; f++) {
                            fd.append(name || 'file[]', node.files[f]);
                        }
                    }
                    return fd;
                }
                return node.tagName === 'FORM' ? new FormData(node) : null;
            },
            form2json(fd) {
                const data = Utils.object(), keys = [];
                for (let input of fd) {
                    if (keys.indexOf(input[0]) > -1) {
                        continue;
                    }
                    keys.push(input[0]);
                    const vals = fd.getAll(input[0]), key = input[0].replace(/\[\]/g, '');
                    if (vals.length > 1) {
                        data[key] = [];
                        for (let val of vals) {
                            data[key].push(val);
                        }
                    } else {
                        data[key] = vals[0];
                    }
                }
                return data;
            },
            json2xml(data) {
                const convert = function (obj, tag) {
                    let node = '<' + tag + '>';
                    if (typeof obj === 'object') {
                        const isArray = obj instanceof Array;
                        for (let key in obj) {
                            node += convert(obj[key], isArray ? 'item' : key.replace(/[ ]+/, '-'));
                        }
                    } else {
                        node += obj;
                    }
                    return node + '</' + tag + '>';
                };
                return '<?xml version="1.0"?>' + convert(json(data), 'data');
            },
            json2yaml(data) {
                const convert = function (obj, indent) {
                    let str = '';
                    const isArray = obj instanceof Array;
                    for (let p in obj) {
                        const key = '  '.repeat(indent) + (isArray ? '-' : p + ':');
                        if (typeof obj[p] !== 'object') {
                            str += key + ' ' + obj[p] + '\r\n';
                        } else {
                            str += key + '\r\n' + convert(obj[p], indent + 1);
                        }
                    }
                    return str;
                };
                return convert(json(data), 0).trim();
            },
            json2csv(obj) {
                const enclose = function (val) {
                    return '"' + (val !== null || val !== undefined ? (val instanceof Array ? val.join('|') : val) : '') + '"';
                };
                obj = json(obj);
                const data = obj instanceof Array ? obj : [obj];
                let str = Object.keys(data[0]).map(enclose).join(',');
                for (let row of data) {
                    const rows = [];
                    for (let col of row) {
                        rows.push(enclose(col));
                    }
                    str += '\r\n' + rows.join(',');
                }
                return str;
            },
            urlencoded(fd) {
                const keys = [];
                let output = '';
                for (let input of fd) {
                    if (keys.indexOf(input[0]) > -1) {
                        continue;
                    }
                    const vals = fd.getAll(input[0]);
                    for (let val of vals) {
                        output += '&' + input[0] + '=' + encodeURIComponent(val);
                    }
                    keys.push(input[0]);
                }
                return output.substring(1);
            },
//            file2json(file) {
//                const fr = new FileReader();
//                fr.readAsDataURL(file);
//                return new Promise(function (ok) {
//                    fr.addEventListener('load', function (e) {
//                        ok(Utils.object({
//                            name: file.name, size: file.size, type: file.type,
//                            base64: e.target.result.substring(e.target.result.indexOf(',') + 1)
//                        }));
//                    });
//                });
//            },
            form2(fd, type) {
                switch (type) {
                    case 'json':
                        return JSON.stringify(this.form2json(fd));
                    case 'xml':
                        return this.json2xml(this.form2json(fd));
                    case 'yaml':
                        return this.json2yaml(this.form2json(fd));
                    case 'csv':
                        return this.json2csv(this.form2json(fd));
                    case 'x-www-form-urlencoded':
                        return this.urlencoded(fd);
                }
                return fd;
            }
        };
    })();
    const HTTP = (function () {
        const loaders = function (req, xhr, cb) {
            const on = function (e, cb) {
                xhr.addEventListener(e, cb);
                return on;
            };
            on('readystatechange', function () {
                if (this.readyState === 4) {
                    HTTP.fire('ready', makeResp(req, xhr), xhr.status);
                }
            })('abort', function (e) {
                HTTP.fire(e.type, makeResp(req, xhr), 410);
            })('error', function (e) {
                if (req.timer.limit > 0) {
                    req.timer.limit++;
                }
                HTTP.fire(e.type, makeResp(req, xhr));
            })('timeout', function (e) {
                HTTP.fire(e.type, makeResp(req, xhr), 408);
            })('loadstart', function (e) {
                HTTP.fire(e.type, makeResp(req, xhr), 102);
            })('loadend', function () {
                cb(makeResp(req, xhr));
            });
            xhr.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) {
                    const obj = makeResp(req, xhr);
                    obj.bytes = Utils.object({loaded: e.loaded, total: e.total});
                    HTTP.fire(e.type, obj, 102);
                }
            });
        };
        const makeResp = function (req, xhr) {
            const resp = Utils.object({code: xhr.status, text: xhr.statusText});
            if (xhr.readyState >= 4) {
                resp.data = xhr.response;
                resp.headers = Utils.explode(xhr.getAllResponseHeaders(), '\r\n');
            }
            return {req, resp};
        };
        const createPayload = function (req, method) {
            const fd = Convertor.input2form(req.emitter);
            const payload = Utils.object({
                url: req.url, data: null, headers: Utils.getReqHeaders(req)
            });
            if (fd) {
                if (method.toUpperCase() === 'GET') {
                    const mark = req.url.indexOf('?') < 0 ? '?' : '&';
                    payload.url = req.url + mark + Convertor.urlencoded(fd);
                } else {
                    const type = Utils.getType(payload.headers.get('content-type'));
                    payload.data = Convertor.form2(fd, type);
                }
            }
            return payload;
        };
        return{
            send(req, method, startCb, endCb) {
                const payload = createPayload(req, method), xhr = new XMLHttpRequest();
                startCb(payload);
                xhr.open(method, payload.url, true);
                for (let h of payload.headers) {
                    xhr.setRequestHeader(h[0], h[1]);
                }
                loaders(req, xhr, endCb);
                xhr.send(payload.data);
            }, statusText(code) {
                if (!code) {
                    return null;
                }
                if (code > 199 && code < 300) {
                    return 'success';
                }
                if (code > 299 && code < 400) {
                    return 'redirect';
                }
                if (code > 399 && code < 500) {
                    return 'error';
                }
                return code < 200 ? 'info' : 'down';
            }, redirect(req, headers) {
                req.url = headers.get('location');
                if (headers.get('x-ajax')) {//ajax redirection
                    for (let h of headers) {
                        if (Features.HTML_ATTR.indexOf(h[0]) > -1) {
                            req[h[0]] = h[1];
                            continue;
                        }
                        const attr = h[0].substring(h[0].lastIndexOf('-') + 1);
                        if (Features.SHANI_ATTR.indexOf(attr) > -1) {
                            req[attr] = h[1];
                        }
                    }
                    req.fn ||= 'r';
                    return req[req.fn]();
                }
                if (req.url === '#') {
                    history.go(0);
                } else {
                    location = req.url;
                }
            }, rerun(req, cb) {
                if (req.timer.steps > -1 && (!req.timer.limit || (--req.timer.limit) > 0)) {
                    setTimeout(cb, req.timer.steps, req, HTTP.fire);
                }
                return this;
            }, polling(req, cb) {
                const poll = req.poll.split(':');
                req.timer.limit = parseInt(poll[2]) || null;
                req.timer.steps = Number(poll[1] || -1) * 1000;
                setTimeout(cb, Number(poll[0] || 0) * 1000, req, HTTP.fire);
            }, fire(e, obj, code) {
                const status = HTTP.statusText(code);
                Utils.dispatch(e, obj);
                if (code) {
                    Utils.dispatch(code + '', obj).dispatch(status, obj);
                }
                if (e === 'ready') {
                    if (status === 'redirect') {
                        return HTTP.redirect(obj.req, obj.resp.headers);
                    }
                    HTML.handleData(obj);
                }
                HTML.handleCSS(obj).handlePlugin(obj);
                return this;
            }
        };
    })();
    const WSocket = (function () {
        const loaders = function (req, socket) {
            const on = function (e, cb) {
                socket.addEventListener(e, cb);
                return on;
            };
            const cb = function (ev, e) {
                const obj = Utils.object({req, resp: {data: ev.data || null, headers: null}});
                Utils.dispatch(e, obj).logger(req, obj);
                if (e === 'success') {
                    HTML.handleData(obj);
                }
                HTML.handleCSS(obj).handlePlugin(obj);
            };
            on('open', function (e) {
                const payload = createPayload(req);
                socket.send(payload);
                Utils.logger(req, payload);
                cb(e, 'ready');
            })('message', function (e) {
                cb(e, 'success');
            })('error', function (e) {
                cb(e, e.type);
            })('close', function (e) {
                cb(e, 'end');
            });
        };
        const createPayload = function (req) {
            const fd = Convertor.input2form(req.emitter);
            if (fd) {
                const headers = Utils.getReqHeaders(req);
                const type = Utils.getType(headers.get('content-type'));
                return '{"data":' + Convertor.form2(fd, type) + ',"headers":' + JSON.stringify(Convertor.map2json(headers)) + '}';
            }
            return '';
        };
        return function (req) {
            const scheme = location.protocol === 'http:' ? 'ws' : 'wss';
            const host = req.url.charAt(0) === '/' ? location.host : '';
            const socket = new WebSocket(scheme + '://' + host + req.url);
            loaders(req, socket);
        };
    })();
    const ServerEvent = (function () {
        const loaders = function (req, sse) {
            const on = function (e, cb) {
                sse.addEventListener(e, cb);
                return on;
            };
            const cb = function (ev, e) {
                const obj = Utils.object({
                    req, resp: {data: ev.data || null, headers: new Map().set('content-type', 'text/html')}
                });
                Utils.dispatch(e, obj).logger(req, obj);
                if (e !== 'error' && e !== 'end') {
                    HTML.handleData(obj);
                }
                HTML.handleCSS(obj).handlePlugin(obj);
            };
            const evt = Utils.explode(req.emitter.getAttribute('shani-on') || 'message');
            for (let e of evt) {
                on(e[0], function (ev) {
                    cb(ev, ev.type);
                });
            }
            on('error', function (e) {
                cb(e, e.type);
            })('beforeunload', function () {
                sse.close();
            });
        };
        return function (req) {
            loaders(req, new EventSource(req.url));
        };
    })();
})(document);