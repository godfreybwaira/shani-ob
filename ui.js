/**
 * @since Jan 03, 2024
 * @description Component generating tool. Bado ipo matengenezoni.
 */
(doc => {
    const Utils = (() => {
        const select = (fn, children, activeChild, cssClass) => {
            for (let i = 0; i < children.length; i++) {
                if (children[i] !== activeChild) {
                    children[i].classList.remove(cssClass);
                } else {
                    activeChild.classList[fn](cssClass);
                }
            }
        };
        return {
            toggleSelectNode(children, activeChild, cssClass) {
                select('toggle', children, activeChild, cssClass);
            },
            selectNode(children, activeChild, cssClass) {
                select('add', children, activeChild, cssClass);
            },
            getParentNode(node, selector) {
                const parent = node.parentElement;
                if (!parent || parent.matches(selector)) {
                    return parent;
                }
                return this.getParentNode(parent, selector);
            },
            listen(e, cb) {
                doc.addEventListener('shani:on:' + e, cb);
                return Utils.listen;
            },
            setAttrs(node, attrs) {
                if (attrs) {
                    const values = attrs.split(';').map(val => val.trim().split(':'));
                    for (const val of values) {
                        node.setAttribute(val[0], val[1] || val[0]);
                    }
                }
            }
        };
    })();
    const Carousel = (() => {
        const rotateItems = (carousel, cb) => {
            const children = carousel.querySelectorAll('.carousel-body>*');
            const currentActive = carousel.querySelector('.carousel-body>.active');
            const currentIdx = Array.from(children).indexOf(currentActive);
            const nextIdx = cb(children.length, currentIdx);
            Utils.selectNode(children, children[nextIdx], 'active');
        };
        return  (e) => {
            if (e.target.classList.contains('carousel-next')) {
                // Calculate next index: cycle to 0 if at end.
                rotateItems(e.target.parentNode, (total, idx) => (idx + 1) % total);
            } else if (e.target.classList.contains('carousel-prev')) {
                // Calculate previous index: add total length to avoid negative modulus.
                rotateItems(e.target.parentNode, (total, idx) => (idx - 1 + total) % total);
            }
        };
    })();
    const Selection = (() => {
        Utils.listen('end', e => Selection.select(e.detail.emitter));
//        doc.addEventListener('click', e => Selection.select(e.target));
        const applyProp = (target, node, args) => {
            for (const a of args) {
                node.classList.add(a);
            }
            return node === target;
        };
        const getClassList = (parent) => {
            const args = parent.getAttribute('ui-class')?.split(' ') || [];
            for (const row of parent.children) {
                row.classList.remove(...args);
            }
            return args;
        };
        const getEmittingChild = (target, parent) => {
            while (target !== parent && target.parentElement !== parent) {
                target = target.parentElement;
            }
            return target;
        };
        return {
            /**
             * Add CSS classes on children. Requires `ui-class`
             * @param {type} target
             * @param {type} selector
             * @returns {undefined}
             */
            select(target) {
                const parent = Utils.getParentNode(target, '[ui-attr]');
                if (!parent) {
                    return;
                }
                const child = getEmittingChild(target, parent), args = getClassList(parent);
                child.classList.add(...args);
            },
            /**
             * Add CSS classes on children from first child to current child. Requires `ui-class`
             * @param {type} args
             * @param {type} child
             * @param {type} parent
             * @returns {undefined}
             */
            lselect(args, child, parent) {
                for (const row of parent.children) {
                    if (applyProp(child, row, args)) {
                        break;
                    }
                }
            },
            /**
             * Add CSS classes on children from current child to last child. Requires `ui-class`
             * @param {type} args
             * @param {type} child
             * @param {type} parent
             * @returns {undefined}
             */
            rselect(args, child, parent) {
                for (let i = parent.children.length - 1; i >= 0; i--) {
                    if (applyProp(child, parent.children[i], args)) {
                        break;
                    }
                }
            },
            /**
             * Toggle CSS classes. Requires `ui-class`
             * @param {type} args
             * @param {type} child
             * @returns {undefined}
             */
            toggle(args, child) {
                for (const a of args) {
                    child.classList.toggle(a);
                }
            }
        };
    })();
    const Modal = (() => {
        const addCloseBtn = (modal, attr) => {
            if (attr !== null) {
                const position = attr.substring(attr.indexOf(':') + 1), target = '#' + modal.parentElement.id;
                const btn = doc.createElement('button');
                btn.className = 'button button-times ' + position;
                btn.setAttribute('type', 'button');
                btn.setAttribute('shani-fn', 'close');
                btn.setAttribute('shani-target', target);
                modal.appendChild(btn);
            }
        };
        const createModal = (specs) => {
            const mdbg = doc.createElement('div'), modal = doc.createElement('div'), spinner = doc.createElement('div');
            modal.className = specs;
            mdbg.className = 'modal-background';
            mdbg.id = 'd' + Date.now().toString(36);
            spinner.className = 'spinner';
            modal.appendChild(spinner);
            mdbg.appendChild(modal);
            doc.body.appendChild(mdbg);
            return modal;
        };
        Utils.listen('start', e1 => {
            const src = e1.detail.emitter, specs = src.getAttribute('ui-class');
            if (specs?.split(' ').indexOf('modal') > -1) {
                const attr = src.getAttribute('ui-attr'), modal = createModal(specs);
                addCloseBtn(modal, attr);
                Utils.listen('data', (e) => {
                    modal.innerHTML = e.detail.data || '';
                    addCloseBtn(modal, attr);
                });
            }
        });
    })();
    const Loader = (() => {
        const getLoader = () => {
            let loader = doc.getElementById('ldrf17tl0');
            if (loader) {
                loader.remove();
            }
            loader = doc.createElement('div');
            loader.id = 'ldrf17tl0';
            const bar = doc.createElement('div');
            bar.classList.add('progress');
            loader.className = 'progress-bar loader';
            loader.appendChild(bar);
            return loader;
        };
        Utils.listen('start', () => {
            const loader = getLoader();
            doc.body.appendChild(loader);
            Utils.listen('end', () => loader.remove());
        });
    })();
    const Toaster = (() => {
        const toast = (message, code) => {
            const content = code + ' &CenterDot; ' + message;
            let toaster = doc.getElementById('oer89trJ');
            const color = code === 200 ? 'success' : (code > 399 ? 'danger' : 'info');
            if (toaster) {
                toaster.remove();
            }
            toaster = doc.createElement('div');
            toaster.id = 'oer89trJ';
            toaster.innerHTML = content;
            toaster.className = 'toaster pos-tc width-md-5 width-sm-10 color-' + color;
            doc.body.appendChild(toaster);
            setTimeout(() => {
                toaster.style.transform = 'translateY(-100%)';
                toaster.addEventListener('transitionend', (e) => e.target.remove());
            }, 3000 + toaster.innerText.length * 64);
        };
        Utils.listen('abort', (e) => {
            toast(e.detail.status || 'Request cancelled.', e.detail.code);
        })('error', (e) => {
            toast(e.detail.status || 'Failed to connect to server.', e.detail.code);
        })('timeout', (e) => {
            toast(e.detail.status || 'Response takes too long.', e.detail.code);
        })('redirect', (e) => {
            toast(e.detail.status || 'Redirecting...', e.detail.code);
        })('data', (e) => {
            const specs = e.detail.emitter.getAttribute('ui-class');
            if (specs?.split(' ').indexOf('toaster') > -1) {
                toast(e.detail.data || '(No data returned)', e.detail.code);
            }
        });
    })();
    (function start() {
        const handlers = {
            click: [Carousel]
        };
        for (const evt in handlers) {
            for (let h in handlers[evt]) {
                doc.addEventListener(evt, handlers[evt][h]);
            }
        }
    })();
})(document);