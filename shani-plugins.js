(function (doc) {
    'use strict';
    const listener = function (e, cb) {
        doc.addEventListener('shani:plugin:' + e, cb);
        return listener;
    };
    listener('toaster', function (e) {
    });
    listener('drawer', function (e) {
    });
    listener('print', function (e) {
        Plugins.print(Utils.getTarget(e.detail.req));
    });
    listener('fs', function (e) {
        Plugins.fs(Utils.getTarget(e.detail.req));
    });
    listener('copy', function (e) {
        Plugins.copy(Utils.getTarget(e.detail.req));
    });
    const Utils = (function () {
        return {
            getCover(target, fs) {
                const cover = doc.createElement('div'), size = 100 + (fs || 0);
                const style = doc.createElement('style'), id = 'shn' + Date.now();
                cover.setAttribute('id', id);
                let content = 'body>:not(#' + id + '){display:none}#' + id + '{position:fixed;top:0;left:0;width:100%;';
                content += 'height:100%;padding:1rem;overflow-y:auto;font-size:' + size + '%;background:#fff;z-index:999;}';
                cover.innerHTML = target.outerHTML;
                cover.insertBefore(style, cover.firstChild);
                doc.body.insertBefore(cover, doc.body.firstChild);
                style.innerHTML = content;
                return cover;
            },
            getTarget(req) {
                if (!req.watcher) {
                    return req.emitter;
                }
                const watchers = doc.querySelectorAll(req.watcher);
                if (watchers.length === 1) {
                    return watchers;
                }
                const wrapper = doc.createElement('div');
                for (const watcher of watchers) {
                    wrapper.appendChild(watcher.cloneNode(true));
                }
                return wrapper;
            }
        };
    })();
    const Plugins = (function () {
        return {
            print(target) {
                if (window.print instanceof Function) {
                    const cover = Utils.getCover(target);
                    window.print();
                    cover.remove();
                }
            },
            fs(target) {
                /*FullScreen*/
                if (doc.fullscreenEnabled) {
                    const cover = Utils.getCover(target, 35);
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
            copy(target) {
                if (['INPUT', 'TEXTAREA'].indexOf(target.tagName) > -1) {
                    target.select();
                    return doc.execCommand('copy');
                }
                const box = doc.createElement('TEXTAREA');
                box.style.width = 0;
                box.style.height = 0;
                doc.body.appendChild(box);
                box.value = target.innerText;
                box.select();
                doc.execCommand('copy');
                box.remove();
            }
        };
    })();
})(document);