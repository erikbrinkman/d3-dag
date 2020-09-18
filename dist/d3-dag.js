// d3-dag Version 0.4.1. Copyright 2020 Erik Brinkman.
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('fs'), require('child_process')) :
    typeof define === 'function' && define.amd ? define(['exports', 'fs', 'child_process'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.d3 = global.d3 || {}, global.fs, global.child_process));
}(this, (function (exports, require$$1, require$$2) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var require$$1__default = /*#__PURE__*/_interopDefaultLegacy(require$$1);
    var require$$2__default = /*#__PURE__*/_interopDefaultLegacy(require$$2);

    class LazyFluentIterator {
        constructor(base) {
            this.base = base;
        }
        [Symbol.iterator]() {
            return this;
        }
        next() {
            const { value, done } = this.base.next();
            if (done) {
                return { value: undefined, done: true };
            }
            else {
                return { value, done: false };
            }
        }
        concat(...others) {
            return new LazyFluentIterator((function* (iters) {
                for (const iter of iters) {
                    yield* iter;
                }
            })([this, ...others.map(fluent)]));
        }
        entries() {
            return new LazyFluentIterator((function* (iter) {
                let index = 0;
                for (const element of iter) {
                    yield [index++, element];
                }
            })(this));
        }
        every(callback) {
            return !this.some((elem, ind) => !callback(elem, ind));
        }
        fill(val) {
            return this.map(() => val);
        }
        filter(callback) {
            return new LazyFluentIterator((function* (iter) {
                for (const [index, element] of iter) {
                    if (callback(element, index)) {
                        yield element;
                    }
                }
            })(this.entries()));
        }
        find(callback) {
            for (const [index, element] of this.entries()) {
                if (callback(element, index)) {
                    return element;
                }
            }
            return undefined;
        }
        findIndex(callback) {
            for (const [index, element] of this.entries()) {
                if (callback(element, index)) {
                    return index;
                }
            }
            return -1;
        }
        flatMap(callback) {
            return new LazyFluentIterator((function* (iter) {
                for (const [index, element] of iter) {
                    yield* fluent(callback(element, index));
                }
            })(this.entries()));
        }
        forEach(callback) {
            for (const [index, element] of this.entries()) {
                callback(element, index);
            }
        }
        includes(query, fromIndex = 0) {
            return this.indexOf(query, fromIndex) >= 0;
        }
        indexOf(query, fromIndex = 0) {
            if (fromIndex < 0) {
                throw new Error(`fromIndex doesn't support negative numbers because generator length isn't known`);
            }
            for (const [index, element] of this.entries()) {
                if (index >= fromIndex && element === query) {
                    return index;
                }
            }
            return -1;
        }
        join(separator = ",") {
            return [...this].join(separator);
        }
        keys() {
            return new LazyFluentIterator((function* (iter) {
                let index = 0;
                for (const _ of iter) {
                    yield index++;
                }
            })(this));
        }
        lastIndexOf(query, fromIndex = Infinity) {
            if (fromIndex < 0) {
                throw new Error(`fromIndex doesn't support negative numbers because generator length isn't known`);
            }
            let lastIndex = -1;
            for (const [index, element] of this.entries()) {
                if (index <= fromIndex && element === query) {
                    lastIndex = index;
                }
            }
            return lastIndex;
        }
        get length() {
            return this.reduce((a) => a + 1, 0);
        }
        map(callback) {
            return new LazyFluentIterator((function* (iter) {
                for (const [index, element] of iter) {
                    yield callback(element, index);
                }
            })(this.entries()));
        }
        reduce(callback, initialValue) {
            if (initialValue === undefined) {
                const call = callback;
                let first = true;
                let accumulator = undefined;
                for (const [index, element] of this.entries()) {
                    if (first) {
                        accumulator = element;
                        first = false;
                    }
                    else {
                        accumulator = call(accumulator, element, index);
                    }
                }
                if (first) {
                    throw new TypeError("Reduce of empty iterable with no initial value");
                }
                return accumulator;
            }
            else {
                const call = callback;
                let accumulator = initialValue;
                for (const [index, element] of this.entries()) {
                    accumulator = call(accumulator, element, index);
                }
                return accumulator;
            }
        }
        reverse() {
            return fluent([...this].reverse());
        }
        slice(start = 0, end = Infinity) {
            return new LazyFluentIterator((function* (iter) {
                for (const [index, element] of iter) {
                    if (index < start) ;
                    else if (index < end) {
                        yield element;
                    }
                    else {
                        break; // no more elements
                    }
                }
            })(this.entries()));
        }
        some(callback) {
            for (const [index, element] of this.entries()) {
                if (callback(element, index)) {
                    return true;
                }
            }
            return false;
        }
        sort(compare) {
            return fluent([...this].sort(compare));
        }
        splice(start, deleteCount = 0, ...items) {
            return new LazyFluentIterator((function* (iter) {
                for (const [index, element] of iter) {
                    if (index === start) {
                        yield* items;
                    }
                    if (index < start || index >= start + deleteCount) {
                        yield element;
                    }
                }
            })(this.entries()));
        }
        values() {
            return this;
        }
    }
    function isIterable(seq) {
        return typeof seq[Symbol.iterator] === "function";
    }
    function fluent(seq) {
        if (isIterable(seq)) {
            return new LazyFluentIterator(seq[Symbol.iterator]());
        }
        else {
            return new LazyFluentIterator(seq);
        }
    }

    /** helper for verifying things aren't undefined */
    function def(val) {
        /* istanbul ignore else: only for unaccounted for errors */
        if (val !== undefined) {
            return val;
        }
        else {
            throw new Error("got unexpected undefined value");
        }
    }
    /** determines if two sets intersect */
    function setIntersect(first, second) {
        if (second.size < first.size) {
            [second, first] = [first, second];
        }
        for (const element of first) {
            if (second.has(element)) {
                return true;
            }
        }
        return false;
    }
    /** map with extra convenience functions */
    class SafeMap extends Map {
        /** throw an error if key not in map */
        getThrow(key) {
            const value = this.get(key);
            if (value === undefined) {
                throw new Error(`map doesn't contain key: ${key}`);
            }
            else {
                return value;
            }
        }
        /** get with a default if key is not present */
        getDefault(key, def) {
            const value = this.get(key);
            if (value === undefined) {
                return def;
            }
            else {
                return value;
            }
        }
        /** get with a default, but also set default */
        setIfAbsent(key, def) {
            const value = this.get(key);
            if (value === undefined) {
                this.set(key, def);
                return def;
            }
            else {
                return value;
            }
        }
    }

    /**
     * A [[Dag]] is simply a collection of [[DagNode]]s, defined by every reachable
     * child node from the current returned node.  If a DAG contains multiple
     * roots, then the returned node will be a [[DagRoot]] that links to all nodes.
     * Each child node on its own will function as a valid DAG with a single root.
     * All DAGs are also iterators over all of their nodes.
     *
     * Three methods exist to turn existing data into [[Dag]]s:
     * 1. [["dag/hierarchy" | dagHierarchy]] - when the data already has a dag structure.
     * 2. [["dag/stratify" | dagStratify ]] - when the dag has a tabular structure, referencing parents by id.
     * 3. [["dag/connect" | dagConnect ]] - when the dag has a link structure and is specified as pairs of nodes.
     *
     * Methods names preceeded by an `i` will return a [[FluentIterator]] which is
     * a wrapper around native EMCA iterators that also adds most methods found in
     * the `Array` prototype making them much more useful for fluent functional
     * programming.
     *
     * @packageDocumentation
     */
    /** @internal */
    class LayoutChildLink {
        constructor(child, data, points = []) {
            this.child = child;
            this.data = data;
            this.points = points;
        }
    }
    /**
     * The concrete class backing the [[Link]] interface.
     */
    class LayoutLink {
        constructor(source, target, 
        // NOTE this is a trick to not have to parametrize Links, and therefore
        // DagRoot, and therefore Dag by LinkDatum, when the NodeType implcitely
        // defines it
        data, points) {
            this.source = source;
            this.target = target;
            this.data = data;
            this.points = points;
        }
    }
    /**
     * The concreate implementation of [[DagNode]], this forwards most calls to a
     * singleton [[LayoutDagRoot]] with the exception of children methods, as
     * [[DagRoot]]s don't have children.
     */
    class LayoutDagNode {
        constructor(id, data) {
            this.id = id;
            this.data = data;
            this.dataChildren = [];
        }
        /** An iterator of this node. */
        iroots() {
            return fluent([this]);
        }
        /** An array of this node. */
        roots() {
            return [this];
        }
        *iterChildren() {
            for (const { child } of this.dataChildren) {
                yield child;
            }
        }
        /** An iterator of this node's children. */
        ichildren() {
            return fluent(this.iterChildren());
        }
        /** An array of this node's children. */
        children() {
            return [...this.ichildren()];
        }
        *iterChildLinks() {
            for (const { child, data, points } of this.dataChildren) {
                yield new LayoutLink(this, child, data, points);
            }
        }
        /** An iterator of links between this node and its children. */
        ichildLinks() {
            return fluent(this.iterChildLinks());
        }
        /** An array of links between this node and its children. */
        childLinks() {
            return [...this.ichildLinks()];
        }
        [Symbol.iterator]() {
            return new LayoutDagRoot([this])[Symbol.iterator]();
        }
        idescendants(style = "depth") {
            return new LayoutDagRoot([this]).idescendants(style);
        }
        descendants(style = "depth") {
            return [...this.idescendants(style)];
        }
        ilinks() {
            return new LayoutDagRoot([this]).ilinks();
        }
        links() {
            return [...this.ilinks()];
        }
        size() {
            return new LayoutDagRoot([this]).size();
        }
        sum(callback) {
            new LayoutDagRoot([this]).sum(callback);
            return this;
        }
        count() {
            new LayoutDagRoot([this]).count();
            return this;
        }
        height() {
            new LayoutDagRoot([this]).height();
            return this;
        }
        depth() {
            new LayoutDagRoot([this]).depth();
            return this;
        }
        split() {
            return [this];
        }
        connected() {
            return true;
        }
    }
    /**
     * The concrete implementation backing [[DagRoot]] which also contains the
     * implementation of most methods in [[DagNode]].
     */
    class LayoutDagRoot {
        constructor(dagRoots) {
            this.dagRoots = dagRoots;
        }
        [Symbol.iterator]() {
            return this.idepth();
        }
        /**
         * This returns an iterator over every root in the [[Dag]]. Since
         * [[DagNode]]s return themselves for this call, this can be an easy way to
         * turn a [[Dag]] into an array of [[DagNode]]s.
         */
        iroots() {
            return fluent(this.dagRoots);
        }
        /** Returns an array of roots. */
        roots() {
            return this.dagRoots.slice();
        }
        *idepth() {
            const queue = this.roots();
            const seen = new Set();
            let node;
            while ((node = queue.pop())) {
                if (!seen.has(node.id)) {
                    seen.add(node.id);
                    yield node;
                    queue.push(...node.ichildren());
                }
            }
        }
        *ibreadth() {
            const seen = new Set();
            let next = this.roots();
            let current = [];
            do {
                current = next.reverse();
                next = [];
                let node;
                while ((node = current.pop())) {
                    if (!seen.has(node.id)) {
                        seen.add(node.id);
                        yield node;
                        next.push(...node.ichildren());
                    }
                }
            } while (next.length);
        }
        *ibefore() {
            const numBefore = new SafeMap();
            for (const node of this) {
                for (const child of node.ichildren()) {
                    numBefore.set(child.id, numBefore.getDefault(child.id, 0) + 1);
                }
            }
            const queue = this.roots();
            let node;
            while ((node = queue.pop())) {
                yield node;
                for (const child of node.ichildren()) {
                    const before = numBefore.getThrow(child.id);
                    if (before > 1) {
                        numBefore.set(child.id, before - 1);
                    }
                    else {
                        queue.push(child);
                    }
                }
            }
        }
        *iafter() {
            const queue = this.roots();
            const seen = new Set();
            let node;
            while ((node = queue.pop())) {
                if (seen.has(node.id)) ;
                else if (node.ichildren().every((c) => seen.has(c.id))) {
                    seen.add(node.id);
                    yield node;
                }
                else {
                    queue.push(node); // need to revisit after children
                    queue.push(...node.ichildren());
                }
            }
        }
        /**
         * Returns an iterator over all descendants of this node, e.g. every node in
         * the [[Dag]]. An [[IterStyle]] can be passed in to influence the iteration
         * order, the default (`'depth'`) should generally be the fastest, but note
         * that in general, traversal in a DAG takes linear space as we need to track
         * what nodes we've already visited.
         *
         * - 'depth' - starting from the left most root, visit a nodes left most
         *   child, progressing down to children before yielding any other node.
         * - 'breadth' - starting from the left most root, yield each of it's
         *   children, before yielding the children of its left most child.
         * - 'before' - yield all of the roots, progressing downward, never yielding
         *   a node before all of its parents have been yielded.
         * - 'after' - yield all leaf nodes, progressing upward, never yielding a
         *   node before all of its parents have been yielded.
         */
        idescendants(style = "depth") {
            if (style === "depth") {
                return fluent(this.idepth());
            }
            else if (style === "breadth") {
                return fluent(this.ibreadth());
            }
            else if (style === "before") {
                return fluent(this.ibefore());
            }
            else if (style === "after") {
                return fluent(this.iafter());
            }
            else {
                throw new Error(`unknown iteration style: ${style}`);
            }
        }
        /** Returns an array of [[idescendants]]. */
        descendants(style = "depth") {
            return [...this.idescendants(style)];
        }
        /** Returns an iterator over every [[Link]] in the DAG. */
        ilinks() {
            return this.idescendants().flatMap((node) => node.ichildLinks());
        }
        /** Returns an array of [[ilinks]]. */
        links() {
            return [...this.ilinks()];
        }
        /** Counts the number of nodes in the DAG. */
        size() {
            return this.idescendants().reduce((s) => s + 1, 0);
        }
        /**
         * Provide a callback that computes a number for each node, then set a node's
         * value to the sum of this number for this node and all of its descendants.
         *
         * This method returns [[ValuedNode]]s that also have a value property.
         */
        sum(callback) {
            const descendantVals = new SafeMap();
            for (const [index, node] of this.idescendants("after").entries()) {
                const val = callback(node, index);
                const nodeVals = new SafeMap();
                nodeVals.set(node.id, val);
                for (const child of node.ichildren()) {
                    const childMap = descendantVals.getThrow(child.id);
                    for (const [nid, v] of childMap.entries()) {
                        nodeVals.set(nid, v);
                    }
                }
                node.value = fluent(nodeVals.entries())
                    .map(([, v]) => v)
                    .reduce((a, b) => a + b);
                descendantVals.set(node.id, nodeVals);
            }
            return this;
        }
        /**
         * Set the value of each node to be the number of leaves beneath the node.
         * If this node is a leaf, its value is one.
         *
         * This method returns [[ValuedNode]]s that also have a value property.
         */
        count() {
            const leaves = new SafeMap();
            for (const node of this.idescendants("after")) {
                if (node.ichildren().next().done) {
                    leaves.set(node.id, new Set([node.id]));
                    node.value = 1;
                }
                else {
                    const nodeLeaves = new Set();
                    for (const child of node.ichildren()) {
                        const childLeaves = leaves.getThrow(child.id);
                        for (const leaf of childLeaves) {
                            nodeLeaves.add(leaf);
                        }
                    }
                    leaves.set(node.id, nodeLeaves);
                    node.value = nodeLeaves.size;
                }
            }
            return this;
        }
        /**
         * Assign each node a value equal to its longest distance from a root.
         *
         * This method returns [[ValuedNode]]s that also have a value property.
         */
        height() {
            for (const node of this.idescendants("after")) {
                node.value = Math.max(0, ...node.ichildren().map((child) => {
                    /* istanbul ignore next */
                    if (child.value === undefined) {
                        throw new Error("`after` iteration didn't iterate in after order");
                    }
                    else {
                        return child.value + 1;
                    }
                }));
            }
            return this;
        }
        /**
         * Assign each node a value equal to its longest distance to a leaf.
         *
         * This method returns [[ValuedNode]]s that also have a value property.
         */
        depth() {
            const parents = new SafeMap();
            for (const node of this) {
                for (const child of node.ichildren()) {
                    parents.setIfAbsent(child.id, []).push(node);
                }
            }
            for (const node of this.idescendants("before")) {
                node.value = Math.max(0, ...parents.getDefault(node.id, []).map((par) => {
                    /* istanbul ignore next */
                    if (par.value === undefined) {
                        throw new Error("`before` iteration didn't iterate in before order");
                    }
                    else {
                        return par.value + 1;
                    }
                }));
            }
            return this;
        }
        /**
         * Returns an array of connected DAGs, splitting the DAG into several
         * components if its dosconnected.
         */
        split() {
            // construct a graph between root nodes with edges if they share
            // descendants
            const children = new SafeMap();
            const descendants = new SafeMap();
            for (const root of this.iroots()) {
                children.set(root.id, []);
                descendants.set(root.id, new Set(root.idescendants().map((n) => n.id)));
            }
            for (const [i, source] of this.iroots().entries()) {
                const sourceCov = descendants.getThrow(source.id);
                for (const target of this.iroots().slice(i + 1)) {
                    const targetCov = descendants.getThrow(target.id);
                    if (setIntersect(sourceCov, targetCov)) {
                        children.getThrow(source.id).push(target);
                        children.getThrow(target.id).push(source);
                    }
                }
            }
            // now run dfs to collect connected components
            const splitRoots = [];
            const seen = new Set();
            for (const root of this.iroots()) {
                if (!seen.has(root.id)) {
                    seen.add(root.id);
                    const connected = [root];
                    splitRoots.push(connected);
                    const queue = children.getThrow(root.id).slice();
                    let node;
                    while ((node = queue.pop())) {
                        if (!seen.has(node.id)) {
                            seen.add(node.id);
                            connected.push(node);
                            queue.push(...children.getThrow(node.id));
                        }
                    }
                }
            }
            return splitRoots.map((sroots) => sroots.length > 1 ? new LayoutDagRoot(sroots) : sroots[0]);
        }
        /**
         * Return true if every node in the dag is reachable from every other.
         */
        connected() {
            return this.split().length === 1;
        }
    }

    /**
     * This wraps the logic to verify DAGs are valid, and is shared by the three
     * construction methods.
     *
     * @packageDocumentation
     */
    /** @internal Verify an ID is a valid ID. */
    function verifyId(id) {
        if (typeof id !== "string") {
            throw new Error(`id is supposed to be string but got type ${typeof id}`);
        }
        else if (id.indexOf("\0") >= 0) {
            throw new Error(`node id ${id} contained null character`);
        }
        return id;
    }
    /** @internal Verify a DAG is valid. */
    function verifyDag(roots) {
        // test that there are roots
        if (!roots.length)
            throw new Error("dag contained no roots");
        // test that dag is free of cycles
        // we attempt to take every unique path from each root and see if we ever see
        // a node again
        const seen = new Set(); // already processed
        const past = new Set(); // seen down this path
        let rec = null;
        function visit(node) {
            if (seen.has(node.id)) {
                return [];
            }
            else if (past.has(node.id)) {
                rec = node.id;
                return [node.id];
            }
            else {
                past.add(node.id);
                let result = [];
                for (const child of node.ichildren()) {
                    result = visit(child);
                    if (result.length)
                        break;
                }
                past.delete(node.id);
                seen.add(node.id);
                if (result.length && rec !== null)
                    result.push(node.id);
                if (rec === node.id)
                    rec = null;
                return result;
            }
        }
        for (const root of roots) {
            const msg = visit(root);
            if (msg.length) {
                throw new Error("dag contained a cycle: " + msg.reverse().join(" -> "));
            }
        }
        // make sure there's no duplicate edges
        for (const node of new LayoutDagRoot(roots)) {
            const childIdSet = new Set(node.ichildren().map((n) => n.id));
            if (childIdSet.size !== node.dataChildren.length) {
                throw new Error(`node '${node.id}' contained duplicate children`);
            }
        }
    }

    /**
     * You can rearrange tabularesque data into a [[Dag]] using [[stratify]], which
     * will create a default [[StratifyOperator]].
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator(idOp, parentIdsOp, parentDataOp) {
        function stratify(data) {
            if (!data.length)
                throw new Error("can't stratify empty data");
            const nodes = data.map((datum, i) => new LayoutDagNode(verifyId(idOp(datum, i)), datum));
            const mapping = new Map();
            nodes.forEach((node) => {
                if (mapping.has(node.id)) {
                    throw new Error(`found a duplicate id: ${node.id}`);
                }
                else {
                    mapping.set(node.id, node);
                }
            });
            const roots = [];
            nodes.forEach((node, i) => {
                const pData = parentDataOp(node.data, i) || [];
                pData.forEach(([pid, linkData]) => {
                    const par = mapping.get(pid);
                    if (!par)
                        throw new Error(`missing id: ${pid}`);
                    par.dataChildren.push(new LayoutChildLink(node, linkData));
                    return par;
                });
                if (!pData.length) {
                    roots.push(node);
                }
            });
            verifyDag(roots);
            return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
        }
        function id(idGet) {
            if (idGet === undefined) {
                return idOp;
            }
            else {
                return buildOperator(idGet, parentIdsOp, parentDataOp);
            }
        }
        stratify.id = id;
        function parentData(data) {
            if (data === undefined) {
                return parentDataOp;
            }
            else {
                return buildOperator(idOp, wrapParentData(data), data);
            }
        }
        stratify.parentData = parentData;
        function parentIds(ids) {
            if (ids === undefined) {
                return parentIdsOp;
            }
            else {
                return buildOperator(idOp, ids, wrapParentIds(ids));
            }
        }
        stratify.parentIds = parentIds;
        return stratify;
    }
    /** @internal */
    function wrapParentIds(parentIds) {
        function wrapped(d, i) {
            return (parentIds(d, i) || []).map((id) => [id, undefined]);
        }
        wrapped.wrapped = parentIds;
        return wrapped;
    }
    /** @internal */
    function wrapParentData(parentData) {
        function wrapped(d, i) {
            return (parentData(d, i) || []).map(([id]) => id);
        }
        wrapped.wrapped = parentData;
        return wrapped;
    }
    /** @internal */
    function hasId(d) {
        try {
            return typeof d.id === "string";
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultId(d) {
        if (hasId(d)) {
            return d.id;
        }
        else {
            throw new Error(`default id function expected datum to have an id field but got: ${d}`);
        }
    }
    /** @internal */
    function hasParentIds(d) {
        try {
            const parentIds = d.parentIds;
            return (parentIds === undefined ||
                (parentIds instanceof Array &&
                    parentIds.every((id) => typeof id === "string")));
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultParentIds(d) {
        if (hasParentIds(d)) {
            return d.parentIds;
        }
        else {
            throw new Error(`default parentIds function expected datum to have a parentIds field but got: ${d}`);
        }
    }
    /**
     * Constructs a new [[StratifyOperator]] with the default settings.
     */
    function stratify(...args) {
        if (args.length) {
            throw Error(`got arguments to dagStratify(${args}), but constructor takes no aruguments. ` +
                "These were probably meant as data which should be called as dagStratify()(...)");
        }
        return buildOperator(defaultId, defaultParentIds, wrapParentIds(defaultParentIds));
    }

    /**
     * You can rearrange raw edge data into a [[Dag]] using [[connect]] to create a
     * default [[ConnectOperator]].
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$1(sourceIdOp, targetIdOp) {
        function connect(data) {
            if (!data.length) {
                throw new Error("can't connect empty data");
            }
            const nodes = new Map();
            const hasParents = new Map();
            for (const [i, datum] of data.entries()) {
                // create dag
                const source = verifyId(sourceIdOp(datum, i));
                let sourceNode = nodes.get(source);
                if (sourceNode === undefined) {
                    sourceNode = new LayoutDagNode(source, undefined);
                    nodes.set(source, sourceNode);
                }
                const target = verifyId(targetIdOp(datum, i));
                let targetNode = nodes.get(target);
                if (targetNode === undefined) {
                    targetNode = new LayoutDagNode(target, undefined);
                    nodes.set(target, targetNode);
                }
                sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));
                // update roots
                hasParents.set(source, hasParents.get(source) || false);
                hasParents.set(target, true);
            }
            const roots = [];
            for (const [id, parents] of hasParents) {
                if (!parents) {
                    roots.push(def(nodes.get(id)));
                }
            }
            verifyDag(roots);
            return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
        }
        function sourceId(id) {
            if (id === undefined) {
                return sourceIdOp;
            }
            else {
                return buildOperator$1(id, targetIdOp);
            }
        }
        connect.sourceId = sourceId;
        function targetId(id) {
            if (id === undefined) {
                return targetIdOp;
            }
            else {
                return buildOperator$1(sourceIdOp, id);
            }
        }
        connect.targetId = targetId;
        return connect;
    }
    /** @internal */
    function isZeroString(d) {
        try {
            return typeof d[0] === "string";
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultSourceId(d) {
        if (isZeroString(d)) {
            return d[0];
        }
        else {
            throw new Error(`default source id expected datum[0] to be a string but got datum: ${d}`);
        }
    }
    /** @internal */
    function isOneString(d) {
        try {
            return typeof d[1] === "string";
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultTargetId(d) {
        if (isOneString(d)) {
            return d[1];
        }
        else {
            throw new Error(`default target id expected datum[1] to be a string but got datum: ${d}`);
        }
    }
    /**
     * Constructs a new [[ConnectOperator]] with the default settings.
     */
    function connect(...args) {
        if (args.length) {
            throw new Error(`got arguments to dagConnect(${args}), but constructor takes no aruguments. ` +
                "These were probably meant as data which should be called as dagConnect()(...)");
        }
        return buildOperator$1(defaultSourceId, defaultTargetId);
    }

    /**
     * Before you can compute a DAG layout, you need a DAG structure.  If your data
     * is already in a DAG structure, you can use the [[hierarchy]] method to
     * generate a default [[HierarchyOperator]] which can then be used to transform
     * your data into a [[Dag]].
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$2(idOp, childrenOp, childrenDataOp) {
        function hierarchy(...data) {
            if (!data.length) {
                throw new Error("must pass in at least one node");
            }
            const mapping = new Map();
            const queue = [];
            function nodify(datum) {
                const idVal = verifyId(idOp(datum));
                let node = mapping.get(idVal);
                if (node === undefined) {
                    node = new LayoutDagNode(idVal, datum);
                    mapping.set(idVal, node);
                    queue.push(node);
                }
                else if (datum !== node.data) {
                    throw new Error(`found duplicate id with different data: ${idVal}`);
                }
                return node;
            }
            const roots = data.map(nodify);
            let node;
            let i = 0;
            while ((node = queue.pop())) {
                node.dataChildren = (childrenDataOp(node.data, i++) || []).map(([childDatum, linkDatum]) => new LayoutChildLink(nodify(childDatum), linkDatum));
            }
            // verifty roots are roots
            const rootIds = new Set(roots.map((r) => r.id));
            for (const node of mapping.values()) {
                if (node.ichildren().some((child) => rootIds.has(child.id))) {
                    throw new Error(`node ${node.id} pointed to a root`);
                }
            }
            // create dag
            verifyDag(roots);
            return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
        }
        function id(idGet) {
            if (idGet === undefined) {
                return idOp;
            }
            else {
                return buildOperator$2(idGet, childrenOp, childrenDataOp);
            }
        }
        hierarchy.id = id;
        function children(childs) {
            if (childs === undefined) {
                return childrenOp;
            }
            else {
                return buildOperator$2(idOp, childs, wrapChildren(childs));
            }
        }
        hierarchy.children = children;
        function childrenData(data) {
            if (data === undefined) {
                return childrenDataOp;
            }
            else {
                return buildOperator$2(idOp, wrapChildrenData(data), data);
            }
        }
        hierarchy.childrenData = childrenData;
        return hierarchy;
    }
    /** @internal */
    function wrapChildren(children) {
        function wrapped(d, i) {
            return (children(d, i) || []).map((d) => [d, undefined]);
        }
        wrapped.wrapped = children;
        return wrapped;
    }
    /** @internal */
    function wrapChildrenData(childrenData) {
        function wrapped(d, i) {
            return (childrenData(d, i) || []).map(([d]) => d);
        }
        wrapped.wrapped = childrenData;
        return wrapped;
    }
    /** @internal */
    function hasId$1(d) {
        try {
            return typeof d.id === "string";
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultId$1(d) {
        if (hasId$1(d)) {
            return d.id;
        }
        else {
            throw new Error(`default id function expected datum to have an id field by got: ${d}`);
        }
    }
    /** @internal */
    function hasChildren(d) {
        try {
            const children = d.children;
            return children === undefined || children instanceof Array;
        }
        catch (_a) {
            return false;
        }
    }
    /** @internal */
    function defaultChildren(d) {
        if (hasChildren(d)) {
            return d.children;
        }
        else {
            throw new Error(`default children function expected datum to have a children field but got: ${d}`);
        }
    }
    /**
     * Constructs a new [[HierarchyOperator]] with default settings.
     *
     * By default ids will be pulled from the `id` property and children will be
     * pulled from the `children` property. Since `children` being undefined is
     * valid, forgetting to set children properly will result in a dag with only a
     * single node.
     */
    function hierarchy(...args) {
        if (args.length) {
            throw Error(`got arguments to dagHierarchy(${args}), but constructor takes no aruguments. ` +
                "These were probably meant as data which should be called as dagHierarchy()(...)");
        }
        return buildOperator$2(defaultId$1, defaultChildren, wrapChildren(defaultChildren));
    }

    /*global module*/

    function Solution(tableau, evaluation, feasible, bounded) {
        this.feasible = feasible;
        this.evaluation = evaluation;
        this.bounded = bounded;
        this._tableau = tableau;
    }
    var Solution_1 = Solution;

    Solution.prototype.generateSolutionSet = function () {
        var solutionSet = {};

        var tableau = this._tableau;
        var varIndexByRow = tableau.varIndexByRow;
        var variablesPerIndex = tableau.variablesPerIndex;
        var matrix = tableau.matrix;
        var rhsColumn = tableau.rhsColumn;
        var lastRow = tableau.height - 1;
        var roundingCoeff = Math.round(1 / tableau.precision);

        for (var r = 1; r <= lastRow; r += 1) {
            var varIndex = varIndexByRow[r];
            var variable = variablesPerIndex[varIndex];
            if (variable === undefined || variable.isSlack === true) {
                continue;
            }

            var varValue = matrix[r][rhsColumn];
            solutionSet[variable.id] =
                Math.round((Number.EPSILON + varValue) * roundingCoeff) / roundingCoeff;
        }

        return solutionSet;
    };

    /*global module*/
    /*global require*/


    function MilpSolution(tableau, evaluation, feasible, bounded, branchAndCutIterations) {
        Solution_1.call(this, tableau, evaluation, feasible, bounded);
        this.iter = branchAndCutIterations;
    }
    var MilpSolution_1 = MilpSolution;
    MilpSolution.prototype = Object.create(Solution_1.prototype);
    MilpSolution.constructor = MilpSolution;

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/



    /*************************************************************
     * Class: Tableau
     * Description: Simplex tableau, holding a the tableau matrix
     *              and all the information necessary to perform
     *              the simplex algorithm
     * Agruments:
     *        precision: If we're solving a MILP, how tight
     *                   do we want to define an integer, given
     *                   that 20.000000000000001 is not an integer.
     *                   (defaults to 1e-8)
     **************************************************************/
    function Tableau(precision) {
        this.model = null;

        this.matrix = null;
        this.width = 0;
        this.height = 0;

        this.costRowIndex = 0;
        this.rhsColumn = 0;

        this.variablesPerIndex = [];
        this.unrestrictedVars = null;

        // Solution attributes
        this.feasible = true; // until proven guilty
        this.evaluation = 0;
        this.simplexIters = 0;

        this.varIndexByRow = null;
        this.varIndexByCol = null;

        this.rowByVarIndex = null;
        this.colByVarIndex = null;

        this.precision = precision || 1e-8;

        this.optionalObjectives = [];
        this.objectivesByPriority = {};

        this.savedState = null;

        this.availableIndexes = [];
        this.lastElementIndex = 0;

        this.variables = null;
        this.nVars = 0;

        this.bounded = true;
        this.unboundedVarIndex = null;

        this.branchAndCutIterations = 0;
    }
    var Tableau_1 = Tableau;

    Tableau.prototype.solve = function () {
        if (this.model.getNumberOfIntegerVariables() > 0) {
            this.branchAndCut();
        } else {
            this.simplex();
        }
        this.updateVariableValues();
        return this.getSolution();
    };

    function OptionalObjective(priority, nColumns) {
        this.priority = priority;
        this.reducedCosts = new Array(nColumns);
        for (var c = 0; c < nColumns; c += 1) {
            this.reducedCosts[c] = 0;
        }
    }

    OptionalObjective.prototype.copy = function () {
        var copy = new OptionalObjective(this.priority, this.reducedCosts.length);
        copy.reducedCosts = this.reducedCosts.slice();
        return copy;
    };

    Tableau.prototype.setOptionalObjective = function (priority, column, cost) {
        var objectiveForPriority = this.objectivesByPriority[priority];
        if (objectiveForPriority === undefined) {
            var nColumns = Math.max(this.width, column + 1);
            objectiveForPriority = new OptionalObjective(priority, nColumns);
            this.objectivesByPriority[priority] = objectiveForPriority;
            this.optionalObjectives.push(objectiveForPriority);
            this.optionalObjectives.sort(function (a, b) {
                return a.priority - b.priority;
            });
        }

        objectiveForPriority.reducedCosts[column] = cost;
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau.prototype.initialize = function (width, height, variables, unrestrictedVars) {
        this.variables = variables;
        this.unrestrictedVars = unrestrictedVars;

        this.width = width;
        this.height = height;


    // console.time("tableau_build");
        // BUILD AN EMPTY ARRAY OF THAT WIDTH
        var tmpRow = new Array(width);
        for (var i = 0; i < width; i++) {
            tmpRow[i] = 0;
        }

        // BUILD AN EMPTY TABLEAU
        this.matrix = new Array(height);
        for (var j = 0; j < height; j++) {
            this.matrix[j] = tmpRow.slice();
        }

    //
    // TODO: Benchmark This
    //this.matrix = new Array(height).fill(0).map(() => new Array(width).fill(0));

    // console.timeEnd("tableau_build");
    // console.log("height",height);
    // console.log("width",width);
    // console.log("------");
    // console.log("");


        this.varIndexByRow = new Array(this.height);
        this.varIndexByCol = new Array(this.width);

        this.varIndexByRow[0] = -1;
        this.varIndexByCol[0] = -1;

        this.nVars = width + height - 2;
        this.rowByVarIndex = new Array(this.nVars);
        this.colByVarIndex = new Array(this.nVars);

        this.lastElementIndex = this.nVars;
    };

    Tableau.prototype._resetMatrix = function () {
        var variables = this.model.variables;
        var constraints = this.model.constraints;

        var nVars = variables.length;
        var nConstraints = constraints.length;

        var v, varIndex;
        var costRow = this.matrix[0];
        var coeff = (this.model.isMinimization === true) ? -1 : 1;
        for (v = 0; v < nVars; v += 1) {
            var variable = variables[v];
            var priority = variable.priority;
            var cost = coeff * variable.cost;
            if (priority === 0) {
                costRow[v + 1] = cost;
            } else {
                this.setOptionalObjective(priority, v + 1, cost);
            }

            varIndex = variables[v].index;
            this.rowByVarIndex[varIndex] = -1;
            this.colByVarIndex[varIndex] = v + 1;
            this.varIndexByCol[v + 1] = varIndex;
        }

        var rowIndex = 1;
        for (var c = 0; c < nConstraints; c += 1) {
            var constraint = constraints[c];

            var constraintIndex = constraint.index;
            this.rowByVarIndex[constraintIndex] = rowIndex;
            this.colByVarIndex[constraintIndex] = -1;
            this.varIndexByRow[rowIndex] = constraintIndex;

            var t, term, column;
            var terms = constraint.terms;
            var nTerms = terms.length;
            var row = this.matrix[rowIndex++];
            if (constraint.isUpperBound) {
                for (t = 0; t < nTerms; t += 1) {
                    term = terms[t];
                    column = this.colByVarIndex[term.variable.index];
                    row[column] = term.coefficient;
                }

                row[0] = constraint.rhs;
            } else {
                for (t = 0; t < nTerms; t += 1) {
                    term = terms[t];
                    column = this.colByVarIndex[term.variable.index];
                    row[column] = -term.coefficient;
                }

                row[0] = -constraint.rhs;
            }
        }
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau.prototype.setModel = function (model) {
        this.model = model;

        var width = model.nVariables + 1;
        var height = model.nConstraints + 1;


        this.initialize(width, height, model.variables, model.unrestrictedVariables);
        this._resetMatrix();
        return this;
    };

    Tableau.prototype.getNewElementIndex = function () {
        if (this.availableIndexes.length > 0) {
            return this.availableIndexes.pop();
        }

        var index = this.lastElementIndex;
        this.lastElementIndex += 1;
        return index;
    };

    Tableau.prototype.density = function () {
        var density = 0;

        var matrix = this.matrix;
        for (var r = 0; r < this.height; r++) {
            var row = matrix[r];
            for (var c = 0; c < this.width; c++) {
                if (row[c] !== 0) {
                    density += 1;
                }
            }
        }

        return density / (this.height * this.width);
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau.prototype.setEvaluation = function () {
        // Rounding objective value
        var roundingCoeff = Math.round(1 / this.precision);
        var evaluation = this.matrix[this.costRowIndex][this.rhsColumn];
        var roundedEvaluation =
            Math.round((Number.EPSILON + evaluation) * roundingCoeff) / roundingCoeff;

        this.evaluation = roundedEvaluation;
        if (this.simplexIters === 0) {
            this.bestPossibleEval = roundedEvaluation;
        }
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau.prototype.getSolution = function () {
        var evaluation = (this.model.isMinimization === true) ?
            this.evaluation : -this.evaluation;

        if (this.model.getNumberOfIntegerVariables() > 0) {
            return new MilpSolution_1(this, evaluation, this.feasible, this.bounded, this.branchAndCutIterations);
        } else {
            return new Solution_1(this, evaluation, this.feasible, this.bounded);
        }
    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/



    //-------------------------------------------------------------------
    // Function: solve
    // Detail: Main function, linear programming solver
    //-------------------------------------------------------------------
    Tableau_1.prototype.simplex = function () {
        // Bounded until proven otherwise
        this.bounded = true;

        // Execute Phase 1 to obtain a Basic Feasible Solution (BFS)
        this.phase1();

        // Execute Phase 2
        if (this.feasible === true) {
            // Running simplex on Initial Basic Feasible Solution (BFS)
            // N.B current solution is feasible
            this.phase2();
        }

        return this;
    };

    //-------------------------------------------------------------------
    // Description: Convert a non standard form tableau
    //              to a standard form tableau by eliminating
    //              all negative values in the Right Hand Side (RHS)
    //              This results in a Basic Feasible Solution (BFS)
    //
    //-------------------------------------------------------------------
    Tableau_1.prototype.phase1 = function () {
        var debugCheckForCycles = this.model.checkForCycles;
        var varIndexesCycle = [];

        var matrix = this.matrix;
        var rhsColumn = this.rhsColumn;
        var lastColumn = this.width - 1;
        var lastRow = this.height - 1;

        var unrestricted;
        var iterations = 0;

        while (true) {
            // ******************************************
            // ** PHASE 1 - STEP  1 : FIND PIVOT ROW **
            //
            // Selecting leaving variable (feasibility condition):
            // Basic variable with most negative value
            //
            // ******************************************
            var leavingRowIndex = 0;
            var rhsValue = -this.precision;
            for (var r = 1; r <= lastRow; r++) {
                unrestricted = this.unrestrictedVars[this.varIndexByRow[r]] === true;
                
                //
                // *Don't think this does anything...
                //
                //if (unrestricted) {
                //    continue;
                //}

                var value = matrix[r][rhsColumn];
                if (value < rhsValue) {
                    rhsValue = value;
                    leavingRowIndex = r;
                }
            }

            // If nothing is strictly smaller than 0; we're done with phase 1.
            if (leavingRowIndex === 0) {
                // Feasible, champagne!
                this.feasible = true;
                return iterations;
            }


            // ******************************************
            // ** PHASE 1 - STEP  2 : FIND PIVOT COLUMN **
            //
            //
            // ******************************************
            // Selecting entering variable
            var enteringColumn = 0;
            var maxQuotient = -Infinity;
            var costRow = matrix[0];
            var leavingRow = matrix[leavingRowIndex];
            for (var c = 1; c <= lastColumn; c++) {
                var coefficient = leavingRow[c];
                //
                // *Don't think this does anything...
                //
                //if (-this.precision < coefficient && coefficient < this.precision) {
                //    continue;
                //}
                //

                unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;
                if (unrestricted || coefficient < -this.precision) {
                    var quotient = -costRow[c] / coefficient;
                    if (maxQuotient < quotient) {
                        maxQuotient = quotient;
                        enteringColumn = c;
                    }
                }
            }

            if (enteringColumn === 0) {
                // Not feasible
                this.feasible = false;
                return iterations;
            }

            if(debugCheckForCycles){
                varIndexesCycle.push([this.varIndexByRow[leavingRowIndex], this.varIndexByCol[enteringColumn]]);

                var cycleData = this.checkForCycles(varIndexesCycle);
                if(cycleData.length > 0){

                    this.model.messages.push("Cycle in phase 1");
                    this.model.messages.push("Start :"+ cycleData[0]);
                    this.model.messages.push("Length :"+ cycleData[1]);

                    this.feasible = false;
                    return iterations;
                    
                }
            }

            this.pivot(leavingRowIndex, enteringColumn);
            iterations += 1;
        }
    };

    //-------------------------------------------------------------------
    // Description: Apply simplex to obtain optimal solution
    //              used as phase2 of the simplex
    //
    //-------------------------------------------------------------------
    Tableau_1.prototype.phase2 = function () {
        var debugCheckForCycles = this.model.checkForCycles;
        var varIndexesCycle = [];

        var matrix = this.matrix;
        var rhsColumn = this.rhsColumn;
        var lastColumn = this.width - 1;
        var lastRow = this.height - 1;

        var precision = this.precision;
        var nOptionalObjectives = this.optionalObjectives.length;
        var optionalCostsColumns = null;

        var iterations = 0;
        var reducedCost, unrestricted;

        while (true) {
            var costRow = matrix[this.costRowIndex];

            // Selecting entering variable (optimality condition)
            if (nOptionalObjectives > 0) {
                optionalCostsColumns = [];
            }

            var enteringColumn = 0;
            var enteringValue = precision;
            var isReducedCostNegative = false;
            for (var c = 1; c <= lastColumn; c++) {
                reducedCost = costRow[c];
                unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

                if (nOptionalObjectives > 0 && -precision < reducedCost && reducedCost < precision) {
                    optionalCostsColumns.push(c);
                    continue;
                }

                if (unrestricted && reducedCost < 0) {
                    if (-reducedCost > enteringValue) {
                        enteringValue = -reducedCost;
                        enteringColumn = c;
                        isReducedCostNegative = true;
                    }
                    continue;
                }

                if (reducedCost > enteringValue) {
                    enteringValue = reducedCost;
                    enteringColumn = c;
                    isReducedCostNegative = false;
                }
            }

            if (nOptionalObjectives > 0) {
                // There exist optional improvable objectives
                var o = 0;
                while (enteringColumn === 0 && optionalCostsColumns.length > 0 && o < nOptionalObjectives) {
                    var optionalCostsColumns2 = [];
                    var reducedCosts = this.optionalObjectives[o].reducedCosts;

                    enteringValue = precision;

                    for (var i = 0; i < optionalCostsColumns.length; i++) {
                        c = optionalCostsColumns[i];

                        reducedCost = reducedCosts[c];
                        unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

                        if (-precision < reducedCost && reducedCost < precision) {
                            optionalCostsColumns2.push(c);
                            continue;
                        }

                        if (unrestricted && reducedCost < 0) {
                            if (-reducedCost > enteringValue) {
                                enteringValue = -reducedCost;
                                enteringColumn = c;
                                isReducedCostNegative = true;
                            }
                            continue;
                        }

                        if (reducedCost > enteringValue) {
                            enteringValue = reducedCost;
                            enteringColumn = c;
                            isReducedCostNegative = false;
                        }
                    }
                    optionalCostsColumns = optionalCostsColumns2;
                    o += 1;
                }
            }


            // If no entering column could be found we're done with phase 2.
            if (enteringColumn === 0) {
                this.setEvaluation();
                this.simplexIters += 1;
                return iterations;
            }

            // Selecting leaving variable
            var leavingRow = 0;
            var minQuotient = Infinity;

            var varIndexByRow = this.varIndexByRow;

            for (var r = 1; r <= lastRow; r++) {
                var row = matrix[r];
                var rhsValue = row[rhsColumn];
                var colValue = row[enteringColumn];

                if (-precision < colValue && colValue < precision) {
                    continue;
                }

                if (colValue > 0 && precision > rhsValue && rhsValue > -precision) {
                    minQuotient = 0;
                    leavingRow = r;
                    break;
                }

                var quotient = isReducedCostNegative ? -rhsValue / colValue : rhsValue / colValue;
                if (quotient > precision && minQuotient > quotient) {
                    minQuotient = quotient;
                    leavingRow = r;
                }
            }

            if (minQuotient === Infinity) {
                // optimal value is -Infinity
                this.evaluation = -Infinity;
                this.bounded = false;
                this.unboundedVarIndex = this.varIndexByCol[enteringColumn];
                return iterations;
            }

            if(debugCheckForCycles){
                varIndexesCycle.push([this.varIndexByRow[leavingRow], this.varIndexByCol[enteringColumn]]);

                var cycleData = this.checkForCycles(varIndexesCycle);
                if(cycleData.length > 0){

                    this.model.messages.push("Cycle in phase 2");
                    this.model.messages.push("Start :"+ cycleData[0]);
                    this.model.messages.push("Length :"+ cycleData[1]);

                    this.feasible = false;
                    return iterations;
                }
            }

            this.pivot(leavingRow, enteringColumn, true);
            iterations += 1;
        }
    };

    // Array holding the column indexes for which the value is not null
    // on the pivot row
    // Shared by all tableaux for smaller overhead and lower memory usage
    var nonZeroColumns = [];


    //-------------------------------------------------------------------
    // Description: Execute pivot operations over a 2d array,
    //          on a given row, and column
    //
    //-------------------------------------------------------------------
    Tableau_1.prototype.pivot = function (pivotRowIndex, pivotColumnIndex) {
        var matrix = this.matrix;

        var quotient = matrix[pivotRowIndex][pivotColumnIndex];

        var lastRow = this.height - 1;
        var lastColumn = this.width - 1;

        var leavingBasicIndex = this.varIndexByRow[pivotRowIndex];
        var enteringBasicIndex = this.varIndexByCol[pivotColumnIndex];

        this.varIndexByRow[pivotRowIndex] = enteringBasicIndex;
        this.varIndexByCol[pivotColumnIndex] = leavingBasicIndex;

        this.rowByVarIndex[enteringBasicIndex] = pivotRowIndex;
        this.rowByVarIndex[leavingBasicIndex] = -1;

        this.colByVarIndex[enteringBasicIndex] = -1;
        this.colByVarIndex[leavingBasicIndex] = pivotColumnIndex;

        // Divide everything in the target row by the element @
        // the target column
        var pivotRow = matrix[pivotRowIndex];
        var nNonZeroColumns = 0;
        for (var c = 0; c <= lastColumn; c++) {
            if (!(pivotRow[c] >= -1e-16 && pivotRow[c] <= 1e-16)) {
                pivotRow[c] /= quotient;
                nonZeroColumns[nNonZeroColumns] = c;
                nNonZeroColumns += 1;
            } else {
                pivotRow[c] = 0;
            }
        }
        pivotRow[pivotColumnIndex] = 1 / quotient;

        // for every row EXCEPT the pivot row,
        // set the value in the pivot column = 0 by
        // multiplying the value of all elements in the objective
        // row by ... yuck... just look below; better explanation later
        var coefficient, i, v0;
        var precision = this.precision;
        
        // //////////////////////////////////////
        //
        // This is step 2 of the pivot function.
        // It is, by far, the most expensive piece of
        // this whole process where the code can be optimized (faster code)
        // without changing the whole algorithm (fewer cycles)
        //
        // 1.) For every row but the pivot row
        // 2.) Update each column to 
        //    a.) itself
        //        less
        //    b.) active-row's pivot column
        //        times
        //    c.) whatever-the-hell this is: nonZeroColumns[i]
        // 
        // //////////////////////////////////////
        // console.time("step-2");
        for (var r = 0; r <= lastRow; r++) {
            if (r !== pivotRowIndex) {
                //if(1 === 1){
                if(!(matrix[r][pivotColumnIndex] >= -1e-16 && matrix[r][pivotColumnIndex] <= 1e-16)){
                //if((matrix[r][pivotColumnIndex] !== 0)){
                    // Set reference to the row we're working on
                    //
                    var row = matrix[r];

                    // Catch the coefficient that we're going to end up dividing everything by
                    coefficient = row[pivotColumnIndex];
                    
                    // No point Burning Cycles if
                    // Zero to the thing
                    if (!(coefficient >= -1e-16 && coefficient <= 1e-16)) {
                        for (i = 0; i < nNonZeroColumns; i++) {
                            c = nonZeroColumns[i];
                            // No point in doing math if you're just adding
                            // Zero to the thing
                            v0 = pivotRow[c];
                            if (!(v0 >= -1e-16 && v0 <= 1e-16)) {
                                row[c] = row[c] - coefficient * v0;
                            } else {
                                if(v0 !== 0){
                                    pivotRow[c] = 0;
                                }
                            }
                        }

                        row[pivotColumnIndex] = -coefficient / quotient;
                    } else {
                        if(coefficient !== 0){
                            row[pivotColumnIndex] = 0;
                        }
                    }
                }
            }
        }
        // console.timeEnd("step-2");

        var nOptionalObjectives = this.optionalObjectives.length;
        if (nOptionalObjectives > 0) {
            for (var o = 0; o < nOptionalObjectives; o += 1) {
                var reducedCosts = this.optionalObjectives[o].reducedCosts;
                coefficient = reducedCosts[pivotColumnIndex];
                if (coefficient !== 0) {
                    for (i = 0; i < nNonZeroColumns; i++) {
                        c = nonZeroColumns[i];
                        v0 = pivotRow[c];
                        if (v0 !== 0) {
                            reducedCosts[c] = reducedCosts[c] - coefficient * v0;
                        }
                    }

                    reducedCosts[pivotColumnIndex] = -coefficient / quotient;
                }
            }
        }
    };



    Tableau_1.prototype.checkForCycles = function (varIndexes) {
        for (var e1 = 0; e1 < varIndexes.length - 1; e1++) {
            for (var e2 = e1 + 1; e2 < varIndexes.length; e2++) {
                var elt1 = varIndexes[e1];
                var elt2 = varIndexes[e2];
                if (elt1[0] === elt2[0] && elt1[1] === elt2[1]) {
                    if (e2 - e1 > varIndexes.length - e2) {
                        break;
                    }
                    var cycleFound = true;
                    for (var i = 1; i < e2 - e1; i++) {
                        var tmp1 = varIndexes[e1+i];
                        var tmp2 = varIndexes[e2+i];
                        if(tmp1[0] !== tmp2[0] || tmp1[1] !== tmp2[1]) {
                            cycleFound = false;
                            break;
                        }
                    }
                    if (cycleFound) {
                        return [e1, e2 - e1];
                    }
                }
            }
        }
        return [];
    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Variable(id, cost, index, priority) {
        this.id = id;
        this.cost = cost;
        this.index = index;
        this.value = 0;
        this.priority = priority;
    }

    function IntegerVariable(id, cost, index, priority) {
        Variable.call(this, id, cost, index, priority);
    }
    IntegerVariable.prototype.isInteger = true;

    function SlackVariable(id, index) {
        Variable.call(this, id, 0, index, 0);
    }
    SlackVariable.prototype.isSlack = true;

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Term(variable, coefficient) {
        this.variable = variable;
        this.coefficient = coefficient;
    }

    function createRelaxationVariable(model, weight, priority) {
        if (priority === 0 || priority === "required") {
            return null;
        }

        weight = weight || 1;
        priority = priority || 1;

        if (model.isMinimization === false) {
            weight = -weight;
        }

        return model.addVariable(weight, "r" + (model.relaxationIndex++), false, false, priority);
    }

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Constraint(rhs, isUpperBound, index, model) {
        this.slack = new SlackVariable("s" + index, index);
        this.index = index;
        this.model = model;
        this.rhs = rhs;
        this.isUpperBound = isUpperBound;

        this.terms = [];
        this.termsByVarIndex = {};

        // Error variable in case the constraint is relaxed
        this.relaxation = null;
    }

    Constraint.prototype.addTerm = function (coefficient, variable) {
        var varIndex = variable.index;
        var term = this.termsByVarIndex[varIndex];
        if (term === undefined) {
            // No term for given variable
            term = new Term(variable, coefficient);
            this.termsByVarIndex[varIndex] = term;
            this.terms.push(term);
            if (this.isUpperBound === true) {
                coefficient = -coefficient;
            }
            this.model.updateConstraintCoefficient(this, variable, coefficient);
        } else {
            // Term for given variable already exists
            // updating its coefficient
            var newCoefficient = term.coefficient + coefficient;
            this.setVariableCoefficient(newCoefficient, variable);
        }

        return this;
    };

    Constraint.prototype.removeTerm = function (term) {
        // TODO
        return this;
    };

    Constraint.prototype.setRightHandSide = function (newRhs) {
        if (newRhs !== this.rhs) {
            var difference = newRhs - this.rhs;
            if (this.isUpperBound === true) {
                difference = -difference;
            }

            this.rhs = newRhs;
            this.model.updateRightHandSide(this, difference);
        }

        return this;
    };

    Constraint.prototype.setVariableCoefficient = function (newCoefficient, variable) {
        var varIndex = variable.index;
        if (varIndex === -1) {
            console.warn("[Constraint.setVariableCoefficient] Trying to change coefficient of inexistant variable.");
            return;
        }

        var term = this.termsByVarIndex[varIndex];
        if (term === undefined) {
            // No term for given variable
            this.addTerm(newCoefficient, variable);
        } else {
            // Term for given variable already exists
            // updating its coefficient if changed
            if (newCoefficient !== term.coefficient) {
                var difference = newCoefficient - term.coefficient;
                if (this.isUpperBound === true) {
                    difference = -difference;
                }

                term.coefficient = newCoefficient;
                this.model.updateConstraintCoefficient(this, variable, difference);
            }
        }

        return this;
    };

    Constraint.prototype.relax = function (weight, priority) {
        this.relaxation = createRelaxationVariable(this.model, weight, priority);
        this._relax(this.relaxation);
    };

    Constraint.prototype._relax = function (relaxationVariable) {
        if (relaxationVariable === null) {
            // Relaxation variable not created, priority was probably "required"
            return;
        }

        if (this.isUpperBound) {
            this.setVariableCoefficient(-1, relaxationVariable);
        } else {
            this.setVariableCoefficient(1, relaxationVariable);
        }
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Equality(constraintUpper, constraintLower) {
        this.upperBound = constraintUpper;
        this.lowerBound = constraintLower;
        this.model = constraintUpper.model;
        this.rhs = constraintUpper.rhs;
        this.relaxation = null;
    }

    Equality.prototype.isEquality = true;

    Equality.prototype.addTerm = function (coefficient, variable) {
        this.upperBound.addTerm(coefficient, variable);
        this.lowerBound.addTerm(coefficient, variable);
        return this;
    };

    Equality.prototype.removeTerm = function (term) {
        this.upperBound.removeTerm(term);
        this.lowerBound.removeTerm(term);
        return this;
    };

    Equality.prototype.setRightHandSide = function (rhs) {
        this.upperBound.setRightHandSide(rhs);
        this.lowerBound.setRightHandSide(rhs);
        this.rhs = rhs;
    };

    Equality.prototype.relax = function (weight, priority) {
        this.relaxation = createRelaxationVariable(this.model, weight, priority);
        this.upperBound.relaxation = this.relaxation;
        this.upperBound._relax(this.relaxation);
        this.lowerBound.relaxation = this.relaxation;
        this.lowerBound._relax(this.relaxation);
    };


    var expressions = {
        Constraint: Constraint,
        Variable: Variable,
        IntegerVariable: IntegerVariable,
        SlackVariable: SlackVariable,
        Equality: Equality,
        Term: Term
    };

    /*global require*/

    var SlackVariable$1 = expressions.SlackVariable;

    Tableau_1.prototype.addCutConstraints = function (cutConstraints) {
        var nCutConstraints = cutConstraints.length;

        var height = this.height;
        var heightWithCuts = height + nCutConstraints;

        // Adding rows to hold cut constraints
        for (var h = height; h < heightWithCuts; h += 1) {
            if (this.matrix[h] === undefined) {
                this.matrix[h] = this.matrix[h - 1].slice();
            }
        }

        // Adding cut constraints
        this.height = heightWithCuts;
        this.nVars = this.width + this.height - 2;

        var c;
        var lastColumn = this.width - 1;
        for (var i = 0; i < nCutConstraints; i += 1) {
            var cut = cutConstraints[i];

            // Constraint row index
            var r = height + i;

            var sign = (cut.type === "min") ? -1 : 1;

            // Variable on which the cut is applied
            var varIndex = cut.varIndex;
            var varRowIndex = this.rowByVarIndex[varIndex];
            var constraintRow = this.matrix[r];
            if (varRowIndex === -1) {
                // Variable is non basic
                constraintRow[this.rhsColumn] = sign * cut.value;
                for (c = 1; c <= lastColumn; c += 1) {
                    constraintRow[c] = 0;
                }
                constraintRow[this.colByVarIndex[varIndex]] = sign;
            } else {
                // Variable is basic
                var varRow = this.matrix[varRowIndex];
                var varValue = varRow[this.rhsColumn];
                constraintRow[this.rhsColumn] = sign * (cut.value - varValue);
                for (c = 1; c <= lastColumn; c += 1) {
                    constraintRow[c] = -sign * varRow[c];
                }
            }

            // Creating slack variable
            var slackVarIndex = this.getNewElementIndex();
            this.varIndexByRow[r] = slackVarIndex;
            this.rowByVarIndex[slackVarIndex] = r;
            this.colByVarIndex[slackVarIndex] = -1;
            this.variablesPerIndex[slackVarIndex] = new SlackVariable$1("s"+slackVarIndex, slackVarIndex);
            this.nVars += 1;
        }
    };

    Tableau_1.prototype._addLowerBoundMIRCut = function(rowIndex) {

    	if(rowIndex === this.costRowIndex) {
    		//console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
    		return false;
    	}

    	var model = this.model;
    	var matrix = this.matrix;

    	var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
    	if (!intVar.isInteger) {
    		return false;
        }

    	var d = matrix[rowIndex][this.rhsColumn];
    	var frac_d = d - Math.floor(d);

    	if (frac_d < this.precision || 1 - this.precision < frac_d) {
    		return false;
        }

    	//Adding a row
    	var r = this.height;
    	matrix[r] = matrix[r - 1].slice();
    	this.height += 1;

    	// Creating slack variable
    	this.nVars += 1;
    	var slackVarIndex = this.getNewElementIndex();
    	this.varIndexByRow[r] = slackVarIndex;
    	this.rowByVarIndex[slackVarIndex] = r;
    	this.colByVarIndex[slackVarIndex] = -1;
    	this.variablesPerIndex[slackVarIndex] = new SlackVariable$1("s"+slackVarIndex, slackVarIndex);

    	matrix[r][this.rhsColumn] = Math.floor(d);

    	for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
    		var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

    		if (!variable.isInteger) {
    			matrix[r][colIndex] = Math.min(0, matrix[rowIndex][colIndex] / (1 - frac_d));
    		} else {
    			var coef = matrix[rowIndex][colIndex];
    			var termCoeff = Math.floor(coef)+Math.max(0, coef - Math.floor(coef) - frac_d) / (1 - frac_d);
    			matrix[r][colIndex] = termCoeff;
    		}
    	}

    	for(var c = 0; c < this.width; c += 1) {
    		matrix[r][c] -= matrix[rowIndex][c];
    	}

    	return true;
    };

    Tableau_1.prototype._addUpperBoundMIRCut = function(rowIndex) {

    	if (rowIndex === this.costRowIndex) {
    		//console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
    		return false;
    	}

    	var model = this.model;
    	var matrix = this.matrix;

    	var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
    	if (!intVar.isInteger) {
    		return false;
        }

    	var b = matrix[rowIndex][this.rhsColumn];
    	var f = b - Math.floor(b);

    	if (f < this.precision || 1 - this.precision < f) {
    		return false;
        }

    	//Adding a row
    	var r = this.height;
    	matrix[r] = matrix[r - 1].slice();
    	this.height += 1;

    	// Creating slack variable
        
    	this.nVars += 1;
    	var slackVarIndex = this.getNewElementIndex();
    	this.varIndexByRow[r] = slackVarIndex;
    	this.rowByVarIndex[slackVarIndex] = r;
    	this.colByVarIndex[slackVarIndex] = -1;
    	this.variablesPerIndex[slackVarIndex] = new SlackVariable$1("s"+slackVarIndex, slackVarIndex);

    	matrix[r][this.rhsColumn] = -f;


    	for(var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
    		var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

    		var aj = matrix[rowIndex][colIndex];
    		var fj = aj - Math.floor(aj);

    		if(variable.isInteger) {
    			if(fj <= f) {
    				matrix[r][colIndex] = -fj;
                } else {
    				matrix[r][colIndex] = -(1 - fj) * f / fj;
                }
    		} else {
    			if (aj >= 0) {
    				matrix[r][colIndex] = -aj;
                } else {
    				matrix[r][colIndex] = aj * f / (1 - f);
                }
    		}
    	}

    	return true;
    };


    //
    // THIS MAKES SOME MILP PROBLEMS PROVIDE INCORRECT
    // ANSWERS...
    //
    // QUICK FIX: MAKE THE FUNCTION EMPTY...
    //
    Tableau_1.prototype.applyMIRCuts = function () {
        
        // var nRows = this.height;
        // for (var cst = 0; cst < nRows; cst += 1) {
        //    this._addUpperBoundMIRCut(cst);
        // }


        // // nRows = tableau.height;
        // for (cst = 0; cst < nRows; cst += 1) {
        //    this._addLowerBoundMIRCut(cst);
        // }
        
    };

    /*global require*/
    /*global console*/


    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau_1.prototype._putInBase = function (varIndex) {
        // Is varIndex in the base?
        var r = this.rowByVarIndex[varIndex];
        if (r === -1) {
            // Outside the base
            // pivoting to take it out
            var c = this.colByVarIndex[varIndex];

            // Selecting pivot row
            // (Any row with coefficient different from 0)
            for (var r1 = 1; r1 < this.height; r1 += 1) {
                var coefficient = this.matrix[r1][c];
                if (coefficient < -this.precision || this.precision < coefficient) {
                    r = r1;
                    break;
                }
            }

            this.pivot(r, c);
        }

        return r;
    };

    Tableau_1.prototype._takeOutOfBase = function (varIndex) {
        // Is varIndex in the base?
        var c = this.colByVarIndex[varIndex];
        if (c === -1) {
            // Inside the base
            // pivoting to take it out
            var r = this.rowByVarIndex[varIndex];

            // Selecting pivot column
            // (Any column with coefficient different from 0)
            var pivotRow = this.matrix[r];
            for (var c1 = 1; c1 < this.height; c1 += 1) {
                var coefficient = pivotRow[c1];
                if (coefficient < -this.precision || this.precision < coefficient) {
                    c = c1;
                    break;
                }
            }

            this.pivot(r, c);
        }

        return c;
    };

    Tableau_1.prototype.updateVariableValues = function () {
        var nVars = this.variables.length;
        var roundingCoeff = Math.round(1 / this.precision);
        for (var v = 0; v < nVars; v += 1) {
            var variable = this.variables[v];
            var varIndex = variable.index;

            var r = this.rowByVarIndex[varIndex];
            if (r === -1) {
                // Variable is non basic
                variable.value = 0;
            } else {
                // Variable is basic
                var varValue = this.matrix[r][this.rhsColumn];
                variable.value = Math.round((varValue + Number.EPSILON) * roundingCoeff) / roundingCoeff;
            }
        }
    };

    Tableau_1.prototype.updateRightHandSide = function (constraint, difference) {
        // Updates RHS of given constraint
        var lastRow = this.height - 1;
        var constraintRow = this.rowByVarIndex[constraint.index];
        if (constraintRow === -1) {
            // Slack is not in base
            var slackColumn = this.colByVarIndex[constraint.index];

            // Upading all the RHS values
            for (var r = 0; r <= lastRow; r += 1) {
                var row = this.matrix[r];
                row[this.rhsColumn] -= difference * row[slackColumn];
            }

            var nOptionalObjectives = this.optionalObjectives.length;
            if (nOptionalObjectives > 0) {
                for (var o = 0; o < nOptionalObjectives; o += 1) {
                    var reducedCosts = this.optionalObjectives[o].reducedCosts;
                    reducedCosts[this.rhsColumn] -= difference * reducedCosts[slackColumn];
                }
            }
        } else {
            // Slack variable of constraint is in base
            // Updating RHS with the difference between the old and the new one
            this.matrix[constraintRow][this.rhsColumn] -= difference;
        }
    };

    Tableau_1.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
        // Updates variable coefficient within a constraint
        if (constraint.index === variable.index) {
            throw new Error("[Tableau.updateConstraintCoefficient] constraint index should not be equal to variable index !");
        }

        var r = this._putInBase(constraint.index);

        var colVar = this.colByVarIndex[variable.index];
        if (colVar === -1) {
            var rowVar = this.rowByVarIndex[variable.index];
            for (var c = 0; c < this.width; c += 1){
                this.matrix[r][c] += difference * this.matrix[rowVar][c];
            }
        } else {
            this.matrix[r][colVar] -= difference;
        }
    };

    Tableau_1.prototype.updateCost = function (variable, difference) {
        // Updates variable coefficient within the objective function
        var varIndex = variable.index;
        var lastColumn = this.width - 1;
        var varColumn = this.colByVarIndex[varIndex];
        if (varColumn === -1) {
            // Variable is in base
            var variableRow = this.matrix[this.rowByVarIndex[varIndex]];

            var c;
            if (variable.priority === 0) {
                var costRow = this.matrix[0];

                // Upading all the reduced costs
                for (c = 0; c <= lastColumn; c += 1) {
                    costRow[c] += difference * variableRow[c];
                }
            } else {
                var reducedCosts = this.objectivesByPriority[variable.priority].reducedCosts;
                for (c = 0; c <= lastColumn; c += 1) {
                    reducedCosts[c] += difference * variableRow[c];
                }
            }
        } else {
            // Variable is not in the base
            // Updating coefficient with difference
            this.matrix[0][varColumn] -= difference;
        }
    };

    Tableau_1.prototype.addConstraint = function (constraint) {
        // Adds a constraint to the tableau
        var sign = constraint.isUpperBound ? 1 : -1;
        var lastRow = this.height;

        var constraintRow = this.matrix[lastRow];
        if (constraintRow === undefined) {
            constraintRow = this.matrix[0].slice();
            this.matrix[lastRow] = constraintRow;
        }

        // Setting all row cells to 0
        var lastColumn = this.width - 1;
        for (var c = 0; c <= lastColumn; c += 1) {
            constraintRow[c] = 0;
        }

        // Initializing RHS
        constraintRow[this.rhsColumn] = sign * constraint.rhs;

        var terms = constraint.terms;
        var nTerms = terms.length;
        for (var t = 0; t < nTerms; t += 1) {
            var term = terms[t];
            var coefficient = term.coefficient;
            var varIndex = term.variable.index;

            var varRowIndex = this.rowByVarIndex[varIndex];
            if (varRowIndex === -1) {
                // Variable is non basic
                constraintRow[this.colByVarIndex[varIndex]] += sign * coefficient;
            } else {
                // Variable is basic
                var varRow = this.matrix[varRowIndex];
                var varValue = varRow[this.rhsColumn];
                for (c = 0; c <= lastColumn; c += 1) {
                    constraintRow[c] -= sign * coefficient * varRow[c];
                }
            }
        }
        // Creating slack variable
        var slackIndex = constraint.index;
        this.varIndexByRow[lastRow] = slackIndex;
        this.rowByVarIndex[slackIndex] = lastRow;
        this.colByVarIndex[slackIndex] = -1;

        this.height += 1;
    };

    Tableau_1.prototype.removeConstraint = function (constraint) {
        var slackIndex = constraint.index;
        var lastRow = this.height - 1;

        // Putting the constraint's slack in the base
        var r = this._putInBase(slackIndex);

        // Removing constraint
        // by putting the corresponding row at the bottom of the matrix
        // and virtually reducing the height of the matrix by 1
        var tmpRow = this.matrix[lastRow];
        this.matrix[lastRow] = this.matrix[r];
        this.matrix[r] = tmpRow;

        // Removing associated slack variable from basic variables
        this.varIndexByRow[r] = this.varIndexByRow[lastRow];
        this.varIndexByRow[lastRow] = -1;
        this.rowByVarIndex[slackIndex] = -1;

        // Putting associated slack variable index in index manager
        this.availableIndexes[this.availableIndexes.length] = slackIndex;

        constraint.slack.index = -1;

        this.height -= 1;
    };

    Tableau_1.prototype.addVariable = function (variable) {
        // Adds a variable to the tableau
        // var sign = constraint.isUpperBound ? 1 : -1;

        var lastRow = this.height - 1;
        var lastColumn = this.width;
        var cost = this.model.isMinimization === true ? -variable.cost : variable.cost;
        var priority = variable.priority;

        // Setting reduced costs
        var nOptionalObjectives = this.optionalObjectives.length;
        if (nOptionalObjectives > 0) {
            for (var o = 0; o < nOptionalObjectives; o += 1) {
                this.optionalObjectives[o].reducedCosts[lastColumn] = 0;
            }
        }

        if (priority === 0) {
            this.matrix[0][lastColumn] = cost;
        } else {
            this.setOptionalObjective(priority, lastColumn, cost);
            this.matrix[0][lastColumn] = 0;
        }

        // Setting all other column cells to 0
        for (var r = 1; r <= lastRow; r += 1) {
            this.matrix[r][lastColumn] = 0;
        }

        // Adding variable to trackers
        var varIndex = variable.index;
        this.varIndexByCol[lastColumn] = varIndex;

        this.rowByVarIndex[varIndex] = -1;
        this.colByVarIndex[varIndex] = lastColumn;

        this.width += 1;
    };


    Tableau_1.prototype.removeVariable = function (variable) {
        var varIndex = variable.index;

        // Putting the variable out of the base
        var c = this._takeOutOfBase(varIndex);
        var lastColumn = this.width - 1;
        if (c !== lastColumn) {
            var lastRow = this.height - 1;
            for (var r = 0; r <= lastRow; r += 1) {
                var row = this.matrix[r];
                row[c] = row[lastColumn];
            }

            var nOptionalObjectives = this.optionalObjectives.length;
            if (nOptionalObjectives > 0) {
                for (var o = 0; o < nOptionalObjectives; o += 1) {
                    var reducedCosts = this.optionalObjectives[o].reducedCosts;
                    reducedCosts[c] = reducedCosts[lastColumn];
                }
            }

            var switchVarIndex = this.varIndexByCol[lastColumn];
            this.varIndexByCol[c] = switchVarIndex;
            this.colByVarIndex[switchVarIndex] = c;
        }

        // Removing variable from non basic variables
        this.varIndexByCol[lastColumn] = -1;
        this.colByVarIndex[varIndex] = -1;

        // Adding index into index manager
        this.availableIndexes[this.availableIndexes.length] = varIndex;

        variable.index = -1;

        this.width -= 1;
    };

    /*global require*/
    /*global console*/


    //-------------------------------------------------------------------
    // Description: Display a tableau matrix
    //              and additional tableau information
    //
    //-------------------------------------------------------------------
    Tableau_1.prototype.log = function (message, force) {

        console.log("****", message, "****");
        console.log("Nb Variables", this.width - 1);
        console.log("Nb Constraints", this.height - 1);
        // console.log("Variable Ids", this.variablesPerIndex);
        console.log("Basic Indexes", this.varIndexByRow);
        console.log("Non Basic Indexes", this.varIndexByCol);
        console.log("Rows", this.rowByVarIndex);
        console.log("Cols", this.colByVarIndex);

        var digitPrecision = 5;

        // Variable declaration
        var varNameRowString = "",
            spacePerColumn = [" "],
            j,
            c,
            r,
            variable,
            varIndex,
            varName,
            varNameLength,
            valueSpace,
            nameSpace;

        var row,
            rowString;

        for (c = 1; c < this.width; c += 1) {
            varIndex = this.varIndexByCol[c];
            variable = this.variablesPerIndex[varIndex];
            if (variable === undefined) {
                varName = "c" + varIndex;
            } else {
                varName = variable.id;
            }

            varNameLength = varName.length;
            valueSpace = " ";
            nameSpace = "\t";

            ///////////
            /*valueSpace = " ";
            nameSpace = " ";

            for (s = 0; s < nSpaces; s += 1) {
                if (varNameLength > 5) {
                    valueSpace += " ";
                } else {
                    nameSpace += " ";
                }
            }*/

            ///////////
            if (varNameLength > 5) {
                valueSpace += " ";
            } else {
                nameSpace += "\t";
            }

            spacePerColumn[c] = valueSpace;

            varNameRowString += nameSpace + varName;
        }
        console.log(varNameRowString);

        var signSpace;

        // Displaying reduced costs
        var firstRow = this.matrix[this.costRowIndex];
        var firstRowString = "\t";

        ///////////
        /*for (j = 1; j < this.width; j += 1) {
            signSpace = firstRow[j] < 0 ? "" : " ";
            firstRowString += signSpace;
            firstRowString += spacePerColumn[j];
            firstRowString += firstRow[j].toFixed(2);
        }
        signSpace = firstRow[0] < 0 ? "" : " ";
        firstRowString += signSpace + spacePerColumn[0] +
            firstRow[0].toFixed(2);
        console.log(firstRowString + " Z");*/

        ///////////
        for (j = 1; j < this.width; j += 1) {
            signSpace = "\t";
            firstRowString += signSpace;
            firstRowString += spacePerColumn[j];
            firstRowString += firstRow[j].toFixed(digitPrecision);
        }
        signSpace = "\t";
        firstRowString += signSpace + spacePerColumn[0] +
            firstRow[0].toFixed(digitPrecision);
        console.log(firstRowString + "\tZ");


        // Then the basic variable rowByVarIndex
        for (r = 1; r < this.height; r += 1) {
            row = this.matrix[r];
            rowString = "\t";

            ///////////
            /*for (c = 1; c < this.width; c += 1) {
                signSpace = row[c] < 0 ? "" : " ";
                rowString += signSpace + spacePerColumn[c] + row[c].toFixed(2);
            }
            signSpace = row[0] < 0 ? "" : " ";
            rowString += signSpace + spacePerColumn[0] + row[0].toFixed(2);*/

            ///////////
            for (c = 1; c < this.width; c += 1) {
                signSpace = "\t";
                rowString += signSpace + spacePerColumn[c] + row[c].toFixed(digitPrecision);
            }
            signSpace = "\t";
            rowString += signSpace + spacePerColumn[0] + row[0].toFixed(digitPrecision);


            varIndex = this.varIndexByRow[r];
            variable = this.variablesPerIndex[varIndex];
            if (variable === undefined) {
                varName = "c" + varIndex;
            } else {
                varName = variable.id;
            }
            console.log(rowString + "\t" + varName);
        }
        console.log("");

        // Then reduced costs for optional objectives
        var nOptionalObjectives = this.optionalObjectives.length;
        if (nOptionalObjectives > 0) {
            console.log("    Optional objectives:");
            for (var o = 0; o < nOptionalObjectives; o += 1) {
                var reducedCosts = this.optionalObjectives[o].reducedCosts;
                var reducedCostsString = "";
                for (j = 1; j < this.width; j += 1) {
                    signSpace = reducedCosts[j] < 0 ? "" : " ";
                    reducedCostsString += signSpace;
                    reducedCostsString += spacePerColumn[j];
                    reducedCostsString += reducedCosts[j].toFixed(digitPrecision);
                }
                signSpace = reducedCosts[0] < 0 ? "" : " ";
                reducedCostsString += signSpace + spacePerColumn[0] +
                    reducedCosts[0].toFixed(digitPrecision);
                console.log(reducedCostsString + " z" + o);
            }
        }
        console.log("Feasible?", this.feasible);
        console.log("evaluation", this.evaluation);

        return this;
    };

    /*global require*/


    Tableau_1.prototype.copy = function () {
        var copy = new Tableau_1(this.precision);

        copy.width = this.width;
        copy.height = this.height;

        copy.nVars = this.nVars;
        copy.model = this.model;

        // Making a shallow copy of integer variable indexes
        // and variable ids
        copy.variables = this.variables;
        copy.variablesPerIndex = this.variablesPerIndex;
        copy.unrestrictedVars = this.unrestrictedVars;
        copy.lastElementIndex = this.lastElementIndex;

        // All the other arrays are deep copied
        copy.varIndexByRow = this.varIndexByRow.slice();
        copy.varIndexByCol = this.varIndexByCol.slice();

        copy.rowByVarIndex = this.rowByVarIndex.slice();
        copy.colByVarIndex = this.colByVarIndex.slice();

        copy.availableIndexes = this.availableIndexes.slice();

        var optionalObjectivesCopy = [];
        for(var o = 0; o < this.optionalObjectives.length; o++){
            optionalObjectivesCopy[o] = this.optionalObjectives[o].copy();
        }
        copy.optionalObjectives = optionalObjectivesCopy;


        var matrix = this.matrix;
        var matrixCopy = new Array(this.height);
        for (var r = 0; r < this.height; r++) {
            matrixCopy[r] = matrix[r].slice();
        }

        copy.matrix = matrixCopy;

        return copy;
    };

    Tableau_1.prototype.save = function () {
        this.savedState = this.copy();
    };

    Tableau_1.prototype.restore = function () {
        if (this.savedState === null) {
            return;
        }

        var save = this.savedState;
        var savedMatrix = save.matrix;
        this.nVars = save.nVars;
        this.model = save.model;

        // Shallow restore
        this.variables = save.variables;
        this.variablesPerIndex = save.variablesPerIndex;
        this.unrestrictedVars = save.unrestrictedVars;
        this.lastElementIndex = save.lastElementIndex;

        this.width = save.width;
        this.height = save.height;

        // Restoring matrix
        var r, c;
        for (r = 0; r < this.height; r += 1) {
            var savedRow = savedMatrix[r];
            var row = this.matrix[r];
            for (c = 0; c < this.width; c += 1) {
                row[c] = savedRow[c];
            }
        }

        // Restoring all the other structures
        var savedBasicIndexes = save.varIndexByRow;
        for (c = 0; c < this.height; c += 1) {
            this.varIndexByRow[c] = savedBasicIndexes[c];
        }

        while (this.varIndexByRow.length > this.height) {
            this.varIndexByRow.pop();
        }

        var savedNonBasicIndexes = save.varIndexByCol;
        for (r = 0; r < this.width; r += 1) {
            this.varIndexByCol[r] = savedNonBasicIndexes[r];
        }

        while (this.varIndexByCol.length > this.width) {
            this.varIndexByCol.pop();
        }

        var savedRows = save.rowByVarIndex;
        var savedCols = save.colByVarIndex;
        for (var v = 0; v < this.nVars; v += 1) {
            this.rowByVarIndex[v] = savedRows[v];
            this.colByVarIndex[v] = savedCols[v];
        }


        if (save.optionalObjectives.length > 0 && this.optionalObjectives.length > 0) {
            this.optionalObjectives = [];
            this.optionalObjectivePerPriority = {};
            for(var o = 0; o < save.optionalObjectives.length; o++){
                var optionalObjectiveCopy = save.optionalObjectives[o].copy();
                this.optionalObjectives[o] = optionalObjectiveCopy;
                this.optionalObjectivePerPriority[optionalObjectiveCopy.priority] = optionalObjectiveCopy;
            }
        }
    };

    /*global require*/


    function VariableData(index, value) {
        this.index = index;
        this.value = value;
    }

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau_1.prototype.getMostFractionalVar = function () {
        var biggestFraction = 0;
        var selectedVarIndex = null;
        var selectedVarValue = null;

        var integerVariables = this.model.integerVariables;
        var nIntegerVars = integerVariables.length;
        for (var v = 0; v < nIntegerVars; v++) {
            var varIndex = integerVariables[v].index;
            var varRow = this.rowByVarIndex[varIndex];
            if (varRow === -1) {
                continue;
            }

            var varValue = this.matrix[varRow][this.rhsColumn];
            var fraction = Math.abs(varValue - Math.round(varValue));
            if (biggestFraction < fraction) {
                biggestFraction = fraction;
                selectedVarIndex = varIndex;
                selectedVarValue = varValue;
            }
        }

        return new VariableData(selectedVarIndex, selectedVarValue);
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau_1.prototype.getFractionalVarWithLowestCost = function () {
        var highestCost = Infinity;
        var selectedVarIndex = null;
        var selectedVarValue = null;

        var integerVariables = this.model.integerVariables;
        var nIntegerVars = integerVariables.length;
        for (var v = 0; v < nIntegerVars; v++) {
            var variable = integerVariables[v];
            var varIndex = variable.index;
            var varRow = this.rowByVarIndex[varIndex];
            if (varRow === -1) {
                // Variable value is non basic
                // its value is 0
                continue;
            }

            var varValue = this.matrix[varRow][this.rhsColumn];
            if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
                var cost = variable.cost;
                if (highestCost > cost) {
                    highestCost = cost;
                    selectedVarIndex = varIndex;
                    selectedVarValue = varValue;
                }
            }
        }

        return new VariableData(selectedVarIndex, selectedVarValue);
    };

    /*global require*/


    Tableau_1.prototype.countIntegerValues = function(){
        var count = 0;
        for (var r = 1; r < this.height; r += 1) {
            if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
                var decimalPart = this.matrix[r][this.rhsColumn];
                decimalPart = decimalPart - Math.floor(decimalPart);
                if (decimalPart < this.precision && -decimalPart < this.precision) {
                    count += 1;
                }
            }
        }

        return count;
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Tableau_1.prototype.isIntegral = function () {
        var integerVariables = this.model.integerVariables;
        var nIntegerVars = integerVariables.length;
        for (var v = 0; v < nIntegerVars; v++) {
            var varRow = this.rowByVarIndex[integerVariables[v].index];
            if (varRow === -1) {
                continue;
            }

            var varValue = this.matrix[varRow][this.rhsColumn];
            if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
                return false;
            }
        }
        return true;
    };

    // Multiply all the fractional parts of variables supposed to be integer
    Tableau_1.prototype.computeFractionalVolume = function(ignoreIntegerValues) {
        var volume = -1;
        // var integerVariables = this.model.integerVariables;
        // var nIntegerVars = integerVariables.length;
        // for (var v = 0; v < nIntegerVars; v++) {
        //     var r = this.rowByVarIndex[integerVariables[v].index];
        //     if (r === -1) {
        //         continue;
        //     }
        //     var rhs = this.matrix[r][this.rhsColumn];
        //     rhs = Math.abs(rhs);
        //     var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
        //     if (decimalPart < this.precision) {
        //         if (!ignoreIntegerValues) {
        //             return 0;
        //         }
        //     } else {
        //         if (volume === -1) {
        //             volume = rhs;
        //         } else {
        //             volume *= rhs;
        //         }
        //     }
        // }

        for (var r = 1; r < this.height; r += 1) {
            if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
                var rhs = this.matrix[r][this.rhsColumn];
                rhs = Math.abs(rhs);
                var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
                if (decimalPart < this.precision) {
                    if (!ignoreIntegerValues) {
                        return 0;
                    }
                } else {
                    if (volume === -1) {
                        volume = rhs;
                    } else {
                        volume *= rhs;
                    }
                }
            }
        }

        if (volume === -1){
            return 0;
        }
        return volume;
    };

    /*global require*/
    /*global module*/








    var Tableau$1 = Tableau_1;

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/


    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Cut(type, varIndex, value) {
        this.type = type;
        this.varIndex = varIndex;
        this.value = value;
    }

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    function Branch(relaxedEvaluation, cuts) {
        this.relaxedEvaluation = relaxedEvaluation;
        this.cuts = cuts;
    }

    //-------------------------------------------------------------------
    // Branch sorting strategies
    //-------------------------------------------------------------------
    function sortByEvaluation(a, b) {
        return b.relaxedEvaluation - a.relaxedEvaluation;
    }


    //-------------------------------------------------------------------
    // Applying cuts on a tableau and resolving
    //-------------------------------------------------------------------
    Tableau_1.prototype.applyCuts = function (branchingCuts){
        // Restoring initial solution
        this.restore();

        this.addCutConstraints(branchingCuts);
        this.simplex();
        // Adding MIR cuts
        if (this.model.useMIRCuts){
            var fractionalVolumeImproved = true;
            while(fractionalVolumeImproved){
                var fractionalVolumeBefore = this.computeFractionalVolume(true);
                this.applyMIRCuts();
                this.simplex();

                var fractionalVolumeAfter = this.computeFractionalVolume(true);

                // If the new fractional volume is bigger than 90% of the previous one
                // we assume there is no improvement from the MIR cuts
                if(fractionalVolumeAfter >= 0.9 * fractionalVolumeBefore){
                    fractionalVolumeImproved = false;
                }
            }
        }
    };

    //-------------------------------------------------------------------
    // Function: MILP
    // Detail: Main function, my attempt at a mixed integer linear programming
    //         solver
    //-------------------------------------------------------------------
    Tableau_1.prototype.branchAndCut = function () {
        var branches = [];
        var iterations = 0;
        var tolerance = this.model.tolerance;
        var toleranceFlag = true;
        var terminalTime = 1e99;
        
        //
        // Set Start Time on model...
        // Let's build out a way to *gracefully* quit
        // after {{time}} milliseconds
        //
        
        // 1.) Check to see if there's a timeout on the model
        //
        if(this.model.timeout){
            // 2.) Hooray! There is!
            //     Calculate the final date
            //
            terminalTime = Date.now() + this.model.timeout;
        }

        // This is the default result
        // If nothing is both *integral* and *feasible*
        var bestEvaluation = Infinity;
        var bestBranch = null;
        var bestOptionalObjectivesEvaluations = [];
        for (var oInit = 0; oInit < this.optionalObjectives.length; oInit += 1){
            bestOptionalObjectivesEvaluations.push(Infinity);
        }

        // And here...we...go!

        // 1.) Load a model into the queue
        var branch = new Branch(-Infinity, []);
        var acceptableThreshold;
        
        branches.push(branch);
        // If all branches have been exhausted terminate the loop
        while (branches.length > 0 && toleranceFlag === true && Date.now() < terminalTime) {
            
            if(this.model.isMinimization){
                acceptableThreshold = this.bestPossibleEval * (1 + tolerance);
            } else {
                acceptableThreshold = this.bestPossibleEval * (1 - tolerance);
            }
            
            // Abort while loop if termination tolerance is both specified and condition is met
            if (tolerance > 0) {
                if (bestEvaluation < acceptableThreshold) {
                    toleranceFlag = false;
                }
            }
            
            // Get a model from the queue
            branch = branches.pop();
            if (branch.relaxedEvaluation > bestEvaluation) {
                continue;
            }

            // Solving from initial relaxed solution
            // with additional cut constraints

            // Adding cut constraints
            var cuts = branch.cuts;
            this.applyCuts(cuts);

            iterations++;
            if (this.feasible === false) {
                continue;
            }

            var evaluation = this.evaluation;
            if (evaluation > bestEvaluation) {
                // This branch does not contain the optimal solution
                continue;
            }

            // To deal with the optional objectives
            if (evaluation === bestEvaluation){
                var isCurrentEvaluationWorse = true;
                for (var o = 0; o < this.optionalObjectives.length; o += 1){
                    if (this.optionalObjectives[o].reducedCosts[0] > bestOptionalObjectivesEvaluations[o]){
                        break;
                    } else if (this.optionalObjectives[o].reducedCosts[0] < bestOptionalObjectivesEvaluations[o]) {
                        isCurrentEvaluationWorse = false;
                        break;
                    }
                }

                if (isCurrentEvaluationWorse){
                    continue;
                }
            }

            // Is the model both integral and feasible?
            if (this.isIntegral() === true) {
                
                //
                // Store the fact that we are integral
                //
                this.__isIntegral = true;
                
                
                if (iterations === 1) {
                    this.branchAndCutIterations = iterations;
                    return;
                }
                // Store the solution as the bestSolution
                bestBranch = branch;
                bestEvaluation = evaluation;
                for (var oCopy = 0; oCopy < this.optionalObjectives.length; oCopy += 1){
                    bestOptionalObjectivesEvaluations[oCopy] = this.optionalObjectives[oCopy].reducedCosts[0];
                }
            } else {
                if (iterations === 1) {
                    // Saving the first iteration
                    // TODO: implement a better strategy for saving the tableau?
                    this.save();
                }

                // If the solution is
                //  a. Feasible
                //  b. Better than the current solution
                //  c. but *NOT* integral

                // So the solution isn't integral? How do we solve this.
                // We create 2 new models, that are mirror images of the prior
                // model, with 1 exception.

                // Say we're trying to solve some stupid problem requiring you get
                // animals for your daughter's kindergarten petting zoo party
                // and you have to choose how many ducks, goats, and lambs to get.

                // Say that the optimal solution to this problem if we didn't have
                // to make it integral was {duck: 8, lambs: 3.5}
                //
                // To keep from traumatizing your daughter and the other children
                // you're going to want to have whole animals

                // What we would do is find the most fractional variable (lambs)
                // and create new models from the old models, but with a new constraint
                // on apples. The constraints on the low model would look like:
                // constraints: {...
                //   lamb: {max: 3}
                //   ...
                // }
                //
                // while the constraints on the high model would look like:
                //
                // constraints: {...
                //   lamb: {min: 4}
                //   ...
                // }
                // If neither of these models is feasible because of this constraint,
                // the model is not integral at this point, and fails.

                // Find out where we want to split the solution
                var variable = this.getMostFractionalVar();

                var varIndex = variable.index;

                var cutsHigh = [];
                var cutsLow = [];

                var nCuts = cuts.length;
                for (var c = 0; c < nCuts; c += 1) {
                    var cut = cuts[c];
                    if (cut.varIndex === varIndex) {
                        if (cut.type === "min") {
                            cutsLow.push(cut);
                        } else {
                            cutsHigh.push(cut);
                        }
                    } else {
                        cutsHigh.push(cut);
                        cutsLow.push(cut);
                    }
                }

                var min = Math.ceil(variable.value);
                var max = Math.floor(variable.value);

                var cutHigh = new Cut("min", varIndex, min);
                cutsHigh.push(cutHigh);

                var cutLow = new Cut("max", varIndex, max);
                cutsLow.push(cutLow);

                branches.push(new Branch(evaluation, cutsHigh));
                branches.push(new Branch(evaluation, cutsLow));

                // Sorting branches
                // Branches with the most promising lower bounds
                // will be picked first
                branches.sort(sortByEvaluation);
            }
        }

        // Adding cut constraints for the optimal solution
        if (bestBranch !== null) {
            // The model is feasible
            this.applyCuts(bestBranch.cuts);
        }
        this.branchAndCutIterations = iterations;
    };

    var branchAndCut = {

    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/




    var Constraint$1 = expressions.Constraint;
    var Equality$1 = expressions.Equality;
    var Variable$1 = expressions.Variable;
    var IntegerVariable$1 = expressions.IntegerVariable;

    /*************************************************************
     * Class: Model
     * Description: Holds the model of a linear optimisation problem
     **************************************************************/
    function Model(precision, name) {
        this.tableau = new Tableau_1(precision);

        this.name = name;

        this.variables = [];

        this.integerVariables = [];

        this.unrestrictedVariables = {};

        this.constraints = [];

        this.nConstraints = 0;

        this.nVariables = 0;

        this.isMinimization = true;

        this.tableauInitialized = false;
        
        this.relaxationIndex = 1;

        this.useMIRCuts = false;

        this.checkForCycles = true;
        
        //
        // Quick and dirty way to leave useful information
        // for the end user without hitting the console
        // or modifying the primary return object...
        //
        this.messages = [];
    }
    var Model_1 = Model;

    Model.prototype.minimize = function () {
        this.isMinimization = true;
        return this;
    };

    Model.prototype.maximize = function () {
        this.isMinimization = false;
        return this;
    };

    // Model.prototype.addConstraint = function (constraint) {
    //     // TODO: make sure that the constraint does not belong do another model
    //     // and make
    //     this.constraints.push(constraint);
    //     return this;
    // };

    Model.prototype._getNewElementIndex = function () {
        if (this.availableIndexes.length > 0) {
            return this.availableIndexes.pop();
        }

        var index = this.lastElementIndex;
        this.lastElementIndex += 1;
        return index;
    };

    Model.prototype._addConstraint = function (constraint) {
        var slackVariable = constraint.slack;
        this.tableau.variablesPerIndex[slackVariable.index] = slackVariable;
        this.constraints.push(constraint);
        this.nConstraints += 1;
        if (this.tableauInitialized === true) {
            this.tableau.addConstraint(constraint);
        }
    };

    Model.prototype.smallerThan = function (rhs) {
        var constraint = new Constraint$1(rhs, true, this.tableau.getNewElementIndex(), this);
        this._addConstraint(constraint);
        return constraint;
    };

    Model.prototype.greaterThan = function (rhs) {
        var constraint = new Constraint$1(rhs, false, this.tableau.getNewElementIndex(), this);
        this._addConstraint(constraint);
        return constraint;
    };

    Model.prototype.equal = function (rhs) {
        var constraintUpper = new Constraint$1(rhs, true, this.tableau.getNewElementIndex(), this);
        this._addConstraint(constraintUpper);

        var constraintLower = new Constraint$1(rhs, false, this.tableau.getNewElementIndex(), this);
        this._addConstraint(constraintLower);

        return new Equality$1(constraintUpper, constraintLower);
    };

    Model.prototype.addVariable = function (cost, id, isInteger, isUnrestricted, priority) {
        if (typeof priority === "string") {
            switch (priority) {
            case "required":
                priority = 0;
                break;
            case "strong":
                priority = 1;
                break;
            case "medium":
                priority = 2;
                break;
            case "weak":
                priority = 3;
                break;
            default:
                priority = 0;
                break;
            }
        }

        var varIndex = this.tableau.getNewElementIndex();
        if (id === null || id === undefined) {
            id = "v" + varIndex;
        }

        if (cost === null || cost === undefined) {
            cost = 0;
        }

        if (priority === null || priority === undefined) {
            priority = 0;
        }

        var variable;
        if (isInteger) {
            variable = new IntegerVariable$1(id, cost, varIndex, priority);
            this.integerVariables.push(variable);
        } else {
            variable = new Variable$1(id, cost, varIndex, priority);
        }

        this.variables.push(variable);
        this.tableau.variablesPerIndex[varIndex] = variable;

        if (isUnrestricted) {
            this.unrestrictedVariables[varIndex] = true;
        }

        this.nVariables += 1;

        if (this.tableauInitialized === true) {
            this.tableau.addVariable(variable);
        }

        return variable;
    };

    Model.prototype._removeConstraint = function (constraint) {
        var idx = this.constraints.indexOf(constraint);
        if (idx === -1) {
            console.warn("[Model.removeConstraint] Constraint not present in model");
            return;
        }

        this.constraints.splice(idx, 1);
        this.nConstraints -= 1;

        if (this.tableauInitialized === true) {
            this.tableau.removeConstraint(constraint);
        }

        if (constraint.relaxation) {
            this.removeVariable(constraint.relaxation);
        }
    };

    //-------------------------------------------------------------------
    // For dynamic model modification
    //-------------------------------------------------------------------
    Model.prototype.removeConstraint = function (constraint) {
        if (constraint.isEquality) {
            this._removeConstraint(constraint.upperBound);
            this._removeConstraint(constraint.lowerBound);
        } else {
            this._removeConstraint(constraint);
        }

        return this;
    };

    Model.prototype.removeVariable = function (variable) {
        var idx = this.variables.indexOf(variable);
        if (idx === -1) {
            console.warn("[Model.removeVariable] Variable not present in model");
            return;
        }
        this.variables.splice(idx, 1);

        if (this.tableauInitialized === true) {
            this.tableau.removeVariable(variable);
        }

        return this;
    };

    Model.prototype.updateRightHandSide = function (constraint, difference) {
        if (this.tableauInitialized === true) {
            this.tableau.updateRightHandSide(constraint, difference);
        }
        return this;
    };

    Model.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
        if (this.tableauInitialized === true) {
            this.tableau.updateConstraintCoefficient(constraint, variable, difference);
        }
        return this;
    };


    Model.prototype.setCost = function (cost, variable) {
        var difference = cost - variable.cost;
        if (this.isMinimization === false) {
            difference = -difference;
        }

        variable.cost = cost;
        this.tableau.updateCost(variable, difference);
        return this;
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Model.prototype.loadJson = function (jsonModel) {
        this.isMinimization = (jsonModel.opType !== "max");

        var variables = jsonModel.variables;
        var constraints = jsonModel.constraints;

        var constraintsMin = {};
        var constraintsMax = {};

        // Instantiating constraints
        var constraintIds = Object.keys(constraints);
        var nConstraintIds = constraintIds.length;

        for (var c = 0; c < nConstraintIds; c += 1) {
            var constraintId = constraintIds[c];
            var constraint = constraints[constraintId];
            var equal = constraint.equal;

            var weight = constraint.weight;
            var priority = constraint.priority;
            var relaxed = weight !== undefined || priority !== undefined;

            var lowerBound, upperBound;
            if (equal === undefined) {
                var min = constraint.min;
                if (min !== undefined) {
                    lowerBound = this.greaterThan(min);
                    constraintsMin[constraintId] = lowerBound;
                    if (relaxed) { lowerBound.relax(weight, priority); }
                }

                var max = constraint.max;
                if (max !== undefined) {
                    upperBound = this.smallerThan(max);
                    constraintsMax[constraintId] = upperBound;
                    if (relaxed) { upperBound.relax(weight, priority); }
                }
            } else {
                lowerBound = this.greaterThan(equal);
                constraintsMin[constraintId] = lowerBound;

                upperBound = this.smallerThan(equal);
                constraintsMax[constraintId] = upperBound;

                var equality = new Equality$1(lowerBound, upperBound);
                if (relaxed) { equality.relax(weight, priority); }
            }
        }

        var variableIds = Object.keys(variables);
        var nVariables = variableIds.length;
        
        
        
    //
    //
    // *** OPTIONS ***
    //
    //

        this.tolerance = jsonModel.tolerance || 0;
        
        if(jsonModel.timeout){
            this.timeout = jsonModel.timeout;
        }
        
        //
        //
        // The model is getting too sloppy with options added to it...
        // mebe it needs an "options" option...?
        //
        // YES! IT DOES!
        // DO IT!
        // NOW!
        // HERE!!!
        //
        if(jsonModel.options){
            
            //
            // TIMEOUT
            //
            if(jsonModel.options.timeout){
                this.timeout = jsonModel.options.timeout;
            }
            
            //
            // TOLERANCE
            //
            if(this.tolerance === 0){
                this.tolerance = jsonModel.options.tolerance || 0;
            }
            
            //
            // MIR CUTS - (NOT WORKING)
            //
            if(jsonModel.options.useMIRCuts){
                this.useMIRCuts = jsonModel.options.useMIRCuts;
            }
            
            //
            // CYCLE CHECK...tricky because it defaults to false
            //
            //
            // This should maybe be on by default...
            //
            if(typeof jsonModel.options.exitOnCycles === "undefined"){
                this.checkForCycles = true;
            } else {
                this.checkForCycles = jsonModel.options.exitOnCycles;
            }

            
        }
        
        
    //
    //
    // /// OPTIONS \\\
    //
    //
        
        var integerVarIds = jsonModel.ints || {};
        var binaryVarIds = jsonModel.binaries || {};
        var unrestrictedVarIds = jsonModel.unrestricted || {};

        // Instantiating variables and constraint terms
        var objectiveName = jsonModel.optimize;
        for (var v = 0; v < nVariables; v += 1) {
            // Creation of the variables
            var variableId = variableIds[v];
            var variableConstraints = variables[variableId];
            var cost = variableConstraints[objectiveName] || 0;
            var isBinary = !!binaryVarIds[variableId];
            var isInteger = !!integerVarIds[variableId] || isBinary;
            var isUnrestricted = !!unrestrictedVarIds[variableId];
            var variable = this.addVariable(cost, variableId, isInteger, isUnrestricted);

            if (isBinary) {
                // Creating an upperbound constraint for this variable
                this.smallerThan(1).addTerm(1, variable);
            }

            var constraintNames = Object.keys(variableConstraints);
            for (c = 0; c < constraintNames.length; c += 1) {
                var constraintName = constraintNames[c];
                if (constraintName === objectiveName) {
                    continue;
                }

                var coefficient = variableConstraints[constraintName];

                var constraintMin = constraintsMin[constraintName];
                if (constraintMin !== undefined) {
                    constraintMin.addTerm(coefficient, variable);
                }

                var constraintMax = constraintsMax[constraintName];
                if (constraintMax !== undefined) {
                    constraintMax.addTerm(coefficient, variable);
                }
            }
        }

        return this;
    };

    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    Model.prototype.getNumberOfIntegerVariables = function () {
        return this.integerVariables.length;
    };

    Model.prototype.solve = function () {
        // Setting tableau if not done
        if (this.tableauInitialized === false) {
            this.tableau.setModel(this);
            this.tableauInitialized = true;
        }

        return this.tableau.solve();
    };

    Model.prototype.isFeasible = function () {
        return this.tableau.feasible;
    };

    Model.prototype.save = function () {
        return this.tableau.save();
    };

    Model.prototype.restore = function () {
        return this.tableau.restore();
    };

    Model.prototype.activateMIRCuts = function (useMIRCuts) {
        this.useMIRCuts = useMIRCuts;
    };

    Model.prototype.debug = function (debugCheckForCycles) {
        this.checkForCycles = debugCheckForCycles;
    };

    Model.prototype.log = function (message) {
        return this.tableau.log(message);
    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/
    /*global exports*/


    // All functions in this module that
    // get exported to main ***MUST***
    // return a functional LPSolve JSON style
    // model or throw an error

    var CleanObjectiveAttributes = function(model){
      // Test to see if the objective attribute
      // is also used by one of the constraints
      //
      // If so...create a new attribute on each
      // variable
        var fakeAttr,
            x, z;
      
        if(typeof model.optimize === "string"){
            if(model.constraints[model.optimize]){
                // Create the new attribute
                fakeAttr = Math.random();

                // Go over each variable and check
                for(x in model.variables){
                    // Is it there?
                    if(model.variables[x][model.optimize]){
                        model.variables[x][fakeAttr] = model.variables[x][model.optimize];
                    }
                }

            // Now that we've cleaned up the variables
            // we need to clean up the constraints
                model.constraints[fakeAttr] = model.constraints[model.optimize];
                delete model.constraints[model.optimize];
                return model;
            } else {    
                return model;
            }  
        } else {
            // We're assuming its an object?
            for(z in model.optimize){
                if(model.constraints[z]){
                // Make sure that the constraint
                // being optimized isn't constrained
                // by an equity collar
                    if(model.constraints[z] === "equal"){
                        // Its constrained by an equal sign;
                        // delete that objective and move on
                        delete model.optimize[z];
                    
                    } else {
                        // Create the new attribute
                        fakeAttr = Math.random();

                        // Go over each variable and check
                        for(x in model.variables){
                            // Is it there?
                            if(model.variables[x][z]){
                                model.variables[x][fakeAttr] = model.variables[x][z];
                            }
                        }
                    // Now that we've cleaned up the variables
                    // we need to clean up the constraints
                        model.constraints[fakeAttr] = model.constraints[z];
                        delete model.constraints[z];            
                    }
                }    
            }
            return model;
        }
    };

    var Validation = {
    	CleanObjectiveAttributes: CleanObjectiveAttributes
    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/
    /*jshint -W083 */

     /*************************************************************
     * Method: to_JSON
     * Scope: Public:
     * Agruments: input: Whatever the user gives us
     * Purpose: Convert an unfriendly formatted LP
     *          into something that our library can
     *          work with
     **************************************************************/
    function to_JSON(input){
        var rxo = {
            /* jshint ignore:start */
            "is_blank": /^\W{0,}$/,
            "is_objective": /(max|min)(imize){0,}\:/i,
            "is_int": /^(?!\/\*)\W{0,}int/i,
            "is_bin": /^(?!\/\*)\W{0,}bin/i,
            "is_constraint": /(\>|\<){0,}\=/i,
            "is_unrestricted": /^\S{0,}unrestricted/i,
            "parse_lhs":  /(\-|\+){0,1}\s{0,1}\d{0,}\.{0,}\d{0,}\s{0,}[A-Za-z]\S{0,}/gi,
            "parse_rhs": /(\-|\+){0,1}\d{1,}\.{0,}\d{0,}\W{0,}\;{0,1}$/i,
            "parse_dir": /(\>|\<){0,}\=/gi,
            "parse_int": /[^\s|^\,]+/gi,
            "parse_bin": /[^\s|^\,]+/gi,
            "get_num": /(\-|\+){0,1}(\W|^)\d+\.{0,1}\d{0,}/g,
            "get_word": /[A-Za-z].*/
            /* jshint ignore:end */
        },
        model = {
            "opType": "",
            "optimize": "_obj",
            "constraints": {},
            "variables": {}
        },
        constraints = {
            ">=": "min",
            "<=": "max",
            "=": "equal"
        },
        tmp = "", ary = null, hldr = "", hldr2 = "",
        constraint = "", rhs = 0;

        // Handle input if its coming
        // to us as a hard string
        // instead of as an array of
        // strings
        if(typeof input === "string"){
            input = input.split("\n");
        }

        // Start iterating over the rows
        // to see what all we have
        for(var i = 0; i < input.length; i++){

            constraint = "__" + i;

            // Get the string we're working with
            tmp = input[i];

            // Reset the array
            ary = null;

            // Test to see if we're the objective
            if(rxo.is_objective.test(tmp)){
                // Set up in model the opType
                model.opType = tmp.match(/(max|min)/gi)[0];

                // Pull apart lhs
                ary = tmp.match(rxo.parse_lhs).map(function(d){
                    return d.replace(/\s+/,"");
                }).slice(1);



                // *** STEP 1 *** ///
                // Get the variables out
                ary.forEach(function(d){

                    // Get the number if its there
                    hldr = d.match(rxo.get_num);

                    // If it isn't a number, it might
                    // be a standalone variable
                    if(hldr === null){
                        if(d.substr(0,1) === "-"){
                            hldr = -1;
                        } else {
                            hldr = 1;
                        }
                    } else {
                        hldr = hldr[0];
                    }

                    hldr = parseFloat(hldr);

                    // Get the variable type
                    hldr2 = d.match(rxo.get_word)[0].replace(/\;$/,"");

                    // Make sure the variable is in the model
                    model.variables[hldr2] = model.variables[hldr2] || {};
                    model.variables[hldr2]._obj = hldr;

                });
            ////////////////////////////////////
            }else if(rxo.is_int.test(tmp)){
                // Get the array of ints
                ary = tmp.match(rxo.parse_int).slice(1);

                // Since we have an int, our model should too
                model.ints = model.ints || {};

                ary.forEach(function(d){
                    d = d.replace(";","");
                    model.ints[d] = 1;
                });
            ////////////////////////////////////
            } else if(rxo.is_bin.test(tmp)){
                // Get the array of bins
                ary = tmp.match(rxo.parse_bin).slice(1);

                // Since we have an binary, our model should too
                model.binaries = model.binaries || {};

                ary.forEach(function(d){
                    d = d.replace(";","");
                    model.binaries[d] = 1;
                });
            ////////////////////////////////////
            } else if(rxo.is_constraint.test(tmp)){
                var separatorIndex = tmp.indexOf(":");
                var constraintExpression = (separatorIndex === -1) ? tmp : tmp.slice(separatorIndex + 1);

                // Pull apart lhs
                ary = constraintExpression.match(rxo.parse_lhs).map(function(d){
                    return d.replace(/\s+/,"");
                });

                // *** STEP 1 *** ///
                // Get the variables out
                ary.forEach(function(d){
                    // Get the number if its there
                    hldr = d.match(rxo.get_num);

                    if(hldr === null){
                        if(d.substr(0,1) === "-"){
                            hldr = -1;
                        } else {
                            hldr = 1;
                        }
                    } else {
                        hldr = hldr[0];
                    }

                    hldr = parseFloat(hldr);


                    // Get the variable name
                    hldr2 = d.match(rxo.get_word)[0];

                    // Make sure the variable is in the model
                    model.variables[hldr2] = model.variables[hldr2] || {};
                    model.variables[hldr2][constraint] = hldr;

                });

                // *** STEP 2 *** ///
                // Get the RHS out
                rhs = parseFloat(tmp.match(rxo.parse_rhs)[0]);

                // *** STEP 3 *** ///
                // Get the Constrainer out
                tmp = constraints[tmp.match(rxo.parse_dir)[0]];
                model.constraints[constraint] = model.constraints[constraint] || {};
                model.constraints[constraint][tmp] = rhs;
            ////////////////////////////////////
            } else if(rxo.is_unrestricted.test(tmp)){
                // Get the array of unrestricted
                ary = tmp.match(rxo.parse_int).slice(1);

                // Since we have an int, our model should too
                model.unrestricted = model.unrestricted || {};

                ary.forEach(function(d){
                    d = d.replace(";","");
                    model.unrestricted[d] = 1;
                });
            }
        }
        return model;
    }


     /*************************************************************
     * Method: from_JSON
     * Scope: Public:
     * Agruments: model: The model we want solver to operate on
     * Purpose: Convert a friendly JSON model into a model for a
     *          real solving library...in this case
     *          lp_solver
     **************************************************************/
    function from_JSON(model){
        // Make sure we at least have a model
        if (!model) {
            throw new Error("Solver requires a model to operate on");
        }

        var output = "",
            lookup = {
                "max": "<=",
                "min": ">=",
                "equal": "="
            },
            rxClean = new RegExp("[^A-Za-z0-9_\[\{\}\/\.\&\#\$\%\~\'\@\^]", "gi");

        // Build the objective statement
        
        if(model.opType){
            
            output += model.opType + ":";

            // Iterate over the variables
            for(var x in model.variables){
                // Give each variable a self of 1 unless
                // it exists already
                model.variables[x][x] = model.variables[x][x] ? model.variables[x][x] : 1;

                // Does our objective exist here?
                if(model.variables[x][model.optimize]){
                    output += " " + model.variables[x][model.optimize] + " " + x.replace(rxClean,"_");
                }
            }
        } else {
            output += "max:";
        }
        


        // Add some closure to our line thing
        output += ";\n\n";

        // And now... to iterate over the constraints
        for(var xx in model.constraints){
            for(var y in model.constraints[xx]){
                if(typeof lookup[y] !== "undefined"){
                    
                    for(var z in model.variables){

                        // Does our Constraint exist here?
                        if(typeof model.variables[z][xx] !== "undefined"){
                            output += " " + model.variables[z][xx] + " " + z.replace(rxClean,"_");
                        }
                    }
                    // Add the constraint type and value...

                    output += " " + lookup[y] + " " + model.constraints[xx][y];
                    output += ";\n";
                    
                }
            }
        }

        // Are there any ints?
        if(model.ints){
            output += "\n\n";
            for(var xxx in model.ints){
                output += "int " + xxx.replace(rxClean,"_") + ";\n";
            }
        }

        // Are there any unrestricted?
        if(model.unrestricted){
            output += "\n\n";
            for(var xxxx in model.unrestricted){
                output += "unrestricted " + xxxx.replace(rxClean,"_") + ";\n";
            }
        }

        // And kick the string back
        return output;

    }


    var Reformat = function (model) {
        // If the user is giving us an array
        // or a string, convert it to a JSON Model
        // otherwise, spit it out as a string
        if(model.length){
            return to_JSON(model);
        } else {
            return from_JSON(model);
        }
    };

    /*global describe*/
    /*global require*/
    /*global it*/
    /*global console*/
    /*global process*/
    /*global exports*/
    /*global Promise*/


    // LP SOLVE CLI REFERENCE:
    // http://lpsolve.sourceforge.net/5.5/lp_solve.htm
    //
    //

    // var reformat = require("./Reformat.js");

    var reformat = Reformat;

    function clean_data(data){

        //
        // Clean Up
        // And Reformatting...
        //
        data = data.replace("\\r\\n","\r\n");


        data = data.split("\r\n");
        data = data.filter(function(x){
            
            var rx;
            
            //
            // Test 1
            rx = new RegExp(" 0$","gi");
            if(rx.test(x) === true){
                return false;
            }

            //
            // Test 2
            rx = new RegExp("\\d$","gi");
            if(rx.test(x) === false){
                return false;
            }
            

            return true;
        })
        .map(function(x){
            return x.split(/\:{0,1} +(?=\d)/);
        })
        .reduce(function(o,k,i){
            o[k[0]] = k[1];
            return o;
        },{});
        
        return data;
    }





    var solve = function(model){
        //
        return new Promise(function(res, rej){
            //
            // Exit if we're in the browser...
            //
            if(typeof window !== "undefined"){
                rej("Function Not Available in Browser");
            }
            //
            // Convert JSON model to lp_solve format
            //
            var data = Reformat(model);
            
            
            if(!model.external){
                rej("Data for this function must be contained in the 'external' attribute. Not seeing anything there.");
            }
            
            // 
            // In the args, they *SHALL* have provided an executable
            // path to the solver they're piping the data into
            //
            if(!model.external.binPath){
                rej("No Executable | Binary path provided in arguments as 'binPath'");
            }
            
            //
            // They also need to provide an arg_array
            //
            if(!model.external.args){
                rej("No arguments array for cli | bash provided on 'args' attribute");
            }
            
            //
            // They also need a tempName so we know where to store
            // the temp file we're creating...
            //
            if(!model.external.tempName){
                rej("No 'tempName' given. This is necessary to produce a staging file for the solver to operate on");
            }
            
            
            
            //
            // To my knowledge, in Windows, you cannot directly pipe text into
            // an exe...
            //
            // Thus, our process looks like this...
            //
            // 1.) Convert a model to something an external solver can use
            // 2.) Save the results from step 1 as a temp-text file
            // 3.) Pump the results into an exe | whatever-linux-uses
            // 4.) 
            // 
            //
            
            var fs = require$$1__default['default'];
            
            fs.writeFile(model.external.tempName, data, function(fe, fd){
                if(fe){
                    rej(fe);
                } else {
                    //
                    // So it looks like we wrote to a file and closed it.
                    // Neat.
                    //
                    // Now we need to execute our CLI...
                    var exec = require$$2__default['default'].execFile;
                    
                    //
                    // Put the temp file name in the args array...
                    //
                    model.external.args.push(model.external.tempName);
                    
                    exec(model.external.binPath, model.external.args, function(e,data){
                        if(e){
                            
                            if(e.code === 1){
                                res(clean_data(data));
                            } else {
                                
                                var codes = {
                                    "-2": "Out of Memory",
                                    "1": "SUBOPTIMAL",
                                    "2": "INFEASIBLE",
                                    "3": "UNBOUNDED",
                                    "4": "DEGENERATE",
                                    "5": "NUMFAILURE",
                                    "6": "USER-ABORT",
                                    "7": "TIMEOUT",
                                    "9": "PRESOLVED",
                                    "25": "ACCURACY ERROR",
                                    "255": "FILE-ERROR"
                                };
                                
                                var ret_obj = {
                                    "code": e.code,
                                    "meaning": codes[e.code],
                                    "data": data
                                };
                                
                                rej(ret_obj);
                            }

                        } else {
                            // And finally...return it.
                            res(clean_data(data));
                        }
                    });
                }
            });
        });
    };





    /*
    model.external = {
        "binPath": "C:/lpsolve/lp_solve.exe",
        "tempName": "C:/temp/out.txt",
        "args": [
            "-S2"
        ]
        
    }

    */

    var main = {
    	reformat: reformat,
    	solve: solve
    };

    /*global describe*/
    /*global require*/
    /*global it*/
    /*global console*/
    /*global process*/
    /*global exports*/
    /*global Promise*/
    /*global module*/

    var main$1 = {
        "lpsolve": main
    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/

        /***************************************************************
         * Method: polyopt
         * Scope: private
         * Agruments:
         *        model: The model we want solver to operate on.
                         Because we're in here, we're assuming that
                         we're solving a multi-objective optimization
                         problem. Poly-Optimization. polyopt.

                         This model has to be formed a little differently
                         because it has multiple objective functions.
                         Normally, a model has 2 attributes: opType (string,
                         "max" or "min"), and optimize (string, whatever
                         attribute we're optimizing.

                         Now, there is no opType attribute on the model,
                         and optimize is an object of attributes to be
                         optimized, and how they're to be optimized.
                         For example:

                         ...
                         "optimize": {
                            "pancakes": "max",
                            "cost": "minimize"
                         }
                         ...


         **************************************************************/

    var Polyopt = function(solver, model){

        // I have no idea if this is actually works, or what,
        // but here is my algorithm to solve linear programs
        // with multiple objective functions

        // 1. Optimize for each constraint
        // 2. The results for each solution is a vector
        //    representing a vertex on the polytope we're creating
        // 3. The results for all solutions describes the shape
        //    of the polytope (would be nice to have the equation
        //    representing this)
        // 4. Find the mid-point between all vertices by doing the
        //    following (a_1 + a_2 ... a_n) / n;
        var objectives = model.optimize,
            new_constraints = JSON.parse(JSON.stringify(model.optimize)),
            keys = Object.keys(model.optimize),
            tmp,
            counter = 0,
            vectors = {},
            vector_key = "",
            obj = {},
            pareto = [],
            i,j,x,y;

        // Delete the optimize object from the model
        delete model.optimize;

        // Iterate and Clear
        for(i = 0; i < keys.length; i++){
            // Clean up the new_constraints
            new_constraints[keys[i]] = 0;
        }

        // Solve and add
        for(i = 0; i < keys.length; i++){

            // Prep the model
            model.optimize = keys[i];
            model.opType = objectives[keys[i]];

            // solve the model
            tmp = solver.Solve(model, undefined, undefined, true);

            // Only the variables make it into the solution;
            // not the attributes.
            //
            // Because of this, we have to add the attributes
            // back onto the solution so we can do math with
            // them later...

            // Loop over the keys
            for(y in keys){
                // We're only worried about attributes, not variables
                if(!model.variables[keys[y]]){
                    // Create space for the attribute in the tmp object
                    tmp[keys[y]] = tmp[keys[y]] ? tmp[keys[y]] : 0;
                    // Go over each of the variables
                    for(x in model.variables){
                        // Does the variable exist in tmp *and* does attribute exist in this model?
                        if(model.variables[x][keys[y]] && tmp[x]){
                            // Add it to tmp
                            tmp[keys[y]] += tmp[x] * model.variables[x][keys[y]];
                        }
                    }
                }
            }

            // clear our key
            vector_key = "base";
            // this makes sure that if we get
            // the same vector more than once,
            // we only count it once when finding
            // the midpoint
            for(j = 0; j < keys.length; j++){
                if(tmp[keys[j]]){
                    vector_key += "-" + ((tmp[keys[j]] * 1000) | 0) / 1000;
                } else {
                    vector_key += "-0";
                }
            }

            // Check here to ensure it doesn't exist
            if(!vectors[vector_key]){
                // Add the vector-key in
                vectors[vector_key] = 1;
                counter++;
                
                // Iterate over the keys
                // and update our new constraints
                for(j = 0; j < keys.length; j++){
                    if(tmp[keys[j]]){
                        new_constraints[keys[j]] += tmp[keys[j]];
                    }
                }
                
                // Push the solution into the paretos
                // array after cleaning it of some
                // excess data markers
                
                delete tmp.feasible;
                delete tmp.result;            
                pareto.push(tmp);
            }
        }

        // Trying to find the mid-point
        // divide each constraint by the
        // number of constraints
        // *midpoint formula*
        // (x1 + x2 + x3) / 3
        for(i = 0; i < keys.length; i++){
            model.constraints[keys[i]] = {"equal": new_constraints[keys[i]] / counter};
        }

        // Give the model a fake thing to optimize on
        model.optimize = "cheater-" + Math.random();
        model.opType = "max";

        // And add the fake attribute to the variables
        // in the model
        for(i in model.variables){
            model.variables[i].cheater = 1;
        }
        
        // Build out the object with all attributes
        for(i in pareto){
            for(x in pareto[i]){
                obj[x] = obj[x] || {min: 1e99, max: -1e99};
            }
        }
        
        // Give each pareto a full attribute list
        // while getting the max and min values
        // for each attribute
        for(i in obj){
            for(x in pareto){
                if(pareto[x][i]){
                    if(pareto[x][i] > obj[i].max){
                        obj[i].max = pareto[x][i];
                    } 
                    if(pareto[x][i] < obj[i].min){
                        obj[i].min = pareto[x][i];
                    }
                } else {
                    pareto[x][i] = 0;
                    obj[i].min = 0;
                }
            }
        }
        // Solve the model for the midpoints
        tmp =  solver.Solve(model, undefined, undefined, true);
        
        return {
            midpoint: tmp,
            vertices: pareto,
            ranges: obj
        };    

    };

    /*global describe*/
    /*global require*/
    /*global module*/
    /*global it*/
    /*global console*/
    /*global process*/
    /*global setTimeout*/
    /*global self*/


    //-------------------------------------------------------------------
    // SimplexJS
    // https://github.com/
    // An Object-Oriented Linear Programming Solver
    //
    // By Justin Wolcott (c)
    // Licensed under the MIT License.
    //-------------------------------------------------------------------






    var Constraint$2 = expressions.Constraint;
    var Variable$2 = expressions.Variable;
    var Numeral = expressions.Numeral;
    var Term$1 = expressions.Term;


    // Place everything under the Solver Name Space
    var Solver = function () {

        this.Model = Model_1;
        this.branchAndCut = branchAndCut;
        this.Constraint = Constraint$2;
        this.Variable = Variable$2;
        this.Numeral = Numeral;
        this.Term = Term$1;
        this.Tableau = Tableau$1;
        this.lastSolvedModel = null;

        this.External = main$1;

        /*************************************************************
         * Method: Solve
         * Scope: Public:
         * Agruments:
         *        model: The model we want solver to operate on
         *        precision: If we're solving a MILP, how tight
         *                   do we want to define an integer, given
         *                   that 20.000000000000001 is not an integer.
         *                   (defaults to 1e-9)
         *            full: *get better description*
         *        validate: if left blank, it will get ignored; otherwise
         *                  it will run the model through all validation
         *                  functions in the *Validate* module
         **************************************************************/
        this.Solve = function (model, precision, full, validate) {
            //
            // Run our validations on the model
            // if the model doesn't have a validate
            // attribute set to false
            //
            if(validate){
                for(var test in Validation){
                    model = Validation[test](model);
                }
            }

            // Make sure we at least have a model
            if (!model) {
                throw new Error("Solver requires a model to operate on");
            }

            //
            // If the objective function contains multiple objectives,
            // pass it to the multi-solver thing...
            //
            if(typeof model.optimize === "object"){
                if(Object.keys(model.optimize > 1)){
                    return Polyopt(this, model);
                }
            }

    // /////////////////////////////////////////////////////////////////////
    // *********************************************************************
    // START
    // Try our hand at handling external solvers...
    // START
    // *********************************************************************
    // /////////////////////////////////////////////////////////////////////
            if(model.external){

                var solvers = Object.keys(main$1);
                solvers = JSON.stringify(solvers);
                
                //
                // The model needs to have a "solver" attribute if nothing else
                // for us to pass data into
                //
                if(!model.external.solver){
                    throw new Error("The model you provided has an 'external' object that doesn't have a solver attribute. Use one of the following:" + solvers);
                }
                
                //
                // If the solver they request doesn't exist; provide them
                // with a list of possible options:
                //
                if(!main$1[model.external.solver]){
                    throw new Error("No support (yet) for " + model.external.solver + ". Please use one of these instead:" + solvers);
                }
                
                return main$1[model.external.solver].solve(model);
                

    // /////////////////////////////////////////////////////////////////////
    // *********************************************************************
    //  END
    // Try our hand at handling external solvers...
    //  END
    // *********************************************************************
    // /////////////////////////////////////////////////////////////////////

            } else {

                if (model instanceof Model_1 === false) {
                    model = new Model_1(precision).loadJson(model);
                }

                var solution = model.solve();
                this.lastSolvedModel = model;
                solution.solutionSet = solution.generateSolutionSet();

                // If the user asks for a full breakdown
                // of the tableau (e.g. full === true)
                // this will return it
                if (full) {
                    return solution;
                } else {
                    // Otherwise; give the user the bare
                    // minimum of info necessary to carry on

                    var store = {};

                    // 1.) Add in feasibility to store;
                    store.feasible = solution.feasible;

                    // 2.) Add in the objective value
                    store.result = solution.evaluation;

                    store.bounded = solution.bounded;
                    
                    if(solution._tableau.__isIntegral){
                        store.isIntegral = true;
                    }

                    // 3.) Load all of the variable values
                    Object.keys(solution.solutionSet)
                        .forEach(function (d) {
                            //
                            // When returning data in standard format,
                            // Remove all 0's
                            //
                            if(solution.solutionSet[d] !== 0){
                                store[d] = solution.solutionSet[d];
                            }
                            
                        });

                    return store;
                }

            }

        };

        /*************************************************************
         * Method: ReformatLP
         * Scope: Public:
         * Agruments: model: The model we want solver to operate on
         * Purpose: Convert a friendly JSON model into a model for a
         *          real solving library...in this case
         *          lp_solver
         **************************************************************/
        this.ReformatLP = Reformat;


         /*************************************************************
         * Method: MultiObjective
         * Scope: Public:
         * Agruments:
         *        model: The model we want solver to operate on
         *        detail: if false, or undefined; it will return the
         *                result of using the mid-point formula; otherwise
         *                it will return an object containing:
         *
         *                1. The results from the mid point formula
         *                2. The solution for each objective solved
         *                   in isolation (pareto)
         *                3. The min and max of each variable along
         *                   the frontier of the polytope (ranges)
         * Purpose: Solve a model with multiple objective functions.
         *          Since a potential infinite number of solutions exist
         *          this naively returns the mid-point between
         *
         * Note: The model has to be changed a little to work with this.
         *       Before an *opType* was required. No more. The objective
         *       attribute of the model is now an object instead of a
         *       string.
         *
         *  *EXAMPLE MODEL*
         *
         *   model = {
         *       optimize: {scotch: "max", soda: "max"},
         *       constraints: {fluid: {equal: 100}},
         *       variables: {
         *           scotch: {fluid: 1, scotch: 1},
         *           soda: {fluid: 1, soda: 1}
         *       }
         *   }
         *
         **************************************************************/
        this.MultiObjective = function(model){
            return Polyopt(this, model);
        };
    };

    // var define = define || undefined;
    // var window = window || undefined;

    // If the project is loading through require.js, use `define` and exit
    if (typeof window === "object"){
        window.solver = new Solver();
    } else if (typeof self === "object"){
        self.solver = new Solver();
    }
    // Ensure that its available in node.js env
    var main$2 = new Solver();

    /**
     * Assigns every node a layer with the goal of minimizing the number of dummy
     * nodes (long edges) inserted. Computing this layering requires solving an
     * integer linear program, which may take a long time, although in practice is
     * often quite fast. This is often known as the network simplex layering from
     * [Gansner et al. [1993]](https://www.graphviz.org/Documentation/TSE93.pdf).
     *
     * Create a new [[SimplexOperator]] with [[simplex]].
     *
     * <img alt="simplex example" src="media://simplex.png" width="400">
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$3(debugVal) {
        function simplexCall(dag) {
            if (!dag.connected()) {
                throw new Error(`simplex() doesn't work with disconnected dags`);
                // TODO this could be fixed by first splitting the dag and running each
                // separately, and then merging
            }
            // use null prefixes to prevent clash
            const prefix = debugVal ? "" : "\0";
            const delim = debugVal ? " -> " : "\0";
            const variables = Object.create(null);
            const ints = Object.create(null);
            const constraints = Object.create(null);
            for (const node of dag) {
                const nid = `${prefix}${node.id}`;
                ints[nid] = 1;
                variables[nid] = {
                    opt: node.children.length
                };
            }
            for (const link of dag.ilinks()) {
                const source = variables[`${prefix}${link.source.id}`];
                const target = variables[`${prefix}${link.target.id}`];
                const edge = `${link.source.id}${delim}${link.target.id}`;
                constraints[edge] = { min: 1 };
                source[edge] = -1;
                source.opt++;
                target[edge] = 1;
                target.opt--;
            }
            const assignment = main$2.Solve({
                optimize: "opt",
                opType: "max",
                constraints: constraints,
                variables: variables,
                ints: ints
            });
            // lp solver doesn't assign some zeros
            for (const node of dag) {
                node.layer = assignment[`${prefix}${node.id}`] || 0;
            }
        }
        function debug(val) {
            if (val === undefined) {
                return debugVal;
            }
            else {
                return buildOperator$3(val);
            }
        }
        simplexCall.debug = debug;
        return simplexCall;
    }
    /** Create a default [[SimplexOperator]]. */
    function simplex(...args) {
        if (args.length) {
            throw new Error(`got arguments to simplex(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$3(false);
    }

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function* numbers(values, valueof) {
      if (valueof === undefined) {
        for (let value of values) {
          if (value != null && (value = +value) >= value) {
            yield value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
            yield value;
          }
        }
      }
    }

    function max(values, valueof) {
      let max;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null
              && (max < value || (max === undefined && value >= value))) {
            max = value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null
              && (max < value || (max === undefined && value >= value))) {
            max = value;
          }
        }
      }
      return max;
    }

    function min(values, valueof) {
      let min;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      }
      return min;
    }

    // Based on https://github.com/mourner/quickselect
    // ISC license, Copyright 2018 Vladimir Agafonkin.
    function quickselect(array, k, left = 0, right = array.length - 1, compare = ascending) {
      while (right > left) {
        if (right - left > 600) {
          const n = right - left + 1;
          const m = k - left + 1;
          const z = Math.log(n);
          const s = 0.5 * Math.exp(2 * z / 3);
          const sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
          const newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
          const newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
          quickselect(array, k, newLeft, newRight, compare);
        }

        const t = array[k];
        let i = left;
        let j = right;

        swap(array, left, k);
        if (compare(array[right], t) > 0) swap(array, left, right);

        while (i < j) {
          swap(array, i, j), ++i, --j;
          while (compare(array[i], t) < 0) ++i;
          while (compare(array[j], t) > 0) --j;
        }

        if (compare(array[left], t) === 0) swap(array, left, j);
        else ++j, swap(array, j, right);

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
      }
      return array;
    }

    function swap(array, i, j) {
      const t = array[i];
      array[i] = array[j];
      array[j] = t;
    }

    function quantile(values, p, valueof) {
      values = Float64Array.from(numbers(values, valueof));
      if (!(n = values.length)) return;
      if ((p = +p) <= 0 || n < 2) return min(values);
      if (p >= 1) return max(values);
      var n,
          i = (n - 1) * p,
          i0 = Math.floor(i),
          value0 = max(quickselect(values, i0).subarray(0, i0 + 1)),
          value1 = min(values.subarray(i0 + 1));
      return value0 + (value1 - value0) * (i - i0);
    }

    function arrayMedian(values, valueof) {
      return quantile(values, 0.5, valueof);
    }

    /** Create a median two layer ordering operator. */
    function median(...args) {
        if (args.length) {
            throw new Error(`got arguments to median(${args}), but constructor takes no aruguments.`);
        }
        function medianCall(topLayer, bottomLayer) {
            const positions = new SafeMap();
            for (const [i, node] of topLayer.entries()) {
                for (const child of node.ichildren()) {
                    positions.setIfAbsent(child.id, []).push(i);
                }
            }
            const medians = new SafeMap();
            let otherwise = -1;
            for (const node of bottomLayer) {
                const med = arrayMedian(positions.getDefault(node.id, []));
                if (med === undefined) {
                    medians.set(node.id, otherwise);
                    otherwise =
                        +!((otherwise + 1) / (topLayer.length + 1)) * (topLayer.length + 1) -
                            1;
                }
                else {
                    medians.set(node.id, med);
                }
            }
            bottomLayer.sort((a, b) => medians.getThrow(a.id) - medians.getThrow(b.id));
        }
        return medianCall;
    }

    /**
     * Create a decrossing operator that minimizes the number of decrossings
     * heuristically by looking at each pair of layers. This method is very fast and very general and pften produces good results. It is also highly customizable, and can be parametrized by any [["sugiyama/twolayer/index" | two layer operator]].
     *
     * Create a new [[TwoLayerOperator]] with [[twoLayer]].
     *
     * <img alt="two layer example" src="media://two_layer_greedy.png" width="400">
     *
     * @packageDocumentation
     */
    // TODO Add number of passes, with 0 being keep passing up and down until no changes (is this guaranteed to never change?, maybe always terminate if no changes, so this can be set very high to almost achieve that effect)
    // TODO Add optional greedy swapping of nodes after assignment
    // TODO Add two layer noop. This only makes sense if there's a greedy swapping ability
    /** @internal */
    function buildOperator$4(orderOp) {
        function twoLayerCall(layers) {
            layers
                .slice(0, layers.length - 1)
                .forEach((layer, i) => orderOp(layer, layers[i + 1]));
        }
        function order(ord) {
            if (ord === undefined) {
                return orderOp;
            }
            else {
                const localOrder = ord;
                return buildOperator$4(localOrder);
            }
        }
        twoLayerCall.order = order;
        return twoLayerCall;
    }
    /** Create a default [[TwoLayerOperator]]. */
    function twoLayer(...args) {
        if (args.length) {
            throw new Error(`got arguments to twoLayer(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$4(median());
    }

    let epsilon = 1.0e-60;
    let tmpa;
    let tmpb;

    do {
        epsilon += epsilon;
        tmpa = 1 + 0.1 * epsilon;
        tmpb = 1 + 0.2 * epsilon;
    } while (tmpa <= 1 || tmpb <= 1);

    var vsmall = epsilon;

    function dpori(a, lda, n) {
        let kp1, t;

        for (let k = 1; k <= n; k += 1) {
            a[k][k] = 1 / a[k][k];
            t = -a[k][k];

            // dscal(k - 1, t, a[1][k], 1);
            for (let i = 1; i < k; i += 1) {
                a[i][k] *= t;
            }

            kp1 = k + 1;
            if (n < kp1) {
                break;
            }
            for (let j = kp1; j <= n; j += 1) {
                t = a[k][j];
                a[k][j] = 0;

                // daxpy(k, t, a[1][k], 1, a[1][j], 1);
                for (let i = 1; i <= k; i += 1) {
                    a[i][j] += t * a[i][k];
                }
            }
        }
    }

    var dpori_1 = dpori;

    function dposl(a, lda, n, b) {
        let k, t;

        for (k = 1; k <= n; k += 1) {

            // t = ddot(k - 1, a[1][k], 1, b[1], 1);
            t = 0;
            for (let i = 1; i < k; i += 1) {
                t += a[i][k] * b[i];
            }

            b[k] = (b[k] - t) / a[k][k];
        }

        for (let kb = 1; kb <= n; kb += 1) {
            k = n + 1 - kb;
            b[k] /= a[k][k];
            t = -b[k];

            // daxpy(k - 1, t, a[1][k], 1, b[1], 1);
            for (let i = 1; i < k; i += 1) {
                b[i] += t * a[i][k];
            }
        }
    }

    var dposl_1 = dposl;

    function dpofa(a, lda, n, info) {
        let jm1, t, s;

        for (let j = 1; j <= n; j += 1) {
            info[1] = j;
            s = 0;
            jm1 = j - 1;
            if (jm1 < 1) {
                s = a[j][j] - s;
                if (s <= 0) {
                    break;
                }
                a[j][j] = Math.sqrt(s);
            } else {
                for (let k = 1; k <= jm1; k += 1) {

                    // t = a[k][j] - ddot(k - 1, a[1][k], 1, a[1][j], 1);
                    t = a[k][j];
                    for (let i = 1; i < k; i += 1) {
                        t -= a[i][j] * a[i][k];
                    }
                    t /= a[k][k];
                    a[k][j] = t;
                    s += t * t;
                }
                s = a[j][j] - s;
                if (s <= 0) {
                    break;
                }
                a[j][j] = Math.sqrt(s);
            }
            info[1] = 0;
        }
    }

    var dpofa_1 = dpofa;

    function qpgen2(dmat, dvec, fddmat, n, sol, lagr, crval, amat, bvec, fdamat, q, meq, iact, nnact = 0, iter, work, ierr) {
        let l1, it1, nvl, nact, temp, sum, t1, tt, gc, gs, nu, t1inf, t2min, go;

        const r = Math.min(n, q);

        let l = 2 * n + (r * (r + 5)) / 2 + 2 * q + 1;

        for (let i = 1; i <= n; i += 1) {
            work[i] = dvec[i];
        }
        for (let i = n + 1; i <= l; i += 1) {
            work[i] = 0;
        }
        for (let i = 1; i <= q; i += 1) {
            iact[i] = 0;
            lagr[i] = 0;
        }

        const info = [];

        if (ierr[1] === 0) {
            dpofa_1(dmat, fddmat, n, info);
            if (info[1] !== 0) {
                ierr[1] = 2;
                return;
            }
            dposl_1(dmat, fddmat, n, dvec);
            dpori_1(dmat, fddmat, n);
        } else {
            for (let j = 1; j <= n; j += 1) {
                sol[j] = 0;
                for (let i = 1; i <= j; i += 1) {
                    sol[j] += dmat[i][j] * dvec[i];
                }
            }
            for (let j = 1; j <= n; j += 1) {
                dvec[j] = 0;
                for (let i = j; i <= n; i += 1) {
                    dvec[j] += dmat[j][i] * sol[i];
                }
            }
        }

        crval[1] = 0;
        for (let j = 1; j <= n; j += 1) {
            sol[j] = dvec[j];
            crval[1] += work[j] * sol[j];
            work[j] = 0;
            for (let i = j + 1; i <= n; i += 1) {
                dmat[i][j] = 0;
            }
        }
        crval[1] = -crval[1] / 2;
        ierr[1] = 0;

        const iwzv = n;
        const iwrv = iwzv + n;
        const iwuv = iwrv + r;
        const iwrm = iwuv + r + 1;
        const iwsv = iwrm + (r * (r + 1)) / 2;
        const iwnbv = iwsv + q;

        for (let i = 1; i <= q; i += 1) {
            sum = 0;
            for (let j = 1; j <= n; j += 1) {
                sum += amat[j][i] * amat[j][i];
            }
            work[iwnbv + i] = Math.sqrt(sum);
        }

        nact = nnact;

        iter[1] = 0;
        iter[2] = 0;

        function fnGoto50() {
            iter[1] += 1;

            l = iwsv;
            for (let i = 1; i <= q; i += 1) {
                l += 1;
                sum = -bvec[i];
                for (let j = 1; j <= n; j += 1) {
                    sum += amat[j][i] * sol[j];
                }
                if (Math.abs(sum) < vsmall) {
                    sum = 0;
                }
                if (i > meq) {
                    work[l] = sum;
                } else {
                    work[l] = -Math.abs(sum);
                    if (sum > 0) {
                        for (let j = 1; j <= n; j += 1) {
                            amat[j][i] = -amat[j][i];
                        }
                        bvec[i] = -bvec[i];
                    }
                }
            }

            for (let i = 1; i <= nact; i += 1) {
                work[iwsv + iact[i]] = 0;
            }

            nvl = 0;
            temp = 0;
            for (let i = 1; i <= q; i += 1) {
                if (work[iwsv + i] < temp * work[iwnbv + i]) {
                    nvl = i;
                    temp = work[iwsv + i] / work[iwnbv + i];
                }
            }
            if (nvl === 0) {
                for (let i = 1; i <= nact; i += 1) {
                    lagr[iact[i]] = work[iwuv + i];
                }
                return 999;
            }

            return 0;
        }

        function fnGoto55() {
            for (let i = 1; i <= n; i += 1) {
                sum = 0;
                for (let j = 1; j <= n; j += 1) {
                    sum += dmat[j][i] * amat[j][nvl];
                }
                work[i] = sum;
            }

            l1 = iwzv;
            for (let i = 1; i <= n; i += 1) {
                work[l1 + i] = 0;
            }
            for (let j = nact + 1; j <= n; j += 1) {
                for (let i = 1; i <= n; i += 1) {
                    work[l1 + i] = work[l1 + i] + dmat[i][j] * work[j];
                }
            }

            t1inf = true;
            for (let i = nact; i >= 1; i -= 1) {
                sum = work[i];
                l = iwrm + (i * (i + 3)) / 2;
                l1 = l - i;
                for (let j = i + 1; j <= nact; j += 1) {
                    sum -= work[l] * work[iwrv + j];
                    l += j;
                }
                sum /= work[l1];
                work[iwrv + i] = sum;
                if (iact[i] <= meq) {
                    continue;
                }
                if (sum <= 0) {
                    continue;
                }
                t1inf = false;
                it1 = i;
            }

            if (!t1inf) {
                t1 = work[iwuv + it1] / work[iwrv + it1];
                for (let i = 1; i <= nact; i += 1) {
                    if (iact[i] <= meq) {
                        continue;
                    }
                    if (work[iwrv + i] <= 0) {
                        continue;
                    }
                    temp = work[iwuv + i] / work[iwrv + i];
                    if (temp < t1) {
                        t1 = temp;
                        it1 = i;
                    }
                }
            }

            sum = 0;
            for (let i = iwzv + 1; i <= iwzv + n; i += 1) {
                sum += work[i] * work[i];
            }
            if (Math.abs(sum) <= vsmall) {
                if (t1inf) {
                    ierr[1] = 1;

                    return 999; // GOTO 999
                }
                for (let i = 1; i <= nact; i += 1) {
                    work[iwuv + i] = work[iwuv + i] - t1 * work[iwrv + i];
                }
                work[iwuv + nact + 1] = work[iwuv + nact + 1] + t1;

                return 700; // GOTO 700
            }
            sum = 0;
            for (let i = 1; i <= n; i += 1) {
                sum += work[iwzv + i] * amat[i][nvl];
            }
            tt = -work[iwsv + nvl] / sum;
            t2min = true;
            if (!t1inf) {
                if (t1 < tt) {
                    tt = t1;
                    t2min = false;
                }
            }

            for (let i = 1; i <= n; i += 1) {
                sol[i] += tt * work[iwzv + i];
                if (Math.abs(sol[i]) < vsmall) {
                    sol[i] = 0;
                }
            }

            crval[1] += tt * sum * (tt / 2 + work[iwuv + nact + 1]);
            for (let i = 1; i <= nact; i += 1) {
                work[iwuv + i] = work[iwuv + i] - tt * work[iwrv + i];
            }
            work[iwuv + nact + 1] = work[iwuv + nact + 1] + tt;

            if (t2min) {
                nact += 1;
                iact[nact] = nvl;

                l = iwrm + ((nact - 1) * nact) / 2 + 1;
                for (let i = 1; i <= nact - 1; i += 1) {
                    work[l] = work[i];
                    l += 1;
                }

                if (nact === n) {
                    work[l] = work[n];
                } else {
                    for (let i = n; i >= nact + 1; i -= 1) {
                        if (work[i] === 0) {
                            continue;
                        }
                        gc = Math.max(Math.abs(work[i - 1]), Math.abs(work[i]));
                        gs = Math.min(Math.abs(work[i - 1]), Math.abs(work[i]));
                        if (work[i - 1] >= 0) {
                            temp = Math.abs(gc * Math.sqrt(1 + gs * gs /
                                (gc * gc)));
                        } else {
                            temp = -Math.abs(gc * Math.sqrt(1 + gs * gs /
                                (gc * gc)));
                        }
                        gc = work[i - 1] / temp;
                        gs = work[i] / temp;

                        if (gc === 1) {
                            continue;
                        }
                        if (gc === 0) {
                            work[i - 1] = gs * temp;
                            for (let j = 1; j <= n; j += 1) {
                                temp = dmat[j][i - 1];
                                dmat[j][i - 1] = dmat[j][i];
                                dmat[j][i] = temp;
                            }
                        } else {
                            work[i - 1] = temp;
                            nu = gs / (1 + gc);
                            for (let j = 1; j <= n; j += 1) {
                                temp = gc * dmat[j][i - 1] + gs * dmat[j][i];
                                dmat[j][i] = nu * (dmat[j][i - 1] + temp) -
                                    dmat[j][i];
                                dmat[j][i - 1] = temp;

                            }
                        }
                    }
                    work[l] = work[nact];
                }
            } else {
                sum = -bvec[nvl];
                for (let j = 1; j <= n; j += 1) {
                    sum += sol[j] * amat[j][nvl];
                }
                if (nvl > meq) {
                    work[iwsv + nvl] = sum;
                } else {
                    work[iwsv + nvl] = -Math.abs(sum);
                    if (sum > 0) {
                        for (let j = 1; j <= n; j += 1) {
                            amat[j][nvl] = -amat[j][nvl];
                        }
                        bvec[nvl] = -bvec[nvl];
                    }
                }

                return 700; // GOTO 700
            }

            return 0;
        }

        function fnGoto797() {
            l = iwrm + (it1 * (it1 + 1)) / 2 + 1;
            l1 = l + it1;
            if (work[l1] === 0) {
                return 798; // GOTO 798
            }
            gc = Math.max(Math.abs(work[l1 - 1]), Math.abs(work[l1]));
            gs = Math.min(Math.abs(work[l1 - 1]), Math.abs(work[l1]));
            if (work[l1 - 1] >= 0) {
                temp = Math.abs(gc * Math.sqrt(1 + gs * gs / (gc * gc)));
            } else {
                temp = -Math.abs(gc * Math.sqrt(1 + gs * gs / (gc * gc)));
            }
            gc = work[l1 - 1] / temp;
            gs = work[l1] / temp;

            if (gc === 1) {
                return 798; // GOTO 798
            }
            if (gc === 0) {
                for (let i = it1 + 1; i <= nact; i += 1) {
                    temp = work[l1 - 1];
                    work[l1 - 1] = work[l1];
                    work[l1] = temp;
                    l1 += i;
                }
                for (let i = 1; i <= n; i += 1) {
                    temp = dmat[i][it1];
                    dmat[i][it1] = dmat[i][it1 + 1];
                    dmat[i][it1 + 1] = temp;
                }
            } else {
                nu = gs / (1 + gc);
                for (let i = it1 + 1; i <= nact; i += 1) {
                    temp = gc * work[l1 - 1] + gs * work[l1];
                    work[l1] = nu * (work[l1 - 1] + temp) - work[l1];
                    work[l1 - 1] = temp;
                    l1 += i;
                }
                for (let i = 1; i <= n; i += 1) {
                    temp = gc * dmat[i][it1] + gs * dmat[i][it1 + 1];
                    dmat[i][it1 + 1] = nu * (dmat[i][it1] + temp) -
                        dmat[i][it1 + 1];
                    dmat[i][it1] = temp;
                }
            }

            return 0;
        }

        function fnGoto798() {
            l1 = l - it1;
            for (let i = 1; i <= it1; i += 1) {
                work[l1] = work[l];
                l += 1;
                l1 += 1;
            }

            work[iwuv + it1] = work[iwuv + it1 + 1];
            iact[it1] = iact[it1 + 1];
            it1 += 1;
            if (it1 < nact) {
                return 797; // GOTO 797
            }

            return 0;
        }

        function fnGoto799() {
            work[iwuv + nact] = work[iwuv + nact + 1];
            work[iwuv + nact + 1] = 0;
            iact[nact] = 0;
            nact -= 1;
            iter[2] += 1;

            return 0;
        }

        go = 0;
        while (true) { // eslint-disable-line no-constant-condition
            go = fnGoto50();
            if (go === 999) {
                return;
            }
            while (true) { // eslint-disable-line no-constant-condition
                go = fnGoto55();
                if (go === 0) {
                    break;
                }
                if (go === 999) {
                    return;
                }
                if (go === 700) {
                    if (it1 === nact) {
                        fnGoto799();
                    } else {
                        while (true) { // eslint-disable-line no-constant-condition
                            fnGoto797();
                            go = fnGoto798();
                            if (go !== 797) {
                                break;
                            }
                        }
                        fnGoto799();
                    }
                }
            }
        }

    }

    var qpgen2_1 = qpgen2;

    function solveQP(Dmat, dvec, Amat, bvec = [], meq = 0, factorized = [0, 0]) {
        const crval = [];
        const iact = [];
        const sol = [];
        const lagr = [];
        const work = [];
        const iter = [];

        let message = "";

        // In Fortran the array index starts from 1
        const n = Dmat.length - 1;
        const q = Amat[1].length - 1;

        if (!bvec) {
            for (let i = 1; i <= q; i += 1) {
                bvec[i] = 0;
            }
        }

        if (n !== Dmat[1].length - 1) {
            message = "Dmat is not symmetric!";
        }
        if (n !== dvec.length - 1) {
            message = "Dmat and dvec are incompatible!";
        }
        if (n !== Amat.length - 1) {
            message = "Amat and dvec are incompatible!";
        }
        if (q !== bvec.length - 1) {
            message = "Amat and bvec are incompatible!";
        }
        if ((meq > q) || (meq < 0)) {
            message = "Value of meq is invalid!";
        }

        if (message !== "") {
            return {
                message
            };
        }

        for (let i = 1; i <= q; i += 1) {
            iact[i] = 0;
            lagr[i] = 0;
        }

        const nact = 0;
        const r = Math.min(n, q);

        for (let i = 1; i <= n; i += 1) {
            sol[i] = 0;
        }
        crval[1] = 0;
        for (let i = 1; i <= (2 * n + (r * (r + 5)) / 2 + 2 * q + 1); i += 1) {
            work[i] = 0;
        }
        for (let i = 1; i <= 2; i += 1) {
            iter[i] = 0;
        }

        qpgen2_1(Dmat, dvec, n, n, sol, lagr, crval, Amat, bvec, n, q, meq, iact, nact, iter, work, factorized);

        if (factorized[1] === 1) {
            message = "constraints are inconsistent, no solution!";
        }
        if (factorized[1] === 2) {
            message = "matrix D in quadratic function is not positive definite!";
        }

        return {
            solution: sol,
            Lagrangian: lagr,
            value: crval,
            unconstrained_solution: dvec, // eslint-disable-line camelcase
            iterations: iter,
            iact,
            message
        };
    }

    var solveQP_1 = solveQP;

    var quadprog = {
    	solveQP: solveQP_1
    };

    var quadprog$1 = quadprog;

    // wrapper for solveQP
    function qp(Q, c, A, b, meq) {
        const Dmat = [[0]];
        const dvec = [0];
        const Amat = [[0]];
        const bvec = [0];
        for (const qRow of Q) {
            const newRow = [0];
            newRow.push(...qRow);
            Dmat.push(newRow);
        }
        dvec.push(...c);
        Amat.push(...c.map(() => [0]));
        for (const aRow of A) {
            for (const [j, val] of aRow.entries()) {
                Amat[j + 1].push(-val);
            }
        }
        bvec.push(...b.map((v) => -v));
        const { solution, message } = quadprog$1.solveQP(Dmat, dvec, Amat, bvec, meq);
        /* istanbul ignore next */
        if (message.length) {
            throw new Error(`quadprog failed with: ${message}`);
        }
        solution.shift();
        return solution;
    }
    // solve for node positions
    function solve$1(Q, c, A, b, meq = 0) {
        // Arbitrarily set the last coordinate to 0 (by removing it from the
        // equation), which makes the formula valid This is simpler than special
        // casing the last element
        c.pop();
        Q.pop();
        Q.forEach((row) => row.pop());
        A.forEach((row) => row.pop());
        // Solve
        const solution = qp(Q, c, A, b, meq);
        // Undo last coordinate removal
        solution.push(0);
        return solution;
    }
    // compute indices used to index arrays
    function indices(layers) {
        const inds = new SafeMap();
        let i = 0;
        for (const layer of layers) {
            for (const node of layer) {
                inds.set(node.id, i++);
            }
        }
        return inds;
    }
    // Compute constraint arrays for layer separation
    function init(layers, inds, separation) {
        const n = 1 + Math.max(...inds.values());
        const A = [];
        const b = [];
        for (const layer of layers) {
            let [first, ...rest] = layer;
            for (const second of rest) {
                const find = inds.getThrow(first.id);
                const sind = inds.getThrow(second.id);
                const cons = new Array(n).fill(0);
                cons[find] = 1;
                cons[sind] = -1;
                A.push(cons);
                b.push(-separation(first, second));
                first = second;
            }
        }
        const c = new Array(n).fill(0);
        const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
        return [Q, c, A, b];
    }
    // update Q that minimizes edge distance squared
    function minDist(Q, pind, cind, coef) {
        Q[cind][cind] += coef;
        Q[cind][pind] -= coef;
        Q[pind][cind] -= coef;
        Q[pind][pind] += coef;
    }
    // update Q that minimizes curve of edges through a node
    // where curve is calcukates as the squared distance of the middle node from
    // the midpoint of the first and last, multiplied by four for some reason
    function minBend(Q, pind, nind, cind, coef) {
        Q[cind][cind] += coef;
        Q[cind][nind] -= 2 * coef;
        Q[cind][pind] += coef;
        Q[nind][cind] -= 2 * coef;
        Q[nind][nind] += 4 * coef;
        Q[nind][pind] -= 2 * coef;
        Q[pind][cind] += coef;
        Q[pind][nind] -= 2 * coef;
        Q[pind][pind] += coef;
    }
    // Assign nodes x in [0, 1] based on solution
    function layout(layers, inds, solution) {
        // Rescale to be in [0, 1]
        const min = Math.min(...solution);
        const span = Math.max(...solution) - min;
        for (const layer of layers) {
            for (const node of layer) {
                const index = inds.getThrow(node.id);
                node.x = (solution[index] - min) / span;
            }
        }
    }

    class DummyNode extends LayoutDagNode {
        constructor(id) {
            super(id, undefined);
        }
    }

    /**
     * This accessor positions nodes so that the distance between nodes and the
     * their neightbors is minimized, while the curve through dummy nodes is also
     * minimized. This has the effect of trying to make edges as straight and
     * vertical as possible. This accessor solves a quadratic program (QP) and so
     * may take significant time, especially as the number of nodes grows.
     *
     * <img alt="vert example" src="media://simplex.png" width="400">
     *
     * @packageDocumentation
     */
    /** Create a vertical coordinate assignment operator. */
    function vert(...args) {
        if (args.length) {
            throw new Error(`got arguments to vert(${args}), but constructor takes no aruguments.`);
        }
        const weight = 0.5;
        function vertCall(layers, separation) {
            const inds = indices(layers);
            const [Q, c, A, b] = init(layers, inds, separation);
            for (const layer of layers) {
                for (const par of layer) {
                    const pind = inds.getThrow(par.id);
                    for (const node of par.ichildren()) {
                        const nind = inds.getThrow(node.id);
                        if (!(par instanceof DummyNode)) {
                            minDist(Q, pind, nind, 1 - weight);
                        }
                        if (!(node instanceof DummyNode)) {
                            minDist(Q, pind, nind, 1 - weight);
                        }
                        else {
                            for (const child of node.ichildren()) {
                                const cind = inds.getThrow(child.id);
                                minBend(Q, pind, nind, cind, weight);
                            }
                        }
                    }
                }
            }
            const solution = solve$1(Q, c, A, b);
            layout(layers, inds, solution);
        }
        return vertCall;
    }

    /**
     * This module contains methods for constructing a layered representation of
     * the DAG meant for visualization.  The algorithm is based off ideas presented
     * in K. Sugiyama et al. [1979], but described by [S.
     * Hong](http://www.it.usyd.edu.au/~shhong/fab.pdf).  The sugiyama layout can
     * be configured with different algorithms for each stage of the layout.  For
     * each stage there should be adecuate choices for methods that balance speed
     * and quality for your desired layout, but any function that meets the
     * interface for that stage is valid, but custom methods can also be provided,
     * assuming they do what's necessary in that step.
     *
     * The method [[sugiyama]] is used to create a new [[SugiyamaOperator]]. This
     * can be customized with all of the methods available, but in particular the
     * method is broken down into three steps:
     * 1. [["sugiyama/layering/index" | layering]] - in this step, every node is
     *    assigned an integer later such that children are guaranteed to have
     *    higher layers than their parents.
     * 2. [["sugiyama/decross/index" | decrossing]] - in the step, nodes in each
     *    layer are reordered to minimize the number of crossings.
     * 3. [["sugiyama/coord/index" | coordinate assignment]] - in the step, the
     *    nodes are assigned x and y coordinates that respect their layer, and
     *    layer ordering.
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$5(layeringOp, decrossOp, coordOp, nodeSized, sizeVals, separationOp, debugVal) {
        const [width, height] = sizeVals;
        function createLayers(dag) {
            const layers = [];
            // NOTE copy here is explicit so that modifying the graph doesn't change how we iterate
            for (const node of dag.descendants()) {
                // add node to layer
                const nlayer = node.layer;
                const layer = layers[nlayer] || (layers[nlayer] = []);
                layer.push(node);
                // add dummy nodes in place of children
                node.dataChildren = node.dataChildren.map((link) => {
                    const clayer = link.child.layer;
                    if (clayer <= nlayer) {
                        throw new Error(`layering left child node "${link.child.id}" (${clayer}) ` +
                            `with a greater or equal layer to parent node "${node.id}" (${nlayer})`);
                    }
                    // NOTE this cast breaks the type system, but sugiyama basically
                    // needs to do that, so...
                    let last = link.child;
                    for (let l = clayer - 1; l > nlayer; l--) {
                        let dummyId;
                        if (debugVal) {
                            dummyId = `${node.id}->${link.child.id} (${l})`;
                        }
                        else {
                            dummyId = `${node.id}\0${link.child.id}\0${l}`;
                        }
                        const dummy = new DummyNode(dummyId);
                        dummy.dataChildren.push(new LayoutChildLink(last, undefined));
                        (layers[l] || (layers[l] = [])).push(dummy);
                        last = dummy;
                    }
                    // NOTE this cast breaks the type system, but sugiyama basically
                    // needs to do that, so...
                    return new LayoutChildLink(last, link.data);
                });
            }
            return layers;
        }
        function removeDummies(dag) {
            for (const node of dag) {
                /* istanbul ignore next */
                if (!(node instanceof DummyNode)) {
                    node.dataChildren = node.dataChildren.map((link) => {
                        let child = link.child;
                        const points = [{ x: node.x, y: node.y }];
                        while (child instanceof DummyNode) {
                            points.push({ x: child.x, y: child.y });
                            [child] = child.ichildren();
                        }
                        points.push({ x: child.x, y: child.y });
                        return new LayoutChildLink(child, link.data, points);
                    });
                }
            }
        }
        function sugiyama(dag) {
            // compute layers
            layeringOp(dag);
            // create layers
            for (const node of dag) {
                const layer = node.layer;
                if (layer === undefined) {
                    throw new Error(`layering did not assign layer to node '${node.id}'`);
                }
                else if (layer < 0) {
                    throw new Error(`layering assigned a negative layer (${layer}) to node '${node.id}'`);
                }
            }
            const layers = createLayers(dag);
            // assign y
            if (layers.length === 1) {
                const [layer] = layers;
                layer.forEach((n) => (n.y = height / 2));
            }
            else {
                const dh = nodeSized ? height : height / (layers.length - 1);
                layers.forEach((layer, i) => layer.forEach((n) => (n.y = dh * i)));
            }
            if (layers.every((l) => l.length === 1)) {
                // next steps aren't necessary
                layers.forEach(([n]) => (n.x = width / 2));
            }
            else {
                // minimize edge crossings
                decrossOp(layers);
                // assign coordinates
                coordOp(layers, separationOp);
                // scale x
                for (const layer of layers) {
                    for (const node of layer) {
                        if (node.x === undefined) {
                            throw new Error(`coord didn't assign an x to node '${node.id}'`);
                        }
                    }
                }
                const exed = layers;
                const minGap = Math.min(...exed
                    .filter((layer) => layer.length > 1)
                    .map((layer) => Math.min(...layer.slice(1).map((n, i) => n.x - layer[i].x))));
                const sw = nodeSized ? minGap : 1.0;
                for (const layer of exed) {
                    for (const node of layer) {
                        node.x *= width / sw;
                    }
                }
            }
            // Remove dummy nodes and update edge data
            const sugied = dag;
            removeDummies(sugied);
            return sugied;
        }
        function layering(layer) {
            if (layer === undefined) {
                return layeringOp;
            }
            else {
                const localLayering = layer;
                return buildOperator$5(localLayering, decrossOp, coordOp, nodeSized, sizeVals, separationOp, debugVal);
            }
        }
        sugiyama.layering = layering;
        function decross(dec) {
            if (dec === undefined) {
                return decrossOp;
            }
            else {
                return buildOperator$5(layeringOp, dec, coordOp, nodeSized, sizeVals, separationOp, debugVal);
            }
        }
        sugiyama.decross = decross;
        function coord(crd) {
            if (crd === undefined) {
                return coordOp;
            }
            else {
                return buildOperator$5(layeringOp, decrossOp, crd, nodeSized, sizeVals, separationOp, debugVal);
            }
        }
        sugiyama.coord = coord;
        function size(sz) {
            if (sz !== undefined) {
                return buildOperator$5(layeringOp, decrossOp, coordOp, false, sz, separationOp, debugVal);
            }
            else if (nodeSized) {
                return null;
            }
            else {
                return sizeVals;
            }
        }
        sugiyama.size = size;
        function nodeSize(sz) {
            if (sz !== undefined) {
                return buildOperator$5(layeringOp, decrossOp, coordOp, true, sz, separationOp, debugVal);
            }
            else if (nodeSized) {
                return sizeVals;
            }
            else {
                return null;
            }
        }
        sugiyama.nodeSize = nodeSize;
        function separation(sep) {
            if (sep === undefined) {
                return separationOp;
            }
            else {
                const localSep = sep;
                return buildOperator$5(layeringOp, decrossOp, coordOp, nodeSized, sizeVals, localSep, debugVal);
            }
        }
        sugiyama.separation = separation;
        function debug(deb) {
            if (deb === undefined) {
                return debugVal;
            }
            else {
                return buildOperator$5(layeringOp, decrossOp, coordOp, nodeSized, sizeVals, separationOp, deb);
            }
        }
        sugiyama.debug = debug;
        return sugiyama;
    }
    /**
     * Construct a new [[SugiyamaOperator]] with the default settings.
     */
    function sugiyama(...args) {
        if (args.length) {
            throw new Error(`got arguments to sugiyama(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$5(simplex(), twoLayer(), vert(), false, [1, 1], defaultSeparation, false);
    }
    /** @internal */
    function defaultSeparation() {
        return 1;
    }

    /**
     * Assigns every node a distinct layer. This layering operator is often only
     * useful in conjunction with topological coordinate assignment. This layering
     * is very fast, but it may make other steps take longer due to the many
     * created dummy nodes.
     *
     * Create a new [[TopologicalOperator]] with [[topological]].
     *
     * <img alt="topological example" src="media://topological.png" width="400">
     *
     * @packageDocumentation
     */
    /**
     * Create a topological layering.
     */
    function topological(...args) {
        if (args.length) {
            throw new Error(`got arguments to topological(${args}), but constructor takes no aruguments.`);
        }
        function topologicalCall(dag) {
            for (const [layer, node] of dag.idescendants("before").entries()) {
                node.layer = layer;
            }
        }
        return topologicalCall;
    }

    /** @internal */
    function buildOperator$6(topDownVal) {
        function bottomUp(dag) {
            const maxHeight = Math.max(...dag.iroots().map((d) => d.value));
            for (const node of dag) {
                node.layer = maxHeight - node.value;
            }
        }
        function longestPathCall(dag) {
            if (topDownVal) {
                for (const node of dag.depth()) {
                    node.layer = node.value;
                }
            }
            else {
                bottomUp(dag.height());
            }
        }
        function topDown(val) {
            if (val === undefined) {
                return topDownVal;
            }
            else {
                return buildOperator$6(val);
            }
        }
        longestPathCall.topDown = topDown;
        return longestPathCall;
    }
    /** Create a default [[LongestPathOperator]]. */
    function longestPath(...args) {
        if (args.length) {
            throw new Error(`got arguments to longestPath(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$6(true);
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var FastPriorityQueue_1 = createCommonjsModule(function (module) {

    var defaultcomparator = function(a, b) {
      return a < b;
    };

    // the provided comparator function should take a, b and return *true* when a < b
    function FastPriorityQueue(comparator) {
      if (!(this instanceof FastPriorityQueue)) return new FastPriorityQueue(comparator);
      this.array = [];
      this.size = 0;
      this.compare = comparator || defaultcomparator;
    }

    // copy the priority queue into another, and return it. Queue items are shallow-copied.
    // Runs in `O(n)` time.
    FastPriorityQueue.prototype.clone = function() {
      var fpq = new FastPriorityQueue(this.compare);
      fpq.size = this.size;
      for (var i = 0; i < this.size; i++) {
        fpq.array.push(this.array[i]);
      }
      return fpq;
    };

    // Add an element into the queue
    // runs in O(log n) time
    FastPriorityQueue.prototype.add = function(myval) {
      var i = this.size;
      this.array[this.size] = myval;
      this.size += 1;
      var p;
      var ap;
      while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        if (!this.compare(myval, ap)) {
          break;
        }
        this.array[i] = ap;
        i = p;
      }
      this.array[i] = myval;
    };

    // replace the content of the heap by provided array and "heapify it"
    FastPriorityQueue.prototype.heapify = function(arr) {
      this.array = arr;
      this.size = arr.length;
      var i;
      for (i = this.size >> 1; i >= 0; i--) {
        this._percolateDown(i);
      }
    };

    // for internal use
    FastPriorityQueue.prototype._percolateUp = function(i, force) {
      var myval = this.array[i];
      var p;
      var ap;
      while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        // force will skip the compare
        if (!force && !this.compare(myval, ap)) {
          break;
        }
        this.array[i] = ap;
        i = p;
      }
      this.array[i] = myval;
    };

    // for internal use
    FastPriorityQueue.prototype._percolateDown = function(i) {
      var size = this.size;
      var hsize = this.size >>> 1;
      var ai = this.array[i];
      var l;
      var r;
      var bestc;
      while (i < hsize) {
        l = (i << 1) + 1;
        r = l + 1;
        bestc = this.array[l];
        if (r < size) {
          if (this.compare(this.array[r], bestc)) {
            l = r;
            bestc = this.array[r];
          }
        }
        if (!this.compare(bestc, ai)) {
          break;
        }
        this.array[i] = bestc;
        i = l;
      }
      this.array[i] = ai;
    };

    // internal
    // _removeAt(index) will remove the item at the given index from the queue,
    // retaining balance. returns the removed item, or undefined if nothing is removed.
    FastPriorityQueue.prototype._removeAt = function(index) {
      if (index > this.size - 1 || index < 0) return undefined;

      // impl1:
      //this.array.splice(index, 1);
      //this.heapify(this.array);
      // impl2:
      this._percolateUp(index, true);
      return this.poll();
    };

    // remove(myval) will remove an item matching the provided value from the
    // queue, checked for equality by using the queue's comparator.
    // return true if removed, false otherwise.
    FastPriorityQueue.prototype.remove = function(myval) {
      for (var i = 0; i < this.size; i++) {
        if (!this.compare(this.array[i], myval) && !this.compare(myval, this.array[i])) {
          // items match, comparator returns false both ways, remove item
          this._removeAt(i);
          return true;
        }
      }
      return false;
    };

    // internal
    // removes and returns items for which the callback returns true.
    FastPriorityQueue.prototype._batchRemove = function(callback, limit) {
      // initialize return array with max size of the limit or current queue size
      var retArr = new Array(limit ? limit : this.size);
      var count = 0;

      if (typeof callback === 'function' && this.size) {
        var i = 0;
        while (i < this.size && count < retArr.length) {
          if (callback(this.array[i])) {
            retArr[count] = this._removeAt(i);
            count++;
            // move up a level in the heap if we remove an item
            i = i >> 1;
          } else {
            i++;
          }
        } 
      }
      retArr.length = count;
      return retArr;
    };

    // removeOne(callback) will execute the callback function for each item of the queue
    // and will remove the first item for which the callback will return true.
    // return the removed item, or undefined if nothing is removed.
    FastPriorityQueue.prototype.removeOne = function(callback) {
      var arr = this._batchRemove(callback, 1);
      return arr.length > 0 ? arr[0] : undefined;
    };

    // remove(callback[, limit]) will execute the callback function for each item of
    // the queue and will remove each item for which the callback returns true, up to
    // a max limit of removed items if specified or no limit if unspecified.
    // return an array containing the removed items.
    FastPriorityQueue.prototype.removeMany = function(callback, limit) {
      return this._batchRemove(callback, limit);
    };

    // Look at the top of the queue (one of the smallest elements) without removing it
    // executes in constant time
    //
    // Calling peek on an empty priority queue returns
    // the "undefined" value.
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
    //
    FastPriorityQueue.prototype.peek = function() {
      if (this.size == 0) return undefined;
      return this.array[0];
    };

    // remove the element on top of the heap (one of the smallest elements)
    // runs in logarithmic time
    //
    // If the priority queue is empty, the function returns the
    // "undefined" value.
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
    //
    // For long-running and large priority queues, or priority queues
    // storing large objects, you may  want to call the trim function
    // at strategic times to recover allocated memory.
    FastPriorityQueue.prototype.poll = function() {
      if (this.size == 0) return undefined;
      var ans = this.array[0];
      if (this.size > 1) {
        this.array[0] = this.array[--this.size];
        this._percolateDown(0);
      } else {
        this.size -= 1;
      }
      return ans;
    };

    // This function adds the provided value to the heap, while removing
    // and returning one of the smallest elements (like poll). The size of the queue
    // thus remains unchanged.
    FastPriorityQueue.prototype.replaceTop = function(myval) {
      if (this.size == 0) return undefined;
      var ans = this.array[0];
      this.array[0] = myval;
      this._percolateDown(0);
      return ans;
    };

    // recover unused memory (for long-running priority queues)
    FastPriorityQueue.prototype.trim = function() {
      this.array = this.array.slice(0, this.size);
    };

    // Check whether the heap is empty
    FastPriorityQueue.prototype.isEmpty = function() {
      return this.size === 0;
    };

    // iterate over the items in order, pass a callback that receives (item, index) as args.
    // TODO once we transpile, uncomment
    // if (Symbol && Symbol.iterator) {
    //   FastPriorityQueue.prototype[Symbol.iterator] = function*() {
    //     if (this.isEmpty()) return;
    //     var fpq = this.clone();
    //     while (!fpq.isEmpty()) {
    //       yield fpq.poll();
    //     }
    //   };
    // }
    FastPriorityQueue.prototype.forEach = function(callback) {
      if (this.isEmpty() || typeof callback != 'function') return;
      var i = 0;
      var fpq = this.clone();
      while (!fpq.isEmpty()) {
        callback(fpq.poll(), i++);
      }
    };

    // return the k 'smallest' elements of the queue
    // runs in O(k log k) time
    // this is the equivalent of repeatedly calling poll, but
    // it has a better computational complexity, which can be
    // important for large data sets.
    FastPriorityQueue.prototype.kSmallest = function(k) {
      if (this.size == 0) return [];
      var comparator = this.compare;
      var arr = this.array;
      var fpq = new FastPriorityQueue(function(a,b){
       return comparator(arr[a],arr[b]);
      });
      k = Math.min(this.size, k);
      var smallest = new Array(k);
      var j = 0;
      fpq.add(0);
      while (j < k) {
        var small = fpq.poll();
        smallest[j++] = this.array[small];
        var l = (small << 1) + 1;
        var r = l + 1;
        if (l < this.size) fpq.add(l);
        if (r < this.size) fpq.add(r);
      }
      return smallest;
    };

    // just for illustration purposes
    var main = function() {
      // main code
      var x = new FastPriorityQueue(function(a, b) {
        return a < b;
      });
      x.add(1);
      x.add(0);
      x.add(5);
      x.add(4);
      x.add(3);
      while (!x.isEmpty()) {
        console.log(x.poll());
      }
    };

    if (require.main === module) {
      main();
    }

    module.exports = FastPriorityQueue;
    });

    /**
     * Assigns every node a layer such that the width, not counting dummy nodes, is
     * always less than some constant. This can result in tall graphs, but is also
     * reasonably fast. If the max width is set to zero (the default), the width
     * will instead be set to the square root of the number of nodes.
     *
     * Create a new [[CoffmanGrahamOperator]] with [[coffmanGraham]].
     *
     * <img alt="Coffman-Graham example" src="media://coffman_graham.png" width="400">
     *
     * @packageDocumentation
     */
    /** @internal */
    class Data {
        constructor() {
            this.before = [];
            this.parents = [];
        }
    }
    /** @internal */
    function buildOperator$7(maxWidthVal) {
        function coffmanGrahamCall(dag) {
            const maxWidth = maxWidthVal || Math.floor(Math.sqrt(dag.size() + 0.5));
            // initialize node data
            const data = new SafeMap(dag.idescendants().map((node) => [node.id, new Data()]));
            for (const node of dag) {
                for (const child of node.ichildren()) {
                    data.getThrow(child.id).parents.push(node);
                }
            }
            // create queue
            function comp(left, right) {
                const leftBefore = data.getThrow(left.id).before;
                const rightBefore = data.getThrow(right.id).before;
                for (const [i, leftb] of leftBefore.entries()) {
                    const rightb = rightBefore[i];
                    if (rightb === undefined) {
                        return false;
                    }
                    else if (leftb < rightb) {
                        return true;
                    }
                    else if (rightb < leftb) {
                        return false;
                    }
                }
                return true;
            }
            const queue = new FastPriorityQueue_1(comp);
            // start with root nodes
            for (const root of dag.iroots()) {
                queue.add(root);
            }
            let i = 0; // node index
            let layer = 0; // layer assigning
            let width = 0; // current width
            let node;
            while ((node = queue.poll())) {
                if (width < maxWidth &&
                    data.getThrow(node.id).parents.every((p) => def(p.layer) < layer)) {
                    node.layer = layer;
                    width++;
                }
                else {
                    node.layer = ++layer;
                    width = 1;
                }
                for (const child of node.ichildren()) {
                    const { before, parents } = data.getThrow(child.id);
                    before.push(i);
                    if (before.length === parents.length) {
                        before.sort((a, b) => b - a);
                        queue.add(child);
                    }
                }
                i++;
            }
        }
        function width(maxWidth) {
            if (maxWidth === undefined) {
                return maxWidthVal;
            }
            else if (maxWidth < 0) {
                throw new Error(`width must be non-negative: ${maxWidth}`);
            }
            else {
                return buildOperator$7(maxWidth);
            }
        }
        coffmanGrahamCall.width = width;
        return coffmanGrahamCall;
    }
    /** Create a default [[CoffmanGrahamOperator]]. */
    function coffmanGraham(...args) {
        if (args.length) {
            throw new Error(`got arguments to coffmanGraham(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$7(0);
    }

    /**
     * Create a decrossing operator that minimizes the the number of edge
     * crossings. This method solves an np-complete integer program, and as such
     * can take a very long time for large DAGs.
     *
     * Create a new [[OptOperator]] with [[opt]].
     *
     * <img alt="optimal decross example" src="media://simplex.png" width="400">
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$8(debugVal) {
        const joiner = debugVal ? " => " : "\0\0";
        const slackJoiner = debugVal ? " " : "\0\0\0";
        function key(...nodes) {
            return nodes
                .map((n) => n.id)
                .sort()
                .join(joiner);
        }
        function perms(model, layer) {
            layer.sort((n1, n2) => +(n1.id > n2.id) || -1);
            // add variables for each pair of bottom later nodes indicating if they
            // should be flipped
            for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
                for (const n2 of layer.slice(i + 1)) {
                    const pair = key(n1, n2);
                    model.ints[pair] = 1;
                    model.constraints[pair] = Object.assign(Object.create(null), {
                        max: 1
                    });
                    model.variables[pair] = Object.assign(Object.create(null), {
                        opt: 0,
                        [pair]: 1
                    });
                }
            }
            // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
            // and b -> c is 1 then a -> c must also be one
            for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
                for (const [j, n2] of layer.slice(i + 1).entries()) {
                    for (const n3 of layer.slice(i + j + 2)) {
                        const pair1 = key(n1, n2);
                        const pair2 = key(n1, n3);
                        const pair3 = key(n2, n3);
                        const triangle = key(n1, n2, n3);
                        const triangleUp = triangle + "+";
                        model.constraints[triangleUp] = Object.assign(Object.create(null), {
                            max: 1
                        });
                        model.variables[pair1][triangleUp] = 1;
                        model.variables[pair2][triangleUp] = -1;
                        model.variables[pair3][triangleUp] = 1;
                        const triangleDown = triangle + "-";
                        model.constraints[triangleDown] = Object.assign(Object.create(null), {
                            min: 0
                        });
                        model.variables[pair1][triangleDown] = 1;
                        model.variables[pair2][triangleDown] = -1;
                        model.variables[pair3][triangleDown] = 1;
                    }
                }
            }
        }
        function cross(model, layer) {
            for (const [i, p1] of layer.slice(0, layer.length - 1).entries()) {
                for (const p2 of layer.slice(i + 1)) {
                    const pairp = key(p1, p2);
                    for (const c1 of p1.ichildren()) {
                        for (const c2 of p2.ichildren()) {
                            if (c1 === c2) {
                                continue;
                            }
                            const pairc = key(c1, c2);
                            const slack = debugVal
                                ? `slack (${pairp}) (${pairc})`
                                : `${pairp}\0\0\0${pairc}`;
                            const slackUp = `${slack}${slackJoiner}+`;
                            const slackDown = `${slack}${slackJoiner}-`;
                            model.variables[slack] = Object.assign(Object.create(null), {
                                opt: 1,
                                [slackUp]: 1,
                                [slackDown]: 1
                            });
                            const flip = +(c1.id > c2.id);
                            const sign = flip || -1;
                            model.constraints[slackUp] = Object.assign(Object.create(null), {
                                min: flip
                            });
                            model.variables[pairp][slackUp] = 1;
                            model.variables[pairc][slackUp] = sign;
                            model.constraints[slackDown] = Object.assign(Object.create(null), {
                                min: -flip
                            });
                            model.variables[pairp][slackDown] = -1;
                            model.variables[pairc][slackDown] = -sign;
                        }
                    }
                }
            }
        }
        function optCall(layers) {
            // initialize model
            const model = {
                optimize: "opt",
                opType: "min",
                constraints: Object.create(null),
                variables: Object.create(null),
                ints: Object.create(null)
            };
            // add variables and permutation invariants
            for (const layer of layers) {
                perms(model, layer);
            }
            // add crossing minimization
            for (const layer of layers.slice(0, layers.length - 1)) {
                cross(model, layer);
            }
            // solve objective
            const ordering = main$2.Solve(model);
            // sort layers
            for (const layer of layers) {
                layer.sort(
                /* istanbul ignore next */
                (n1, n2) => (+(n1.id > n2.id) || -1) * (ordering[key(n1, n2)] || -1));
            }
        }
        function debug(val) {
            if (val === undefined) {
                return debugVal;
            }
            else {
                return buildOperator$8(val);
            }
        }
        optCall.debug = debug;
        return optCall;
    }
    /** Create a default [[OptOperator]]. */
    function opt(...args) {
        if (args.length) {
            throw new Error(`got arguments to opt(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$8(false);
    }

    /**
     * The center coordinate assignment operator centers all of the nodes as
     * compatly as possible. It produces generally ppor layouts, but is very fast.
     *
     * <img alt="center example" src="media://center_coordinate.png" width="400">
     *
     * @packageDocumentation
     */
    /** Create a new center assignment operator. */
    function center(...args) {
        if (args.length) {
            throw new Error(`got arguments to center(${args}), but constructor takes no aruguments.`);
        }
        function centerCall(layers, separation) {
            const maxWidth = Math.max(...layers.map((layer) => {
                let prev = layer[0];
                let prevx = (prev.x = 0);
                for (const node of layer.slice(1)) {
                    prevx = node.x = prevx + separation(prev, node);
                    prev = node;
                }
                return prevx;
            }));
            for (const layer of layers) {
                const halfWidth = def(layer[layer.length - 1].x) / 2;
                for (const node of layer) {
                    node.x = (def(node.x) - halfWidth) / maxWidth + 0.5;
                }
            }
        }
        return centerCall;
    }

    /** @internal */
    function buildOperator$9(weightVal) {
        function minCurveCall(layers, separation) {
            const inds = indices(layers);
            const [Q, c, A, b] = init(layers, inds, separation);
            for (const layer of layers) {
                for (const par of layer) {
                    const pind = inds.getThrow(par.id);
                    for (const node of par.ichildren()) {
                        const nind = inds.getThrow(node.id);
                        minDist(Q, pind, nind, 1 - weightVal);
                        for (const child of node.ichildren()) {
                            const cind = inds.getThrow(child.id);
                            minBend(Q, pind, nind, cind, weightVal);
                        }
                    }
                }
            }
            const solution = solve$1(Q, c, A, b);
            layout(layers, inds, solution);
        }
        function weight(val) {
            if (val === undefined) {
                return weightVal;
            }
            else if (val < 0 || val >= 1) {
                throw new Error(`weight must be in [0, 1), but was ${weightVal}`);
            }
            else {
                return buildOperator$9(val);
            }
        }
        minCurveCall.weight = weight;
        return minCurveCall;
    }
    /** Create a default [[MinCurveOperator]]. */
    function minCurve(...args) {
        if (args.length) {
            throw new Error(`got arguments to minCurve(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$9(0.5);
    }

    /**
     * This accessor assigns coordinates as the mean of their parents and then
     * spaces them out to respect their separation. Nodes with higher degree that
     * aren't dummy nodes are given higher priority for shifting order, i.e. are
     * less likely to be moved from the mean of their parents. This solution
     * results in a layout that is more pleaseing than center, but much faster to
     * compute than vert or minCurve.
     *
     * <img alt="greedy example" src="media://greedy_coordinate.png" width="400">
     *
     * @packageDocumentation
     */
    /** Create a greedy coordinate assignment operator. */
    function greedy(...args) {
        if (args.length) {
            throw new Error(`got arguments to greedy(${args}), but constructor takes no aruguments.`);
        }
        function greedyCall(layers, separation) {
            // TODO other initial assignments
            const assignment = meanAssignment;
            // assign degrees
            const degrees = new SafeMap();
            for (const layer of layers) {
                for (const node of layer) {
                    // the -3 at the end ensures that dummy nodes have the lowest priority,
                    // as dummy nodes always have degree 2, degree -1 ensures they are
                    // below any other valid node
                    degrees.set(node.id, node.ichildren().length + (node instanceof DummyNode ? -3 : 0));
                }
            }
            for (const layer of layers) {
                for (const node of layer) {
                    for (const child of node.ichildren()) {
                        degrees.set(child.id, degrees.getThrow(child.id) + 1);
                    }
                }
            }
            // set first layer
            let [lastLayer, ...restLayers] = layers;
            let [last, ...rest] = lastLayer;
            let lastX = (last.x = 0);
            for (const node of rest) {
                lastX = node.x = lastX + separation(last, node);
                last = node;
            }
            // assign the rest of nodes
            for (const layer of restLayers) {
                // initial greedy assignment
                assignment(lastLayer, layer);
                // order nodes nodes by degree and start with highest degree
                const ordered = layer
                    .map((node, j) => [j, node])
                    .sort(([aj, anode], [bj, bnode]) => {
                    const adeg = degrees.getThrow(anode.id);
                    const bdeg = degrees.getThrow(bnode.id);
                    return adeg === bdeg ? aj - bj : bdeg - adeg;
                });
                // Iterate over nodes in degree order
                for (const [j, node] of ordered) {
                    // first push nodes over to left
                    // TODO we do left than right, but really we should do both and average
                    let last = node;
                    let lastX = def(last.x);
                    for (const next of layer.slice(j + 1)) {
                        lastX = next.x = Math.max(def(next.x), lastX + separation(last, next));
                        last = next;
                    }
                    // then push from the right
                    last = node;
                    lastX = def(last.x);
                    for (const next of layer.slice(0, j).reverse()) {
                        lastX = next.x = Math.min(def(next.x), lastX - separation(next, last));
                        last = next;
                    }
                }
                lastLayer = layer;
            }
            // scale
            const min = Math.min(...layers.map((layer) => Math.min(...layer.map((node) => def(node.x)))));
            const span = Math.max(...layers.map((layer) => Math.max(...layer.map((node) => def(node.x))))) - min;
            for (const layer of layers) {
                for (const node of layer) {
                    node.x = (def(node.x) - min) / span;
                }
            }
        }
        return greedyCall;
    }
    // TODO this is very similar to the twolayerMean method, there might be a
    // clever way to combine then, but it's not immediately obvious since twolayer
    // uses the index of toplayer, and this uses the x value
    /** @internal */
    function meanAssignment(topLayer, bottomLayer) {
        for (const node of bottomLayer) {
            node.x = 0.0;
        }
        const counts = new SafeMap();
        for (const node of topLayer) {
            for (const child of node.ichildren()) {
                /* istanbul ignore next */
                if (child.x === undefined) {
                    throw new Error(`unexpected undefined x for '${child.id}'`);
                }
                const newCount = counts.getDefault(child.id, 0) + 1;
                counts.set(child.id, newCount);
                child.x += (def(node.x) - child.x) / newCount;
            }
        }
    }

    /** Create a topological coordinate assignment operator. */
    function topological$1(...args) {
        if (args.length) {
            throw new Error(`got arguments to topological(${args}), but constructor takes no aruguments.`);
        }
        function topologicalCall(layers, separation) {
            for (const layer of layers) {
                const numNodes = layer.reduce((count, node) => count + +!(node instanceof DummyNode), 0);
                if (numNodes !== 1) {
                    throw new Error("topological() only works with a topological layering");
                }
            }
            const inds = new SafeMap();
            let i = 0;
            for (const layer of layers) {
                for (const node of layer) {
                    if (node instanceof DummyNode) {
                        inds.set(node.id, i++);
                    }
                }
            }
            // we assign all real nodes the last index, knowing that the optimization
            // always assigns them the same coord: 0.
            for (const layer of layers) {
                for (const node of layer) {
                    if (!(node instanceof DummyNode)) {
                        inds.set(node.id, i);
                    }
                }
            }
            const [Q, c, A, b] = init(layers, inds, separation);
            for (const layer of layers) {
                for (const par of layer) {
                    const pind = inds.getThrow(par.id);
                    for (const node of par.ichildren()) {
                        const nind = inds.getThrow(node.id);
                        if (node instanceof DummyNode) {
                            for (const child of node.ichildren()) {
                                const cind = inds.getThrow(child.id);
                                minBend(Q, pind, nind, cind, 1);
                            }
                        }
                    }
                }
            }
            const solution = solve$1(Q, c, A, b);
            layout(layers, inds, solution);
        }
        return topologicalCall;
    }

    /** @internal */
    class Mean {
        constructor() {
            this.mean = 0.0;
            this.count = 0;
        }
        add(val) {
            this.mean += (val - this.mean) / ++this.count;
        }
    }
    /** Create a mean two layer ordering operator. */
    function mean(...args) {
        if (args.length) {
            throw new Error(`got arguments to mean(${args}), but constructor takes no aruguments.`);
        }
        function meanCall(topLayer, bottomLayer) {
            const means = new SafeMap(bottomLayer.map((node) => [node.id, new Mean()]));
            for (const [i, node] of topLayer.entries()) {
                for (const child of node.ichildren()) {
                    means.getThrow(child.id).add(i);
                }
            }
            bottomLayer.sort((a, b) => means.getThrow(a.id).mean - means.getThrow(b.id).mean);
        }
        return meanCall;
    }

    /**
     * The opt order operator orders the bottom layer to minimize the number of
     * crossings. This is expensive, but not nearly as expensive as optimizing all
     * crossings initially.
     *
     * <img alt="two layer opt example" src="media://two_layer_opt.png" width="400">
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$a(debugVal) {
        const joiner = debugVal ? " => " : "\0\0";
        function key(...nodes) {
            return nodes
                .map((n) => n.id)
                .sort()
                .join(joiner);
        }
        function optCall(topLayer, bottomLayer) {
            // initialize model
            const model = {
                optimize: "opt",
                opType: "min",
                constraints: Object.create(null),
                variables: Object.create(null),
                ints: Object.create(null)
            };
            // sort bottom layer so ids can be used to see if one node was originally
            // before another one
            bottomLayer.sort((n1, n2) => +(n1.id > n2.id) || -1);
            // add variables for each pair of bottom later nodes indicating if they
            // should be flipped
            for (const [i, n1] of bottomLayer
                .slice(0, bottomLayer.length - 1)
                .entries()) {
                for (const n2 of bottomLayer.slice(i + 1)) {
                    const pair = key(n1, n2);
                    model.ints[pair] = 1;
                    model.constraints[pair] = Object.assign(Object.create(null), {
                        max: 1
                    });
                    model.variables[pair] = Object.assign(Object.create(null), {
                        opt: 0,
                        [pair]: 1
                    });
                }
            }
            // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
            // and b -> c is 1 then a -> c must also be one
            for (const [i, n1] of bottomLayer
                .slice(0, bottomLayer.length - 1)
                .entries()) {
                for (const [j, n2] of bottomLayer.slice(i + 1).entries()) {
                    for (const n3 of bottomLayer.slice(i + j + 2)) {
                        const pair1 = key(n1, n2);
                        const pair2 = key(n1, n3);
                        const pair3 = key(n2, n3);
                        const triangle = key(n1, n2, n3);
                        const triangleUp = triangle + "+";
                        model.constraints[triangleUp] = Object.assign(Object.create(null), {
                            max: 1
                        });
                        model.variables[pair1][triangleUp] = 1;
                        model.variables[pair2][triangleUp] = -1;
                        model.variables[pair3][triangleUp] = 1;
                        const triangleDown = triangle + "-";
                        model.constraints[triangleDown] = Object.assign(Object.create(null), {
                            min: 0
                        });
                        model.variables[pair1][triangleDown] = 1;
                        model.variables[pair2][triangleDown] = -1;
                        model.variables[pair3][triangleDown] = 1;
                    }
                }
            }
            // add crossing minimization
            for (const [i, p1] of topLayer.slice(0, topLayer.length - 1).entries()) {
                for (const p2 of topLayer.slice(i + 1)) {
                    for (const c1 of p1.ichildren()) {
                        for (const c2 of p2.ichildren()) {
                            if (c1 === c2) {
                                continue;
                            }
                            const pair = key(c1, c2);
                            model.variables[pair].opt += +(c1.id > c2.id) || -1;
                        }
                    }
                }
            }
            // solve objective
            const ordering = main$2.Solve(model);
            // sort layers
            bottomLayer.sort(
            /* istanbul ignore next */
            (n1, n2) => (+(n1.id > n2.id) || -1) * (+ordering[key(n1, n2)] || -1));
        }
        function debug(val) {
            if (val === undefined) {
                return debugVal;
            }
            else {
                return buildOperator$a(val);
            }
        }
        optCall.debug = debug;
        return optCall;
    }
    /** Create a default [[OptOperator]]. */
    function opt$1(...args) {
        if (args.length) {
            throw new Error(`got arguments to opt(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$a(false);
    }

    // TODO turn this into an operator for zherebko
    // TODO Add debug option for link indices
    function firstAvailable(inds, target) {
        const index = inds.findIndex((i) => i <= target);
        if (index >= 0) {
            return index;
        }
        else {
            return inds.length;
        }
    }
    function greedy$1(nodes) {
        const indices = new Map();
        const pos = [];
        const neg = [];
        for (const node of nodes) {
            for (const child of node.children().sort((a, b) => a.layer - b.layer)) {
                const linkId = `${node.id}\0${child.id}`;
                if (child.layer > node.layer + 1) {
                    const negIndex = firstAvailable(neg, node.layer);
                    const posIndex = firstAvailable(pos, node.layer);
                    if (negIndex < posIndex) {
                        // tie-break right
                        indices.set(linkId, -negIndex - 1);
                        neg[negIndex] = child.layer - 1;
                    }
                    else {
                        indices.set(linkId, posIndex + 1);
                        pos[posIndex] = child.layer - 1;
                    }
                }
            }
        }
        return indices;
    }

    /** @internal */
    function buildOperator$b(width, height) {
        /** topological layering */
        function layer(dag) {
            const ordered = [...dag.idescendants("before")];
            for (const [layer, node] of ordered.entries()) {
                node.layer = layer;
            }
            return ordered;
        }
        function zherebkoCall(dag) {
            //
            if (!dag.connected()) {
                throw new Error("zherebko() doesn't work well for unconnected dags");
                // TODO in principle it can, it just needs to be written a little better
            }
            // topological sort
            const ordered = layer(dag);
            const maxLayer = ordered.length - 1;
            if (maxLayer === 0) {
                // center if only one node
                const [node] = ordered;
                node.x = width / 2;
                node.y = height / 2;
            }
            else {
                // get link indices
                const indices = greedy$1(ordered);
                // assign points to links
                assignPositions(dag, indices, maxLayer);
            }
            return dag;
        }
        function assignPositions(dag, indices, maxLayer) {
            // map to coordinates
            let minIndex = 0;
            let maxIndex = 0;
            for (const { source, target } of dag.ilinks()) {
                if (target.layer > source.layer + 1) {
                    const index = indices.get(`${source.id}\0${target.id}`);
                    /* istanbul ignore next */
                    if (index === undefined) {
                        throw new Error(`indexer didn't index ${source.id} -> ${target.id}`);
                    }
                    minIndex = Math.min(minIndex, index);
                    maxIndex = Math.max(maxIndex, index);
                }
            }
            if (minIndex === maxIndex) {
                // center if graph is a line
                minIndex = -1;
                maxIndex = 1;
            }
            for (const node of dag) {
                node.x = (-minIndex / (maxIndex - minIndex)) * width;
                node.y = (node.layer / maxLayer) * height;
            }
            assignPoints(dag, indices, maxLayer, minIndex, maxIndex);
        }
        function assignPoints(dag, indices, maxLayer, minIndex, maxIndex) {
            for (const { source, target, points } of dag.ilinks()) {
                points.length = 0;
                points.push({ x: source.x, y: source.y });
                if (target.layer - source.layer > 1) {
                    const index = indices.get(`${source.id}\0${target.id}`);
                    /* istanbul ignore next */
                    if (index === undefined) {
                        throw new Error(`indexer didn't index ${source.id} -> ${target.id}`);
                    }
                    const x = ((index - minIndex) / (maxIndex - minIndex)) * width;
                    const y1 = ((source.layer + 1) / maxLayer) * height;
                    const y2 = ((target.layer - 1) / maxLayer) * height;
                    if (target.layer - source.layer > 2) {
                        points.push({ x: x, y: y1 }, { x: x, y: y2 });
                    }
                    else {
                        points.push({ x: x, y: y1 });
                    }
                }
                points.push({ x: target.x, y: target.y });
            }
        }
        function size(sz) {
            if (sz === undefined) {
                return [width, height];
            }
            else {
                const [newWidth, newHeight] = sz;
                return buildOperator$b(newWidth, newHeight);
            }
        }
        zherebkoCall.size = size;
        return zherebkoCall;
    }
    /** Create a new [[ZherebkoOperator]] with default settings. */
    function zherebko(...args) {
        if (args.length) {
            throw new Error(`got arguments to zherebko(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$b(1, 1);
    }

    /** @internal */
    function buildOperator$c(centerVal) {
        function complexCall(layers) {
            // find all root nodes and subtree widths
            const rootMap = new SafeMap();
            const subtreeWidths = new SafeMap();
            for (const layer of layers.slice().reverse()) {
                for (const node of layer) {
                    rootMap.set(node.id, node);
                    let subtreeWidth = 0;
                    for (const child of node.ichildren()) {
                        rootMap.delete(child.id);
                        subtreeWidth += subtreeWidths.getThrow(child.id);
                    }
                    subtreeWidths.set(node.id, Math.max(subtreeWidth, 1));
                }
            }
            // iterate over each root and assign column indices to each node in its
            // subtree.  if a node already has a columnIndex, do not change it, this
            // case can occur if the node has more than one predecessor
            // TODO I think this would be more elegant with simple iteration, but it's
            // not clear how that would look
            let startColumnIndex = 0;
            for (const node of rootMap.values()) {
                const subtreeWidth = subtreeWidths.getThrow(node.id);
                node.columnIndex =
                    startColumnIndex + (centerVal ? Math.floor((subtreeWidth - 1) / 2) : 0);
                assignColumnIndexToChildren(node, startColumnIndex);
                startColumnIndex += subtreeWidth;
            }
            function assignColumnIndexToChildren(node, startColumnIndex) {
                let childColumnIndex = startColumnIndex;
                for (const child of node.ichildren()) {
                    if (child.columnIndex !== undefined) {
                        // stop recursion, this child was already visited
                        return;
                    }
                    const width = subtreeWidths.getThrow(child.id);
                    child.columnIndex =
                        childColumnIndex + (centerVal ? Math.floor((width - 1) / 2) : 0);
                    assignColumnIndexToChildren(child, childColumnIndex);
                    childColumnIndex += width;
                }
            }
        }
        function center(val) {
            if (val === undefined) {
                return centerVal;
            }
            else {
                return buildOperator$c(val);
            }
        }
        complexCall.center = center;
        return complexCall;
    }
    /** Create a complex operator with default settings. */
    function complex(...args) {
        if (args.length) {
            throw new Error(`got arguments to center(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$c(false);
    }

    /**
     * Compute x0 and x1 coordinates for nodes that maximizes the spread of nodes
     * in [0, 1].  It uses columnIndex that has to be present in each node. Due to
     * the varying height of the nodes, nodes from different layers might be
     * present at the same y coordinate therefore, nodes should not be centered in
     * their layer but centering should be considered over all layers.
     *
     * @packageDocumentation
     */
    /** Create a spread coord operator. */
    function spread(...args) {
        if (args.length) {
            throw new Error(`got arguments to spread(${args}), but constructor takes no aruguments.`);
        }
        function spreadCall(layers, columnWidthFunction, columnSeparationFunction) {
            // calculate the number of columns
            const maxColumns = Math.max(...layers.map((layer) => Math.max(...layer.map((node) => node.columnIndex)))) + 1;
            // call columnWidthFunction for each column index to get an array with the width of each column index:
            const columnWidths = [];
            for (let i = 0; i < maxColumns; ++i) {
                columnWidths.push(columnWidthFunction(i));
            }
            // similarly for the separation of the columns, where columnSeparation[0] is the separation between column 0 and 1:
            const columnStarts = [0];
            for (let i = 0; i < maxColumns - 1; ++i) {
                const start = columnStarts[i] + columnWidths[i] + columnSeparationFunction(i);
                columnStarts.push(start);
            }
            const maxWidth = columnStarts[maxColumns - 1] + columnWidths[maxColumns - 1];
            for (const layer of layers) {
                for (const node of layer) {
                    const start = columnStarts[node.columnIndex];
                    const width = columnWidths[node.columnIndex];
                    node.x0 = start / maxWidth;
                    node.x1 = (start + width) / maxWidth;
                }
            }
        }
        return spreadCall;
    }

    class DummyNode$1 extends LayoutDagNode {
        constructor(id) {
            super(id, undefined);
        }
    }

    /**
     * This layout algorithm treats nodes not as points (i.e. producing x & y
     * coordinates) but as rectangles. An accessor is supplied to extract a
     * *heightRatio* from each node, specifying its height in comparison to other
     * nodes. The implementation was contributed by the author [L.
     * Arquint](https://linardarquint.com) and provides different algorithms to
     * distribute the nodes along the x-axis.
     *
     * In the following example, the default options were used and *node*.heightRatio was set to Number(*node*.id)+1:
     * <img alt="arquint example" src="media://arquint.png" width="400">
     *
     * @packageDocumentation
     */
    /** @internal */
    function buildOperator$d(debugVal, width, height, layeringOp, decrossOp, columnOp, coordOp, layerSep, colWidth, colSep, heightRatioOp) {
        // TODO it'd be good to see this wrapped up in height somehow
        function getLongestPaths(dag) {
            const longestPaths = new SafeMap();
            for (const node of dag.idescendants("after")) {
                const childPaths = Math.max(0, ...node.ichildren().map((child) => longestPaths.getThrow(child.id)));
                longestPaths.set(node.id, heightRatioOp(node) + childPaths);
            }
            return longestPaths;
        }
        // TODO it'd be good to see this wrapped up in depth somehow
        function getLongestPathsRoot(dag) {
            const longestPaths = new SafeMap();
            for (const node of dag.idescendants("before")) {
                const pathLength = longestPaths.getDefault(node.id, 0) + heightRatioOp(node);
                longestPaths.set(node.id, pathLength);
                for (const child of node.ichildren()) {
                    const childLength = Math.max(pathLength, longestPaths.getDefault(child.id, 0));
                    longestPaths.set(child.id, childLength);
                }
            }
            return longestPaths;
        }
        // Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
        // layer is adjacent and each path ends in the last layer, and returns an array of each layer of nodes.
        function createLayers(dag) {
            const layers = [];
            const maxLayer = Math.max(...dag.idescendants().map((node) => node.layer));
            for (const node of dag) {
                const nlayer = node.layer;
                const layer = layers[nlayer] || (layers[nlayer] = []);
                layer.push(node);
                // add dummy nodes in place of children
                node.dataChildren = node.dataChildren.map((link) => {
                    const clayer = link.child.layer;
                    if (clayer <= nlayer) {
                        throw new Error(`layering left child node "${link.child.id}" (${clayer}) ` +
                            `with a greater or equal layer to parent node "${node.id}" (${nlayer})`);
                    }
                    // NOTE this cast breaks the type system, but sugiyama basically
                    // needs to do that, so...
                    let last = link.child;
                    for (let l = clayer - 1; l > nlayer; l--) {
                        let dummyId;
                        if (debugVal) {
                            dummyId = `${node.id}->${link.child.id} (${l})`;
                        }
                        else {
                            dummyId = `${node.id}\0${link.child.id}\0${l}`;
                        }
                        const dummy = new DummyNode$1(dummyId);
                        dummy.dataChildren.push(new LayoutChildLink(last, undefined));
                        (layers[l] || (layers[l] = [])).push(dummy);
                        last = dummy;
                    }
                    // NOTE this cast breaks the type system, but sugiyama basically
                    // needs to do that, so...
                    return new LayoutChildLink(last, link.data);
                });
                if (node.dataChildren.length === 0 && nlayer < maxLayer) {
                    // insert a dummy node per layer
                    let last = new DummyNode$1(debugVal ? `${node.id} (${maxLayer})` : `${node.id}\0${maxLayer}`);
                    (layers[maxLayer] || (layers[maxLayer] = [])).push(last);
                    for (let l = maxLayer - 1; l > node.layer; l--) {
                        const dummy = new DummyNode$1(debugVal ? `${node.id} (${maxLayer})` : `${node.id}\0${maxLayer}`);
                        dummy.dataChildren.push(new LayoutChildLink(last, undefined));
                        (layers[l] || (layers[l] = [])).push(dummy);
                        last = dummy;
                    }
                    node.dataChildren = [new LayoutChildLink(last, undefined)];
                }
            }
            return layers;
        }
        function scale(dag, totalPathLength) {
            for (const node of dag) {
                node.x0 *= width;
                node.x1 *= width;
                node.y0 *= height / totalPathLength;
                node.y1 *= height / totalPathLength;
            }
        }
        function removeDummies(dag) {
            for (const node of dag) {
                /* istanbul ignore next */
                if (!(node instanceof DummyNode$1)) {
                    const newDataChildren = [];
                    for (const link of node.dataChildren) {
                        let child = link.child;
                        const points = [{ x: (node.x0 + node.x1) / 2, y: node.y1 }];
                        while (child !== undefined && child instanceof DummyNode$1) {
                            // dummies have height 0, so it should not matter whether
                            // getCenterTop or getCenterBottom is used
                            points.push({ x: (child.x0 + child.x1) / 2, y: child.y0 });
                            [child] = child.ichildren();
                        }
                        if (child !== undefined) {
                            points.push({ x: (child.x0 + child.x1) / 2, y: child.y0 });
                            const newLink = new LayoutChildLink(child, link.data, points);
                            newDataChildren.push(newLink);
                        }
                    }
                    node.dataChildren = newDataChildren;
                }
            }
        }
        function arquintCall(dag) {
            const longestPaths = getLongestPaths(dag);
            // compute layers
            layeringOp(dag);
            // verify layering
            for (const node of dag) {
                const layer = node.layer;
                if (layer === undefined) {
                    throw new Error(`layering did not assign layer to node '${node.id}'`);
                }
                else if (layer < 0) {
                    throw new Error(`layering assigned a negative layer (${layer}) to node '${node.id}'`);
                }
            }
            const layers = createLayers(dag);
            // assign y
            let totalPathLength;
            if (layers.length === 1) {
                const [layer] = layers;
                for (const node of layer) {
                    node.y0 = 0;
                    node.y1 = 1;
                }
                totalPathLength = 1;
            }
            else {
                const longestToRoot = getLongestPathsRoot(dag);
                let last = layers[0];
                const maxPathLength = Math.max(...last.map((node) => longestPaths.getThrow(node.id)));
                for (const node of last) {
                    const y1 = (node.y1 = longestToRoot.getThrow(node.id));
                    node.y0 = y1 - heightRatioOp(node);
                }
                totalPathLength = 0;
                for (const [i, layer] of layers.slice(1).entries()) {
                    totalPathLength += layerSep(last, layer, i);
                    for (const node of layer) {
                        const y1 = (node.y1 =
                            totalPathLength + longestToRoot.getThrow(node.id));
                        node.y0 = y1 - heightRatioOp(node);
                    }
                    last = layer;
                }
                totalPathLength += maxPathLength;
            }
            // minimize edge crossings
            decrossOp(layers);
            // assign an index to each node indicating the "column" in which it should be placed
            columnOp(layers);
            // verify indexing
            for (const layer of layers) {
                for (const node of layer) {
                    if (node.columnIndex === undefined) {
                        throw new Error(`column did not assign an index to node '${node.id}'`);
                    }
                    else if (node.columnIndex < 0) {
                        throw new Error(`column assigned a negative index (${node.columnIndex}) to node '${node.id}'`);
                    }
                }
            }
            // assign coordinates
            coordOp(layers, colWidth, colSep);
            // verify xes
            for (const layer of layers) {
                for (const node of layer) {
                    if (node.x0 === undefined || node.x1 === undefined) {
                        throw new Error(`coord did not assign both x coordinates to node '${node.id}'`);
                    }
                    else if (node.x0 > node.x1) {
                        throw new Error(`coord did not assign valid x coordinates to node '${node.id}'`);
                    }
                }
            }
            const finished = dag;
            // scale x and y
            scale(finished, totalPathLength);
            // remove dummy nodes and update edge data
            removeDummies(finished);
            return finished;
        }
        function size(val) {
            if (val === undefined) {
                return [width, height];
            }
            else {
                const [newWidth, newHeight] = val;
                return buildOperator$d(debugVal, newWidth, newHeight, layeringOp, decrossOp, columnOp, coordOp, layerSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.size = size;
        function layering(newLayering) {
            if (newLayering === undefined) {
                return layeringOp;
            }
            else {
                return buildOperator$d(debugVal, width, height, newLayering, decrossOp, columnOp, coordOp, layerSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.layering = layering;
        function decross(newDecross) {
            if (newDecross === undefined) {
                return decrossOp;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, newDecross, columnOp, coordOp, layerSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.decross = decross;
        function column(newColumn) {
            if (newColumn === undefined) {
                return columnOp;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, decrossOp, newColumn, coordOp, layerSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.column = column;
        function coord(newCoord) {
            if (newCoord === undefined) {
                return coordOp;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, decrossOp, columnOp, newCoord, layerSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.coord = coord;
        function layerSeparation(newSep) {
            if (newSep === undefined) {
                return layerSep;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, decrossOp, columnOp, coordOp, newSep, colWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.layerSeparation = layerSeparation;
        function columnWidth(newWidth) {
            if (newWidth === undefined) {
                return colWidth;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, decrossOp, columnOp, coordOp, layerSep, newWidth, colSep, heightRatioOp);
            }
        }
        arquintCall.columnWidth = columnWidth;
        function columnSeparation(newSep) {
            if (newSep === undefined) {
                return colSep;
            }
            else {
                return buildOperator$d(debugVal, width, height, layeringOp, decrossOp, columnOp, coordOp, layerSep, colWidth, newSep, heightRatioOp);
            }
        }
        arquintCall.columnSeparation = columnSeparation;
        return arquintCall;
    }
    /** @internal */
    function defaultLayerSeparation() {
        return 1;
    }
    /** @internal */
    function defaultColumnWidth() {
        return 10;
    }
    /** @internal */
    function defaultColumnSeparation() {
        return 1;
    }
    /** @internal */
    function hasHeightRatio(node) {
        const heightRatio = node.heightRatio;
        return heightRatio === undefined || typeof heightRatio === "number";
    }
    /** @internal */
    function defaultHeightRatio(node) {
        if (node instanceof DummyNode$1) {
            return 0;
        }
        else if (hasHeightRatio(node)) {
            return node.heightRatio || 0;
        }
        else {
            throw new Error(`default height ratio expects node with heightRatio property but got nothing`);
        }
    }
    /**
     * Construct a new Arquint layout operator with the default settings.
     */
    function arquint() {
        return buildOperator$d(false, 1, 1, longestPath().topDown(false), twoLayer(), complex(), spread(), defaultLayerSeparation, defaultColumnWidth, defaultColumnSeparation, defaultHeightRatio);
    }

    /** @interal */
    function buildOperator$e(centerVal) {
        function adjacentCall(layers) {
            // assigns column indices to the layer with most nodes first.
            // afterwards starting from the layer with most nodes, column indices are assigned
            // to nodes in adjacent layers. Column indices are assigned with respect to the
            // node's parents or children while maintaining the same ordering in the layer.
            // overlapping nodes can occur because nodes can be placed in the same column
            // although they do not have a children/parents relation with each other
            // create parents
            const parentMap = new SafeMap();
            for (const layer of layers) {
                for (const node of layer) {
                    for (const child of node.ichildren()) {
                        parentMap.setIfAbsent(child.id, []).push(node);
                    }
                }
            }
            // find layer index with most entries:
            const maxNodesCount = Math.max(...layers.map((layer) => layer.length));
            const maxNodesLayerIndex = layers.findIndex((layer) => layer.length === maxNodesCount);
            // layer with most nodes simply assign columnIndex to the node's index:
            for (const [index, node] of layers[maxNodesLayerIndex].entries()) {
                node.columnIndex = index;
            }
            // layer with most nodes stays unchanged
            // first, visit each layer above the layer with most nodes
            for (const layer of layers.slice(0, maxNodesLayerIndex).reverse()) {
                fillLayerBackward(layer);
            }
            // then, visit each layer below the layer with most nodes
            for (const layer of layers.slice(maxNodesLayerIndex + 1)) {
                fillLayerForward(layer);
            }
            function fillLayerBackward(layer) {
                if (layer.length === maxNodesCount) {
                    // leave layer unchanged
                    for (const [index, node] of layer.entries()) {
                        node.columnIndex = index;
                    }
                }
                else {
                    // map each node to its desired location:
                    const desiredColumnIndices = layer.map((node, index) => {
                        if (node.dataChildren.length === 0) {
                            return index;
                        }
                        const childrenColumnIndices = [
                            ...node.ichildren().map((child) => def(child.columnIndex))
                        ];
                        if (centerVal) {
                            // return column index of middle child
                            return childrenColumnIndices.sort((a, b) => a - b)[Math.floor((childrenColumnIndices.length - 1) / 2)];
                        }
                        else {
                            return Math.min(...childrenColumnIndices);
                        }
                    });
                    // based on the desired column index, the actual column index needs to
                    // be assigned however, the column indices have to be strictly
                    // monotonically increasing and have to be greater or equal 0 and
                    // smaller than maxNodesCount!
                    const indices = optimizeColumnIndices(desiredColumnIndices);
                    for (const [index, node] of layer.entries()) {
                        node.columnIndex = indices[index];
                    }
                }
            }
            function fillLayerForward(layer) {
                if (layer.length === maxNodesCount) {
                    // leave layer unchanged
                    for (const [index, node] of layer.entries()) {
                        node.columnIndex = index;
                    }
                }
                else {
                    // map each node to its desired location:
                    const desiredColumnIndices = layer.map((node, index) => {
                        const parents = parentMap.getDefault(node.id, []);
                        if (parents.length === 0) {
                            return index;
                        }
                        const parentColumnIndices = parents.map((par) => def(par.columnIndex));
                        if (centerVal) {
                            // return column index of middle parent
                            return parentColumnIndices[Math.floor((parentColumnIndices.length - 1) / 2)];
                        }
                        else {
                            return Math.min(...parentColumnIndices);
                        }
                    });
                    // based on the desired column index, the actual column index needs to
                    // be assigned however, the column indices have to be strictly
                    // monotonically increasing and have to be greater or equal 0 and
                    // smaller than maxNodesCount!
                    const indices = optimizeColumnIndices(desiredColumnIndices);
                    for (const [index, node] of layer.entries()) {
                        node.columnIndex = indices[index];
                    }
                }
            }
            function optimizeColumnIndices(desiredColumnIndices) {
                for (const columnIndex of desiredColumnIndices) {
                    if (!isFinite(columnIndex)) {
                        throw new Error(`columnComplex: non-finite column index encountered`);
                    }
                }
                // step 1: reorder indices such that they are strictly monotonically increasing
                let largestIndex = -1;
                desiredColumnIndices = desiredColumnIndices.map((columnIndex) => {
                    if (columnIndex <= largestIndex) {
                        columnIndex = largestIndex + 1;
                    }
                    largestIndex = columnIndex;
                    return columnIndex;
                });
                // step 2: shift indices such that they are larger or equal 0 and smaller than maxNodesCount
                const max = Math.max(...desiredColumnIndices);
                const downShift = max - (maxNodesCount - 1);
                if (downShift > 0) {
                    // nodes need to be shifted by that amount
                    desiredColumnIndices = desiredColumnIndices.map((columnIndex, index) => Math.max(columnIndex - downShift, index));
                }
                return desiredColumnIndices;
            }
        }
        function center(val) {
            if (val === undefined) {
                return centerVal;
            }
            else {
                return buildOperator$e(val);
            }
        }
        adjacentCall.center = center;
        return adjacentCall;
    }
    /** Create a default adjacent operator. */
    function adjacent(...args) {
        if (args.length) {
            throw new Error(`got arguments to adjacent(${args}), but constructor takes no aruguments.`);
        }
        return buildOperator$e(false);
    }

    /** Create a center column operator. */
    function center$1(...args) {
        if (args.length) {
            throw new Error(`got arguments to center(${args}), but constructor takes no aruguments.`);
        }
        function centerCall(layers) {
            const maxNodesPerLayer = Math.max(...layers.map((layer) => layer.length));
            for (const layer of layers) {
                const startColumnIndex = Math.floor((maxNodesPerLayer - layer.length) / 2);
                for (const [index, node] of layer.entries()) {
                    node.columnIndex = startColumnIndex + index;
                }
            }
        }
        return centerCall;
    }

    /** Construct a left operator. */
    function left(...args) {
        if (args.length) {
            throw new Error(`got arguments to left(${args}), but constructor takes no aruguments.`);
        }
        function leftCall(layers) {
            for (const layer of layers) {
                for (const [index, node] of layer.entries()) {
                    node.columnIndex = index;
                }
            }
        }
        return leftCall;
    }

    exports.ArqDummyNode = DummyNode$1;
    exports.SugiDummyNode = DummyNode;
    exports.arqcoordSpread = spread;
    exports.arquint = arquint;
    exports.columnAdjacent = adjacent;
    exports.columnCenter = center$1;
    exports.columnComplex = complex;
    exports.columnLeft = left;
    exports.coordCenter = center;
    exports.coordGreedy = greedy;
    exports.coordMinCurve = minCurve;
    exports.coordTopological = topological$1;
    exports.coordVert = vert;
    exports.dagConnect = connect;
    exports.dagHierarchy = hierarchy;
    exports.dagStratify = stratify;
    exports.decrossOpt = opt;
    exports.decrossTwoLayer = twoLayer;
    exports.layeringCoffmanGraham = coffmanGraham;
    exports.layeringLongestPath = longestPath;
    exports.layeringSimplex = simplex;
    exports.layeringTopological = topological;
    exports.sugiyama = sugiyama;
    exports.twolayerMean = mean;
    exports.twolayerMedian = median;
    exports.twolayerOpt = opt$1;
    exports.zherebko = zherebko;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
