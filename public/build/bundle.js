
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class FpsCtrl {
        constructor(fps, callback) {

            var delay = 1000 / fps,
                time = null,
                frame = -1,
                tref;

            function loop(timestamp) {
                if (time === null)
                    time = timestamp;
                var seg = Math.floor((timestamp - time) / delay);
                if (seg > frame) {
                    frame = seg;
                    callback({
                        time: timestamp,
                        frame: frame
                    });
                }
                tref = requestAnimationFrame(loop);
            }

            this.isPlaying = false;

            this.frameRate = function (newfps) {
                if (!arguments.length)
                    return fps;
                fps = newfps;
                delay = 1000 / fps;
                frame = -1;
                time = null;
            };

            this.start = function () {
                if (!this.isPlaying) {
                    this.isPlaying = true;
                    tref = requestAnimationFrame(loop);
                }
            };

            this.pause = function () {
                if (this.isPlaying) {
                    cancelAnimationFrame(tref);
                    this.isPlaying = false;
                    time = null;
                    frame = -1;
                }
            };
        }
    }

    const zones = [{
        depth: 0,
        fade: 250,
        scrollMod:1,
        title: 'The Epipelagic Zone',
        text: 'Your journey to the depths begins here, at the uppermost part of the ocean\'s water column.'
    },
        {
            depth: 650,
            fade: 1000,
            scrollMod: 2,
            title: 'The Mesopelagic Zone',
            text: 'The twilight zone, where only small amounts of light can penetrate.'
        },
        {
            depth: 3300,
            fade: 4500,
            scrollMod: 5,
            title: 'The Bathypelagic Zone',
            text: 'The midnight zone. No light from the surface can make it down here; the only light is from bioluminescent organisms.'
        }
    ];

    const facts = [{
        depth: 350,
        fade: 500,
        text: 'Because sunlight is plentiful here, life is abundant. 90% of marine life lives in this zone, and many organisms in deeper zones depend on food generated up here.'
    }];

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\App.svelte generated by Svelte v3.37.0 */

    const { window: window_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    // (61:1) {#if scrollY<190}
    function create_if_block_4(ctx) {
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text("dive");

    			set_style(h1, "top", (/*scrollY*/ ctx[0] < 190
    			? /*scrollY*/ ctx[0] > 50
    				? 0 - /*scrollY*/ ctx[0] + 50
    				: 0
    			: -100) + "px");

    			set_style(h1, "opacity", /*scrollY*/ ctx[0] > 120
    			? 1 - (/*scrollY*/ ctx[0] - 120) / 20
    			: 1);

    			attr_dev(h1, "class", "svelte-1sjbpbz");
    			add_location(h1, file, 61, 1, 2318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*scrollY*/ 1) {
    				set_style(h1, "top", (/*scrollY*/ ctx[0] < 190
    				? /*scrollY*/ ctx[0] > 50
    					? 0 - /*scrollY*/ ctx[0] + 50
    					: 0
    				: -100) + "px");
    			}

    			if (dirty & /*scrollY*/ 1) {
    				set_style(h1, "opacity", /*scrollY*/ ctx[0] > 120
    				? 1 - (/*scrollY*/ ctx[0] - 120) / 20
    				: 1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(61:1) {#if scrollY<190}",
    		ctx
    	});

    	return block;
    }

    // (65:1) {#if feet}
    function create_if_block_3(ctx) {
    	let h3;
    	let t0_value = Math.trunc(/*scrollY*/ ctx[0]) + "";
    	let t0;
    	let t1;
    	let span;
    	let h3_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			span.textContent = "ft.";
    			attr_dev(span, "class", "unit svelte-1sjbpbz");
    			add_location(span, file, 65, 122, 2607);

    			set_style(h3, "margin-top", (/*scrollY*/ ctx[0] < 190
    			? /*scrollY*/ ctx[0] > 50
    				? 150 - /*scrollY*/ ctx[0] + 50
    				: 150
    			: 10) + "px");

    			attr_dev(h3, "class", "svelte-1sjbpbz");
    			add_location(h3, file, 65, 1, 2486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, span);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*toggleUnit*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*scrollY*/ 1 && t0_value !== (t0_value = Math.trunc(/*scrollY*/ ctx[0]) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*scrollY*/ 1) {
    				set_style(h3, "margin-top", (/*scrollY*/ ctx[0] < 190
    				? /*scrollY*/ ctx[0] > 50
    					? 150 - /*scrollY*/ ctx[0] + 50
    					: 150
    				: 10) + "px");
    			}
    		},
    		i: function intro(local) {
    			if (!h3_intro) {
    				add_render_callback(() => {
    					h3_intro = create_in_transition(h3, fade, {});
    					h3_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(65:1) {#if feet}",
    		ctx
    	});

    	return block;
    }

    // (68:1) {#if !feet}
    function create_if_block_2(ctx) {
    	let h3;
    	let t0_value = Math.trunc(/*scrollY*/ ctx[0] * 0.3048) + "";
    	let t0;
    	let t1;
    	let span;
    	let h3_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			span.textContent = "m.";
    			attr_dev(span, "class", "unit svelte-1sjbpbz");
    			add_location(span, file, 68, 132, 2816);

    			set_style(h3, "margin-top", (/*scrollY*/ ctx[0] < 190
    			? /*scrollY*/ ctx[0] > 50
    				? 150 - /*scrollY*/ ctx[0] + 50
    				: 150
    			: 10) + "px");

    			attr_dev(h3, "class", "svelte-1sjbpbz");
    			add_location(h3, file, 68, 1, 2685);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, span);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*toggleUnit*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*scrollY*/ 1 && t0_value !== (t0_value = Math.trunc(/*scrollY*/ ctx[0] * 0.3048) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*scrollY*/ 1) {
    				set_style(h3, "margin-top", (/*scrollY*/ ctx[0] < 190
    				? /*scrollY*/ ctx[0] > 50
    					? 150 - /*scrollY*/ ctx[0] + 50
    					: 150
    				: 10) + "px");
    			}
    		},
    		i: function intro(local) {
    			if (!h3_intro) {
    				add_render_callback(() => {
    					h3_intro = create_in_transition(h3, fade, {});
    					h3_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(68:1) {#if !feet}",
    		ctx
    	});

    	return block;
    }

    // (72:1) {#if zone.depth <= scrollY && zone.fade>=scrollY}
    function create_if_block_1(ctx) {
    	let header;
    	let h2;
    	let t0_value = /*zone*/ ctx[17].title + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*zone*/ ctx[17].text + "";
    	let t2;
    	let header_transition;
    	let current;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			add_location(h2, file, 73, 2, 2981);
    			add_location(p, file, 74, 2, 3005);
    			attr_dev(header, "class", "svelte-1sjbpbz");
    			add_location(header, file, 72, 1, 2954);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h2);
    			append_dev(h2, t0);
    			append_dev(header, t1);
    			append_dev(header, p);
    			append_dev(p, t2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, true);
    				header_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, false);
    			header_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching && header_transition) header_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(72:1) {#if zone.depth <= scrollY && zone.fade>=scrollY}",
    		ctx
    	});

    	return block;
    }

    // (71:1) {#each zones as zone}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*zone*/ ctx[17].depth <= /*scrollY*/ ctx[0] && /*zone*/ ctx[17].fade >= /*scrollY*/ ctx[0] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*zone*/ ctx[17].depth <= /*scrollY*/ ctx[0] && /*zone*/ ctx[17].fade >= /*scrollY*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*scrollY*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(71:1) {#each zones as zone}",
    		ctx
    	});

    	return block;
    }

    // (80:1) {#if fact.depth <= scrollY && fact.fade>=scrollY}
    function create_if_block(ctx) {
    	let header;
    	let p;
    	let t0_value = /*fact*/ ctx[14].text + "";
    	let t0;
    	let t1;
    	let header_transition;
    	let current;

    	const block = {
    		c: function create() {
    			header = element("header");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(p, file, 81, 2, 3153);
    			attr_dev(header, "class", "svelte-1sjbpbz");
    			add_location(header, file, 80, 1, 3126);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, p);
    			append_dev(p, t0);
    			append_dev(header, t1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, true);
    				header_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!header_transition) header_transition = create_bidirectional_transition(header, fade, {}, false);
    			header_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching && header_transition) header_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(80:1) {#if fact.depth <= scrollY && fact.fade>=scrollY}",
    		ctx
    	});

    	return block;
    }

    // (79:1) {#each facts as fact}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*fact*/ ctx[14].depth <= /*scrollY*/ ctx[0] && /*fact*/ ctx[14].fade >= /*scrollY*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*fact*/ ctx[14].depth <= /*scrollY*/ ctx[0] && /*fact*/ ctx[14].fade >= /*scrollY*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*scrollY*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(79:1) {#each facts as fact}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let canvas_1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*scrollY*/ ctx[0] < 190 && create_if_block_4(ctx);
    	let if_block1 = /*feet*/ ctx[2] && create_if_block_3(ctx);
    	let if_block2 = !/*feet*/ ctx[2] && create_if_block_2(ctx);
    	let each_value_1 = zones;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = facts;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			canvas_1 = element("canvas");
    			set_style(main, "background-color", "rgb(" + /*r*/ ctx[3] + ", " + /*g*/ ctx[4] + ", " + /*b*/ ctx[5] + ")");
    			attr_dev(main, "class", "svelte-1sjbpbz");
    			add_location(main, file, 59, 0, 2246);
    			attr_dev(canvas_1, "class", "svelte-1sjbpbz");
    			add_location(canvas_1, file, 86, 0, 3207);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t0);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t1);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(main, null);
    			}

    			append_dev(main, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			insert_dev(target, t4, anchor);
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[10](canvas_1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "wheel", /*handleScroll*/ ctx[7], false, false, false),
    					listen_dev(window_1, "touchmove", /*handleTouchMove*/ ctx[9], false, false, false),
    					listen_dev(window_1, "touchstart", /*handleTouchStart*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*scrollY*/ ctx[0] < 190) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(main, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*feet*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*feet*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!/*feet*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*feet*/ 4) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*zones, scrollY*/ 1) {
    				each_value_1 = zones;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(main, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*facts, scrollY*/ 1) {
    				each_value = facts;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(main, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*r, g, b*/ 56) {
    				set_style(main, "background-color", "rgb(" + /*r*/ ctx[3] + ", " + /*g*/ ctx[4] + ", " + /*b*/ ctx[5] + ")");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[10](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let b;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	var scrollY = 0;
    	let canvas;

    	let feet = true,
    		toggleUnit = () => {
    			$$invalidate(2, feet = !feet);
    		};

    	let touchStartY, touchStartScroll;
    	let r, g;
    	let scrollMod = 1;

    	let handleScroll = e => {
    		$$invalidate(0, scrollY += Math.trunc(e.deltaY / 30 * scrollMod));
    		$$invalidate(0, scrollY = scrollY >= 0 ? scrollY <= 25000 ? scrollY : 25000 : 0);
    	};

    	let handleTouchStart = e => {
    		touchStartY = e.touches[0].screenY;
    		touchStartScroll = scrollY;
    	};

    	let handleTouchMove = e => {
    		let scrollAmount = touchStartScroll + (touchStartY - e.touches[0].screenY) / 7 * scrollMod;

    		$$invalidate(0, scrollY = scrollAmount >= 0
    		? scrollAmount <= 25000 ? scrollAmount : 25000
    		: 0);
    	};

    	onMount(() => {
    		$$invalidate(1, canvas.width = window.innerWidth, canvas);
    		$$invalidate(1, canvas.height = window.innerHeight, canvas);

    		let randomPositions = [...Array(Math.trunc(0.00009 * canvas.width * canvas.height)).keys()].map(i => [
    			Math.random() * canvas.width,
    			Math.random() * canvas.height,
    			2 + Math.random() * 2
    		]);

    		const fps = new FpsCtrl(30, move);
    		fps.start();

    		function move() {
    			if (canvas.width != window.innerWidth || canvas.height != window.innerHeight) {
    				$$invalidate(1, canvas.width = window.innerWidth, canvas);
    				$$invalidate(1, canvas.height = window.innerHeight, canvas);

    				randomPositions = [...Array(Math.trunc(0.00009 * canvas.width * canvas.height)).keys()].map(i => [
    					Math.random() * canvas.width,
    					Math.random() * canvas.height,
    					2 + Math.random() * 2
    				]);
    			}

    			const ctx = canvas.getContext("2d");
    			ctx.clearRect(0, 0, canvas.width, canvas.height);
    			ctx.fillStyle = "rgba(255,255,255,.7)";
    			ctx.filter = "blur(3px)";

    			for (let i = 0; i < randomPositions.length; i++) {
    				randomPositions[i][0] += Math.random() < 0.5 ? -0.05 : 0.05;
    				randomPositions[i][1] += Math.random() < 0.5 ? -0.05 : 0.05;
    				ctx.beginPath();
    				ctx.arc(randomPositions[i][0], randomPositions[i][1], randomPositions[i][2], 0, Math.PI * 2);
    				ctx.fill();
    			}
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(1, canvas);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		FpsCtrl,
    		zones,
    		facts,
    		fade,
    		fly,
    		scrollY,
    		canvas,
    		feet,
    		toggleUnit,
    		touchStartY,
    		touchStartScroll,
    		r,
    		g,
    		scrollMod,
    		handleScroll,
    		handleTouchStart,
    		handleTouchMove,
    		b
    	});

    	$$self.$inject_state = $$props => {
    		if ("scrollY" in $$props) $$invalidate(0, scrollY = $$props.scrollY);
    		if ("canvas" in $$props) $$invalidate(1, canvas = $$props.canvas);
    		if ("feet" in $$props) $$invalidate(2, feet = $$props.feet);
    		if ("toggleUnit" in $$props) $$invalidate(6, toggleUnit = $$props.toggleUnit);
    		if ("touchStartY" in $$props) touchStartY = $$props.touchStartY;
    		if ("touchStartScroll" in $$props) touchStartScroll = $$props.touchStartScroll;
    		if ("r" in $$props) $$invalidate(3, r = $$props.r);
    		if ("g" in $$props) $$invalidate(4, g = $$props.g);
    		if ("scrollMod" in $$props) scrollMod = $$props.scrollMod;
    		if ("handleScroll" in $$props) $$invalidate(7, handleScroll = $$props.handleScroll);
    		if ("handleTouchStart" in $$props) $$invalidate(8, handleTouchStart = $$props.handleTouchStart);
    		if ("handleTouchMove" in $$props) $$invalidate(9, handleTouchMove = $$props.handleTouchMove);
    		if ("b" in $$props) $$invalidate(5, b = $$props.b);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scrollY*/ 1) {
    			$$invalidate(5, b = 510 - scrollY * 0.74695121951);
    		}

    		if ($$self.$$.dirty & /*scrollY*/ 1) {
    			scrollMod = scrollY >= 0
    			? scrollY < 650
    				? 1
    				: scrollY < 1000
    					? 4
    					: scrollY < 3300 ? 10 : scrollY < 13000 ? 20 : 40
    			: 1;
    		}

    		if ($$self.$$.dirty & /*scrollY*/ 1) {
    			$$invalidate(3, r = $$invalidate(4, g = 230 - scrollY * 0.74695121951));
    		}
    	};

    	return [
    		scrollY,
    		canvas,
    		feet,
    		r,
    		g,
    		b,
    		toggleUnit,
    		handleScroll,
    		handleTouchStart,
    		handleTouchMove,
    		canvas_1_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
