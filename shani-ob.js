(function (doc) {
    'use strict';
    doc.addEventListener('DOMContentLoaded', function () {
        Shanify(this.body);
        Observers.mutate(this.body);
    });
    const Observers = (() => {
        const runScript = (node) => {
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
        const addNode = (node) => {
            if (node instanceof Element) {
                if (node.tagName === 'SCRIPT') {
                    return runScript(node);
                }
                Shanify(node);
            }
        };
        const mo = (changes) => {
            for (let change of changes) {
                for (let node of change.addedNodes) {
                    addNode(node);
                }
            }
        };
        const demand = (changes) => {
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
    const Convertor = (() => {
        const json = (data) => {
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
                const convert = (obj, tag) => {
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
                const convert = (obj, indent) => {
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
                const enclose = (val) => {
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
    const HTML = (() => {
        const setInput = (node, data, mode) => {
            if (mode === 'prepend') {
                node.value = data + node.value;
            } else if (mode === 'append') {
                node.value += data;
            } else {
                node.value = data;
            }
        };
        const insertData = (node, response) => {
            const mode = node.getAttribute('shani-insert');
            const hd = response.headers, data = response.data;
            const type = hd ? Utils.getSubtype(hd.get('content-type')) : null;
            const plainText = node.getAttribute('shani-xss') === 'true' || type !== 'html';
            if (Utils.isInput(node)) {
                setInput(node, data, mode);
            } else if (mode !== 'replace') {
                const fn = 'insertAdjacent' + (plainText ? 'Text' : 'HTML');
                const modes = Utils.object({
                    prepend: 'afterbegin', append: 'beforeend', replace: 'replace'
                });
                node[fn](modes[mode], data);
            } else if (plainText) {
                node.textContent = data;
            } else {
                node.innerHTML = data;
            }
        };
        const mutateCSS = (node, params) => {
            const args = params.split(' ');
            if (args[0] === 'replace') {
                return node.classList.replace(args[1], args[2]);
            }
            for (let i = 1; i < args.length; i++) {
                node.classList[args[0]](args[1]);
            }
        };
        return {
            processResponse(shani, response) {
                if (!response.data) {
                    return;
                }
                if (shani.target) {
                    doc.querySelectorAll(shani.target).forEach(node => insertData(node, response));
                } else if (shani.emitter) {
                    insertData(shani.emitter, response);
                }
            },
            handleCss(node, css, evt) {
                const handlers = Utils.explode(css);
                for (let handler of handlers) {
                    if (handler[0] === evt || handler[0] === '*') {
                        mutateCSS(node, handler[1]);
                    }
                }
            }
        };
    })();
    const Shani = (() => {
        const Obj = function (node, e) {
            this.event = e;
            this.emitter = node;
            this.timer = Utils.object();
            this.url = node.getAttribute('href') || node.getAttribute('action') || node.value;
            setAttrs(this, node, Shani.SHANI_ATTR, 'shani-');
            setAttrs(this, node, Shani.HTML_ATTR, '');
        };
        const setAttrs = (shani, node, attrs, prefix) => {
            for (const a of attrs) {
                shani[a] = node.getAttribute(prefix + a);
            }
        };
        /**
         * Make HTTP request at a regular interval
         * @param {type} shani Shani object
         * @returns {undefined}
         */
        const doPolling = (shani) => {
            const poll = shani.poll.split(':');
            shani.timer.limit = parseInt(poll[2]) || null;
            shani.timer.steps = Number(poll[1] || -1) * 1000;
            setTimeout(shani[shani.fn], Number(poll[0] || 0) * 1000, shani);
        };
        /**
         * Resend a polling HTTP request
         * @param {type} shani
         * @returns {undefined}
         */
        const resubmit = (shani) => {
            if (shani.timer.steps > -1 && (!shani.timer.limit || (--shani.timer.limit) > 0)) {
                setTimeout(shani[shani.fn], shani.timer.steps, shani);
            }
        };
        /**
         * Send HTTP request
         * @param {type} shani Shani object
         * @param {string} method HTTP request type
         * @returns {unresolved}
         */
        const sendReq = (shani, method) => {
            if (shani.scheme === 'ws') {
                return WSocket(shani);
            }
            if (shani.scheme === 'sse') {
                return ServerEvent(shani);
            }
            let rem = shani.emitter;
            if (rem.tagName === 'FORM') {
                rem = rem.querySelector('fieldset') || rem;
            }
            rem.style.opacity = 0.5;
            HTTP.send(shani, shani.method || method, (request) => {
                Utils.emitEvent(shani.emitter, 'on:start', {request});
                rem.setAttribute('disabled', 'disabled');
            }, (response) => {
                rem.style.opacity = null;
                rem.removeAttribute('disabled');
                Utils.emitEvent(shani.emitter, 'on:end', {response});
                resubmit(shani);
            });
        };
        const getTarget = (shani) => {
            if (!shani.target) {
                return shani.emitter;
            }
            const watchers = doc.querySelectorAll(shani.target);
            if (watchers.length === 1) {
                return watchers[0];
            }
            const wrapper = doc.createElement('div');
            for (const watcher of watchers) {
                wrapper.appendChild(watcher.cloneNode(true));
            }
            return wrapper;
        };
        const getCover = (shani, fs) => {
            const cover = doc.createElement('div'), size = 100 + (fs || 0);
            let style = 'position:fixed;top:0;left:0;width:100%;height:100%;padding:1rem;';
            style += 'overflow-y:auto;font-size:' + size + '%;background:#fff;z-index:998';
            cover.style = style;
            cover.innerHTML = getTarget(shani).outerHTML;
            doc.body.insertBefore(cover, doc.body.firstChild);
            return cover;
        };
        const getEmittingChild = (shani) => {
            const parent = getTarget(shani);
            let target = shani.event.target;
            while (target !== parent && target.parentElement !== parent) {
                target = target.parentElement;
            }
            return target;
        };
        const applyProp = (target, node, args) => {
            for (const a of args) {
                node.classList.add(a);
            }
            return node === target;
        };
        const applySelection = (shani, cb) => {
            const parent = getTarget(shani), args = shani.class.split(' ');
            for (const row of parent.children) {
                row.classList.remove(...args);
            }
            cb(getEmittingChild(shani), args, parent);
        };
        Obj.prototype = {
            r() {
                //history.pushState(null, doc.title, this.url);
                /*Read*/
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
                    Utils.removeNode(cover);
                }
            },
            /**
             * Offline search
             * @returns {undefined}
             */
            search() {
                const text = this.emitter.value.trim().toLowerCase(), target = getTarget(this);
                for (const row of target.children) {
                    row.style.display = row.textContent.toLowerCase().indexOf(text) < 0 ? 'none' : null;
                }
            },
            /**
             * Add CSS classes on children. Requires `shani-class`
             * @returns {undefined}
             */
            select() {
                applySelection(this, (target, args) => target.classList.add(...args));
            },
            /**
             * Add CSS classes on children from first child to current child. Requires `shani-class`
             * @returns {undefined}
             */
            lselect() {
                applySelection(this, (target, args, parent) => {
                    for (const row of parent.children) {
                        if (applyProp(target, row, args)) {
                            break;
                        }
                    }
                });
            },
            /**
             * Add CSS classes on children from current child to last child. Requires `shani-class`
             * @returns {undefined}
             */
            rselect() {
                applySelection(this, (target, args, parent) => {
                    for (let i = parent.children.length - 1; i >= 0; i--) {
                        if (applyProp(target, parent.children[i], args)) {
                            break;
                        }
                    }
                });
            },
            /**
             * Toggle CSS classes. Requires `shani-class`
             * @returns {undefined}
             */
            toggle() {
                const target = getEmittingChild(this), args = this.class.split(' ');
                for (const a of args) {
                    target.classList.toggle(a);
                }
            },
            /**
             * Full screen
             * @returns {undefined}
             */
            fs() {
                if (doc.fullscreenEnabled) {
                    const cover = getCover(this, 35);
                    doc.documentElement.requestFullscreen().then(() => {
                        doc.addEventListener('fullscreenchange', () => {
                            if (!doc.fullscreenElement) {
                                Utils.removeNode(cover);
                            }
                        });
                    }).catch(() => Utils.removeNode(cover));
                }
            }
        };
        return {
            HTML_ATTR: ['enctype', 'method'],
            SHANI_ATTR: ['watcher', 'header', 'poll', 'insert', 'xss', 'css', 'class', 'remove', 'fn', 'scheme', 'target'],
            create(node, event) {
                const shani = new Obj(node, event);
                if (shani[shani.fn] instanceof Function) {
                    if (!shani.poll || shani.scheme === 'ws') {
                        shani[shani.fn]();
                    } else if (shani.poll) {
                        doPolling(shani);
                    }
                }
            }
        };
    })();
    const Shanify = (() => {
        const listen = (e) => {
            const node = e.target.closest('[shani-on~=' + e.type + ']');
            if (node && !node.hasAttribute('disabled')) {
                if (['A', 'AREA', 'FORM'].indexOf(node.tagName) > -1) {
                    e.preventDefault();
                }
                Utils.emitEvent(node, 'on:' + e.type);//trigger event to watch
                Utils.emitEvent(node, 'fn:' + node.getAttribute('shani-fn'));
                Shani.create(node, e);
            }
        };
        const setDefaultEvents = (node) => {
            let events = node.getAttribute('shani-on');
            if (events === null && !node.hasAttribute('watch-on')) {
                events = node.tagName === 'FORM' ? 'submit' : (Utils.isInput(node) || node.tagName === 'SELECT' ? 'change' : 'click');
                node.setAttribute('shani-on', events);
            }
            const watchEvents = node.getAttribute('watch-on');
            if (watchEvents !== null) {
                const eventList = Utils.explode(watchEvents);
                for (let e of eventList) {
                    doc.addEventListener('shani:on:' + e[0], watch); //watch for event
                }
            }
            return events;
        };
        const addListener = (node) => {
            const evtList = Utils.explode(setDefaultEvents(node));
            for (let evt of evtList) {
                if (evt[0] === 'load') {
                    node.addEventListener(evt[0], listen);
                    node.dispatchEvent(new Event(evt[0]));
                } else if (evt[0] === 'demand') {
                    node.addEventListener(evt[0], listen);
                    Observers.intersect(node);
                } else {
                    doc.addEventListener(evt[0], listen);
                }
            }
        };
        const watch = (e) => {
            const evt = e.type.substring(e.type.lastIndexOf(':') + 1);
            doc.querySelectorAll('[shani-watch]').forEach(watcher => {
                const events = watcher.getAttribute('watch-on');
                if (events.split(',').indexOf(evt) > -1 || events === '*') {
                    if (e.detail.source.matches(watcher.getAttribute('shani-watch'))) {
                        Shani.create(watcher, e);
                    }
                }
            });
        };

        return (parentNode) => {
            parentNode.querySelectorAll('[shani-fn]').forEach(node => addListener(node));
        };
    })();
    const Utils = (() => {
        return {
            removeNode(node) {
                node.style.opacity = 0;
                node.addEventListener('transitionend', (e) => e.target.remove());
            },
            isInput(node) {
                return ['INPUT', 'TEXTAREA'].indexOf(node.tagName) > -1;
            },
            explode(str, sep = ',') {
                const map = new Map();
                if (str) {
                    const raw = str.trim().split(sep);
                    for (let val of raw) {
                        const pos = val.indexOf(':'), key = pos > 0 ? val.substring(0, pos) : val;
                        map.set(key.toLowerCase().trim(), pos > 0 ? val.substring(pos + 1).trim() : null);
                    }
                }
                return map;
            },
            object(o) {
                return Object.setPrototypeOf(o || {}, null);
            },
            emitEvent(node, evt, data = {}) {
                const css = node.getAttribute('shani-css');
                const event = evt.substring(evt.lastIndexOf(':') + 1);
                if (css !== null) {
                    HTML.handleCss(node, css, event);
                }
                const rme = node.getAttribute('shani-remove');
                if (rme !== null && (rme === '*' || rme.split(',').indexOf(event) > -1)) {
                    Utils.removeNode(node);
                } else {
                    data.source = node;
                }
                doc.dispatchEvent(new CustomEvent('shani:' + evt, {detail: Utils.object(data)}));
            },
            getReqHeaders(shani) {
                const type = Utils.getSubtype(shani.enctype), headers = Utils.explode(shani.header, '|');
                if (type && type !== 'form-data') {
                    headers.set('content-type', shani.enctype.trim());
                }
                return headers;
            },
            getSubtype(header) {
                if (header) {
                    const subtype = header.substring(header.indexOf('/') + 1).split(';')[0];
                    const plusPos = subtype.indexOf('+');
                    return plusPos < 0 ? subtype : subtype.substring(plusPos + 1);
                }
                return null;
            }
        };
    })();
    const HTTP = (() => {
        const getHttpResponse = (xhr) => {
            const resp = Utils.object({code: xhr.status, status: xhr.statusText});
            if (xhr.readyState >= 4) {
                resp.data = xhr.response;
                resp.headers = Utils.explode(xhr.getAllResponseHeaders(), '\r\n');
            }
            return resp;
        };
        const httpHandler = (shani, xhr, cb) => {
            const on = (e, cb) => xhr.addEventListener(e, cb);
            const response = getHttpResponse(xhr);
            on('readystatechange', function () {
                if (this.readyState === 4) {
                    HTTP.fire(shani, response, xhr.status);
                }
            });
            on('error', () => {
                if (shani.timer.limit > 0) {
                    shani.timer.limit++;
                }
                HTTP.fire(shani, response, 400);
            });
            on('abort', () => HTTP.fire(shani, response, 410));
            on('timeout', () => HTTP.fire(shani, response, 408));
            on('loadstart', () => HTTP.fire(shani, response, 102));
            on('loadend', () => cb(response));

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    response.bytes = Utils.object({loaded: e.loaded, total: e.total});
                    HTTP.fire(shani, response, 102);
                }
            });
        };
        const redirect = (headers) => {
            const url = headers.get('location');
            if (url === '#') {
                window.location.reload();
            } else {
                window.location = url;
            }
        };

        const createPayload = (shani, method) => {
            const fd = Convertor.input2form(shani.emitter);
            const payload = Utils.object({
                url: shani.url, data: null, headers: Utils.getReqHeaders(shani)
            });
            if (fd) {
                if (method.toUpperCase() === 'GET') {
                    const mark = shani.url.indexOf('?') < 0 ? '?' : '&';
                    payload.url = shani.url + mark + Convertor.urlencoded(fd);
                } else {
                    const type = Utils.getSubtype(payload.headers.get('content-type'));
                    payload.data = Convertor.form2(fd, type);
                }
            }
            return payload;
        };

        return {
            send(shani, method, startCb, endCb) {
                const payload = createPayload(shani, method), xhr = new XMLHttpRequest();
                startCb(payload);
                xhr.open(method, payload.url, true);
                for (let h of payload.headers) {
                    xhr.setRequestHeader(h[0], h[1]);
                }
                xhr.send(payload.data);
                httpHandler(shani, xhr, endCb);
            },
            statusText(code) {
                if (code > 199 && code < 300) {
                    return 'success';
                }
                if (code > 299 && code < 400) {
                    return 'redirect';
                }
                if (code > 399 && code < 500) {
                    return 'error';
                }
                return code < 200 ? 'info' : 'offline';
            },
            fire(shani, response, code) {
                const status = HTTP.statusText(code);
                Utils.emitEvent(shani.emitter, 'on:' + code, response);
                Utils.emitEvent(shani.emitter, 'on:' + status, response);
                HTML.processResponse(shani, response);
                if (status === 'redirect') {
                    redirect(response.headers);
                }
            }
        };
    })();
    const WSocket = (() => {
        const createPayload = (shani) => {
            const payload = Utils.object({
                url: shani.url, data: null, headers: Utils.getReqHeaders(shani)
            });
            const formdata = Convertor.input2form(shani.emitter);
            if (formdata) {
                const type = Utils.getSubtype(payload.headers.get('content-type'));
                payload.data = '{"data":' + Convertor.form2(formdata, type) + ',"headers":';
                payload.data += JSON.stringify(Convertor.map2json(payload.headers)) + '}';
            }
            return payload;
        };
        const httpHandler = (shani, socket) => {
            const on = (e, cb) => socket.addEventListener(e, cb);
            on('open', () => {
                const payload = createPayload(shani);
                socket.send(payload.data || '');
                Utils.emitEvent(shani.emitter, 'on:start', {request: payload});
            });
            on('message', (e) => {
                const resp = Utils.object({data: e.data || null, headers: null});
                Utils.emitEvent(shani.emitter, 'on:' + e.type, resp);
                HTML.processResponse(shani, resp);
            });
            on('error', (e) => Utils.emitEvent(shani.emitter, 'on:' + e.type));
            on('close', () => {
                Utils.emitEvent(shani.emitter, 'on:end');
            });
        };
        return (shani) => {
            const scheme = location.protocol === 'http:' ? 'ws' : 'wss';
            const host = shani.url.indexOf('://') === -1 ? scheme + '://' + location.host : '';
            httpHandler(shani, new WebSocket(host + shani.url));
        };
    })();
    const ServerEvent = (() => {
        const httpHandler = (shani, sse) => {
            const on = (e, cb) => sse.addEventListener(e, cb);
            const evt = Utils.explode(shani.emitter.getAttribute('shani-on') || 'message');
            for (let e of evt) {
                on(e[0], (e) => {
                    Utils.emitEvent(shani.emitter, 'on:start');
                    const resp = Utils.object({
                        data: e.data || null, headers: new Map().set('content-type', 'text/html')
                    });
                    Utils.emitEvent(shani.emitter, 'on:' + e.type, resp);
                    HTML.processResponse(shani, resp);
                });
            }
            on('error', (e) => Utils.emitEvent(shani.emitter, 'on:' + e.type));
            on('beforeunload', () => {
                sse.close();
                Utils.emitEvent(shani.emitter, 'on:end');
            });
        };
        return (shani) => httpHandler(shani, new EventSource(shani.url));

    })();
})(document);