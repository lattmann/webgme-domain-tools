/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.15 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.15',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("node_modules/requirejs/require", function(){});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */


/*
 * -------- EVENT DIASPATCHER -------
 */

define('eventDispatcher',[], function () {
    var EventDispatcher = function () {
        this._eventList = {};
    };

    EventDispatcher.prototype = {
        _eventList: null,
        _getEvent: function (eventName, create) {
            // Check if Array of Event Handlers has been created
            if (!this._eventList[eventName]) {

                // Check if the calling method wants to create the Array
                // if not created. This reduces unneeded memory usage.
                if (!create) {
                    return null;
                }

                // Create the Array of Event Handlers
                this._eventList[eventName] = [];
                // new Array
            }

            // return the Array of Event Handlers already added
            return this._eventList[eventName];
        },
        addEventListener: function (eventName, handler) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName, true);

            // Add the new Event Handler to the Array
            evt.push(handler);
        },
        removeEventListener: function (eventName, handler) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName);

            if (!evt) {
                return;
            }

            // Helper Method - an Array.indexOf equivalent
            var getArrayIndex = function (array, item) {
                for (var i = 0; i < array.length; i++) {
                    if (array[i] === item) {
                        return i;
                    }
                }
                return -1;
            };

            // Get the Array index of the Event Handler
            var index = getArrayIndex(evt, handler);

            if (index > -1) {
                // Remove Event Handler from Array
                evt.splice(index, 1);
            }
        },
        removeAllEventListeners: function (eventName) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName);

            if (!evt) {
                return;
            }

            evt.splice(0, evt.length);
        },
        dispatchEvent: function (eventName, eventArgs) {
            // Get a function that will call all the Event Handlers internally
            var handler = this._getEventHandler(eventName);
            if (handler) {
                // call the handler function
                // Pass in "sender" and "eventArgs" parameters
                handler(this, eventArgs);
            }
        },
        _getEventHandler: function (eventName) {
            // Get Event Handler Array for this Event
            var evt = this._getEvent(eventName, false);
            if (!evt || evt.length === 0) {
                return null;
            }

            // Create the Handler method that will use currying to
            // call all the Events Handlers internally
            var h = function (sender, args) {
                for (var i = 0; i < evt.length; i++) {
                    evt[i](sender, args);
                }
            };

            // Return this new Handler method
            return h;
        }
    };

    return EventDispatcher;
});
define('blob/BlobConfig',[], function(){

    var BlobConfig = {
        hashMethod: 'sha1', // TODO: in the future we may switch to sha512
        hashRegex: new RegExp('^[0-9a-f]{40}$')
    };
    return BlobConfig;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/BlobMetadata',['blob/BlobConfig'], function(BlobConfig){

    /**
     * Initializes a new instance of BlobMetadata
     * @param {Object<string, string|number|Object>} metadata A serialized metadata object. Name and content must be defined.
     * @constructor
     */
    var BlobMetadata = function(metadata) {
        var key;
        if (metadata) {
            this.name = metadata.name;
            this.size = metadata.size || 0;
            this.mime = metadata.mime || '';
            this.isPublic = metadata.isPublic || false;
            this.tags = metadata.tags || [];
            this.content = metadata.content;
            this.contentType = metadata.contentType || BlobMetadata.CONTENT_TYPES.OBJECT;
            if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                for (key in this.content) {
                    if (this.content.hasOwnProperty(key)) {
                        if (BlobConfig.hashRegex.test(this.content[key].content) === false) {
                            throw Error("BlobMetadata is malformed: hash is invalid");
                        }
                    }
                }
            }
        } else {
            throw new Error('metadata parameter is not defined');
        }
    };

    /**
     * Type of the metadata
     * @type {{OBJECT: string, COMPLEX: string, SOFT_LINK: string}}
     */
    BlobMetadata.CONTENT_TYPES = {
        OBJECT: 'object',
        COMPLEX: 'complex',
        SOFT_LINK: 'softLink'
    };

    /**
     * Serializes the metadata to a JSON object.
     * @returns {{name: string, size: number, mime: string, tags: Array.<string>, content: (string|Object}, contentType: string}}
     */
    BlobMetadata.prototype.serialize = function () {
        var metadata = {
            name: this.name,
            size: this.size,
            mime: this.mime,
            isPublic: this.isPublic,
            tags: this.tags,
            content: this.content,
            contentType: this.contentType
        };

        metadata.tags.sort();

        if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // override on  purpose to normalize content
            metadata.content = {};
            var fnames = Object.keys(this.content);
            fnames.sort();

            for (var j = 0; j < fnames.length; j += 1) {
                metadata.content[fnames[j]] = this.content[fnames[j]];
            }
        }

        return metadata;
    };

    return BlobMetadata
});
/**
 * The MIT License (MIT)
 * Copyright (c) 2013, Miklos Maroti
 */

(function () {
	

	// ------- assert -------

	var TASYNC_TRACE_ENABLE = true;

	function setTrace (value) {
		TASYNC_TRACE_ENABLE = value;
	}

	function assert (cond) {
		if (!cond) {
			throw new Error("tasync internal error");
		}
	}

	// ------- Future -------

	var STATE_LISTEN = 0;
	var STATE_REJECTED = 1;
	var STATE_RESOLVED = 2;

	var Future = function () {
		this.state = STATE_LISTEN;
		this.value = [];
	};

	Future.prototype.register = function (target) {
		assert(this.state === STATE_LISTEN);
		assert(typeof target === "object" && target !== null);

		this.value.push(target);
	};

	Future.prototype.resolve = function (value) {
		assert(this.state === STATE_LISTEN && !(value instanceof Future));

		var listeners = this.value;

		this.state = STATE_RESOLVED;
		this.value = value;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onResolved(value);
		}
	};

	Future.prototype.reject = function (error) {
		assert(this.state === STATE_LISTEN && error instanceof Error);

		var listeners = this.value;

		this.state = STATE_REJECTED;
		this.value = error;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onRejected(error);
		}
	};

	// ------- Delay -------

	function delay (timeout, value) {
		if (timeout < 0) {
			return value;
		}

		var future = new Future();
		setTimeout(function () {
			future.resolve(value);
		}, timeout);
		return future;
	}

	// ------- Lift -------

	var FutureLift = function (array, index) {
		Future.call(this);

		this.array = array;
		this.index = index;
	};

	FutureLift.prototype = Object.create(Future.prototype);

	FutureLift.prototype.onResolved = function (value) {
		assert(this.state === STATE_LISTEN);

		var array = this.array;
		array[this.index] = value;

		while (++this.index < array.length) {
			value = array[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		this.array = null;
		this.resolve(array);
	};

	FutureLift.prototype.onRejected = function (error) {
		this.array = null;
		this.reject(error);
	};

	var lift = function (array) {
		if (!(array instanceof Array)) {
			throw new Error("array argument is expected");
		}

		var index;
		for (index = 0; index < array.length; ++index) {
			var value = array[index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					var future = new FutureLift(array, index);
					value.register(future);
					return future;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		return array;
	};

	// ------- Apply -------

	var ROOT = {
		subframes: 0
	};

	var FRAME = ROOT;

	var FutureApply = function tasync_trace_end (func, that, args, index) {
		Future.call(this);

		this.caller = FRAME;
		this.position = ++FRAME.subframes;
		this.subframes = 0;

		if (TASYNC_TRACE_ENABLE) {
			this.trace = new Error();
		}

		this.func = func;
		this.that = that;
		this.args = args;
		this.index = index;
	};

	FutureApply.prototype = Object.create(Future.prototype);

	FutureApply.prototype.getPath = function () {
		var future = this.caller, path = [ this.position ];

		while (future !== ROOT) {
			path.push(future.position);
			future = future.caller;
		}

		return path;
	};

	function getSlice (trace) {
		assert(typeof trace === "string");

		var end = trace.indexOf("tasync_trace_start");
		if (end >= 0) {
			end = trace.lastIndexOf("\n", end) + 1;
		} else {
			if (trace.charAt(trace.length - 1) !== "\n") {
				// trace += "\n";
			}
			end = undefined;
		}

		var start = trace.indexOf("tasync_trace_end");
		if (start >= 0) {
			start = trace.indexOf("\n", start) + 1;
			if (start >= 0) {
				start = trace.indexOf("\n", start) + 1;
			}
		} else {
			start = 0;
		}

		return trace.substring(start, end);
	}

	function createError (error, future) {
		if (!(error instanceof Error)) {
			error = new Error(error);
		}

		if (TASYNC_TRACE_ENABLE) {
			error.trace = getSlice(error.stack);
			do {
				error.trace += "*** callback ***\n";
				error.trace += getSlice(future.trace.stack);
				future = future.caller;
			} while (future !== ROOT);
		}

		return error;
	}

	FutureApply.prototype.onRejected = function (error) {
		this.args = null;
		this.reject(error);
	};

	FutureApply.prototype.onResolved = function tasync_trace_start (value) {
		assert(this.state === STATE_LISTEN);

		var args = this.args;
		args[this.index] = value;

		while (--this.index >= 0) {
			value = args[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					args[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		assert(FRAME === ROOT);
		FRAME = this;

		this.args = null;
		try {
			value = this.func.apply(this.that, args);
		} catch (error) {
			FRAME = ROOT;

			this.reject(createError(error, this));
			return;
		}

		FRAME = ROOT;

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);

			this.onResolved = this.resolve;
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	var apply = function (func, args, that) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		} else if (!(args instanceof Array)) {
			throw new Error("array argument is expected");
		}

		var index = args.length;
		while (--index >= 0) {
			var value = args[index];
			if (value instanceof Future) {
				if (value.state === STATE_LISTEN) {
					var future = new FutureApply(func, that, args, index);
					value.register(future);
					return future;
				} else if (value.state === STATE_RESOLVED) {
					args[index] = value.value;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		return func.apply(that, args);
	};

	// ------- Call -------

	var FutureCall = function tasync_trace_end (args, index) {
		Future.call(this);

		this.caller = FRAME;
		this.position = ++FRAME.subframes;
		this.subframes = 0;

		if (TASYNC_TRACE_ENABLE) {
			this.trace = new Error();
		}

		this.args = args;
		this.index = index;
	};

	FutureCall.prototype = Object.create(Future.prototype);

	FutureCall.prototype.getPath = FutureApply.prototype.getPath;
	FutureCall.prototype.onRejected = FutureApply.prototype.onRejected;

	var FUNCTION_CALL = Function.call;

	FutureCall.prototype.onResolved = function tasync_trace_start (value) {
		assert(this.state === STATE_LISTEN);

		var args = this.args;
		args[this.index] = value;

		while (--this.index >= 0) {
			value = args[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					args[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		assert(FRAME === ROOT);
		FRAME = this;

		this.args = null;
		try {
			var func = args[0];
			args[0] = null;
			value = FUNCTION_CALL.apply(func, args);
		} catch (error) {
			FRAME = ROOT;

			this.reject(createError(error, this));
			return;
		}

		FRAME = ROOT;

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);

			this.onResolved = this.resolve;
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	var call = function () {
		var index = arguments.length;
		while (--index >= 0) {
			var value = arguments[index];
			if (value instanceof Future) {
				if (value.state === STATE_LISTEN) {
					var future = new FutureCall(arguments, index);
					value.register(future);
					return future;
				} else if (value.state === STATE_RESOLVED) {
					arguments[index] = value.value;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		var func = arguments[0];
		return FUNCTION_CALL.apply(func, arguments);
	};

	// ------- TryCatch -------

	function FutureTryCatch (handler) {
		Future.call(this);

		this.handler = handler;
	}

	FutureTryCatch.prototype = Object.create(Future.prototype);

	FutureTryCatch.prototype.onRejected = function (error) {
		try {
			var value = this.handler(error);

			if (value instanceof Future) {
				this.onRejected = Future.prorotype.reject;
				value.register(this);
			} else {
				this.resolve(value);
			}
		} catch (err) {
			this.reject(err);
		}
	};

	FutureTryCatch.prototype.onResolved = Future.prototype.resolve;

	function trycatch (func, handler) {
		if (typeof func !== "function" || typeof handler !== "function") {
			throw new Error("function arguments are expected");
		}

		try {
			var value = func();

			if (value instanceof Future) {
				var future = new FutureTryCatch(handler);
				value.register(future);

				return future;
			} else {
				return value;
			}
		} catch (error) {
			return handler(error);
		}
	}

	// ------- Wrap -------

	function wrap (func) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		}

		if (typeof func.tasync_wraped === "undefined") {
			func.tasync_wraped = function () {
				var args = arguments;
				var future = new Future();

				args[args.length++] = function (error, value) {
					if (error) {
						future.reject(error instanceof Error ? error : new Error(error));
					} else {
						future.resolve(value);
					}
				};

				func.apply(this, args);

				if (future.state === STATE_LISTEN) {
					return future;
				} else if (future.state === STATE_RESOLVED) {
					return future.value;
				} else {
					assert(future.state === STATE_REJECTED);
					throw future.value;
				}
			};

			func.tasync_wraped.tasync_unwraped = func;
		}

		return func.tasync_wraped;
	}

	// ------- Unwrap -------

	function UnwrapListener (callback) {
		this.callback = callback;
	}

	UnwrapListener.prototype.onRejected = function (error) {
		this.callback(error);
	};

	UnwrapListener.prototype.onResolved = function (value) {
		this.callback(null, value);
	};

	function unwrap (func) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		}

		if (typeof func.tasync_unwraped === "undefined") {
			func.tasync_unwraped = function () {
				var args = arguments;

				var callback = args[--args.length];
				assert(typeof callback === "function");

				var value;
				try {
					value = func.apply(this, args);
				} catch (error) {
					callback(error);
					return;
				}

				if (value instanceof Future) {
					assert(value.state === STATE_LISTEN);

					var listener = new UnwrapListener(callback);
					value.register(listener);
				} else {
					callback(null, value);
				}
			};

			func.tasync_unwraped.tasync_wraped = func;
		}

		return func.tasync_unwraped;
	}

	// ------- Throttle -------

	function FutureThrottle (func, that, args) {
		Future.call(this);

		this.func = func;
		this.that = that;
		this.args = args;

		this.caller = FRAME;
		this.position = ++FRAME.subframes;

		this.path = this.getPath();
	}

	FutureThrottle.prototype = Object.create(Future.prototype);

	FutureThrottle.prototype.execute = function () {
		var value;
		try {
			assert(FRAME === ROOT);
			FRAME = this;

			value = this.func.apply(this.that, this.args);

			FRAME = ROOT;
		} catch (error) {
			FRAME = ROOT;

			this.reject(error);
			return;
		}

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	FutureThrottle.prototype.getPath = FutureApply.prototype.getPath;
	FutureThrottle.prototype.onResolved = Future.prototype.resolve;
	FutureThrottle.prototype.onRejected = Future.prototype.reject;

	FutureThrottle.prototype.compare = function (second) {
		var first = this.path;
		second = second.path;

		var i, limit = first.length < second.length ? first.length : second.length;
		for (i = 0; i < limit; ++i) {
			if (first[i] !== second[i]) {
				return first[i] - second[i];
			}
		}

		return first.length - second.length;
	};

	function ThrottleListener (limit) {
		this.running = 0;
		this.limit = limit;
		this.queue = [];
	}

	function priorityQueueInsert (queue, elem) {
		var low = 0;
		var high = queue.length;

		while (low < high) {
			var mid = Math.floor((low + high) / 2);
			assert(low <= mid && mid < high);

			if (elem.compare(queue[mid]) < 0) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		queue.splice(low, 0, elem);
	}

	ThrottleListener.prototype.execute = function (func, that, args) {
		if (this.running < this.limit) {
			var value = func.apply(that, args);

			if (value instanceof Future) {
				assert(value.state === STATE_LISTEN);

				++this.running;
				value.register(this);
			}

			return value;
		} else {
			var future = new FutureThrottle(func, that, args);
			priorityQueueInsert(this.queue, future);

			return future;
		}
	};

	ThrottleListener.prototype.onResolved = function () {
		if (this.queue.length > 0) {
			var future = this.queue.pop();
			future.register(this);

			future.execute();
		} else {
			--this.running;
		}
	};

	ThrottleListener.prototype.onRejected = ThrottleListener.prototype.onResolved;

	// TODO: prevent recursion, otheriwise throttle will not work
	function throttle (func, limit) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		} else if (typeof limit !== "number") {
			throw new Error("number argument is expected");
		}

		var listener = new ThrottleListener(limit);

		return function () {
			return listener.execute(func, this, arguments);
		};
	}

	// ------- Join -------

	function FutureJoin (first) {
		Future.call(this);

		this.first = first;
		this.missing = first instanceof Future && first.state === STATE_LISTEN ? 1 : 0;
	}

	FutureJoin.prototype = Object.create(Future.prototype);

	FutureJoin.prototype.onResolved = function (value) {
		if (--this.missing === 0) {
			assert(this.state !== STATE_RESOLVED);

			if (this.state === STATE_LISTEN) {
				if (this.first instanceof Future) {
					assert(this.first.state === STATE_RESOLVED);

					this.resolve(this.first.value);
				} else {
					this.resolve(this.first);
				}
			}
		}
	};

	FutureJoin.prototype.onRejected = function (error) {
		if (this.state === STATE_LISTEN) {
			this.reject(error);
		}
	};

	function join (first, second) {
		if (first instanceof Future && first.state === STATE_REJECTED) {
			return first;
		} else if (second instanceof Future) {
			if (second.state === STATE_RESOLVED) {
				return first;
			} else if (second.state === STATE_REJECTED) {
				return second;
			}
		} else {
			return first;
		}

		if (!(first instanceof FutureJoin)) {
			first = new FutureJoin(first);
		}

		first.missing += 1;
		second.register(first);

		return first;
	}

	// ------- TASYNC -------

	var TASYNC = {
		setTrace: setTrace,
		delay: delay,
		lift: lift,
		apply: apply,
		call: call,
		trycatch: trycatch,
		wrap: wrap,
		unwrap: unwrap,
		throttle: throttle,
		join: join
	};

	if (typeof define === "function" && define.amd) {
		define('core/tasync',[], function () {
			return TASYNC;
		});
	} else {
		module.exports = TASYNC;
	}
}());

/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/Artifact',['blob/BlobMetadata', 'blob/BlobConfig', 'core/tasync'], function (BlobMetadata, BlobConfig, tasync) {

    /**
     * Creates a new instance of artifact, i.e. complex object, in memory. This object can be saved in the storage.
     * @param {string} name Artifact's name without extension
     * @param {blob.BlobClient} blobClient
     * @param {blob.BlobMetadata} descriptor
     * @constructor
     */
    var Artifact = function (name, blobClient, descriptor) {
        this.name = name;
        this.blobClient = blobClient;
        this.blobClientPutFile = tasync.unwrap(tasync.throttle(tasync.wrap(blobClient.putFile), 5));
        this.blobClientGetMetadata = tasync.unwrap(tasync.throttle(tasync.wrap(blobClient.getMetadata), 5));
        // TODO: use BlobMetadata class here
        this.descriptor = descriptor || {
            name: name + '.zip',
            size: 0,
            mime: 'application/zip',
            content: {},
            contentType: 'complex'
        }; // name and hash pairs
    };

    /**
     * Adds content to the artifact as a file.
     * @param {string} name filename
     * @param {Blob} content File object or Blob
     * @param callback
     */
    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.addObjectHash(name, hash, function (err, hash) {
                callback(err, hash);
            });
        });
    };

    Artifact.prototype.addFileAsSoftLink = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content,
            function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                self.addMetadataHash(name, hash, function (err, hash) {
                    callback(err, hash);
                });
            });
    };

    /**
     * Adds multiple files.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFiles = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFile(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };


    /**
     * Adds multiple files as soft-links.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFilesAsSoftLinks = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files as soft-links: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFileAsSoftLink(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} hash Metadata hash that has to be added.
     * @param callback
     */
    Artifact.prototype.addObjectHash = function (name, hash, callback) {
        var self = this;

        self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: metadata.content,
                    contentType: BlobMetadata.CONTENT_TYPES.OBJECT
                };
                callback(null, hash);
            }
        });
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addObjectHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addObjectHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    Artifact.prototype.addMetadataHash = function (name, hash, callback) {
        var self = this;

        if (BlobConfig.hashRegex.test(hash) === false) {
            callback("Blob hash is invalid");
            return;
        }
        self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: hash,
                    contentType: BlobMetadata.CONTENT_TYPES.SOFT_LINK
                };
                callback(null, hash);
            }
        });
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addMetadataHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addMetadataHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    /**
     * Saves this artifact and uploads the metadata to the server's storage.
     * @param callback
     */
    Artifact.prototype.save = function (callback) {
        this.blobClient.putMetadata(this.descriptor, callback);
    };

    return Artifact;
});

/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/BlobClient',['./Artifact', 'blob/BlobMetadata', 'superagent'], function (Artifact, BlobMetadata, superagent) {

    var BlobClient = function (parameters) {
        this.artifacts = [];

        if (parameters) {
            this.server = parameters.server || this.server;
            this.serverPort = parameters.serverPort || this.serverPort;
            this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
        }
        this.blobUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.blobUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }

        // TODO: TOKEN???
        this.blobUrl = this.blobUrl + '/rest/blob/'; // TODO: any ways to ask for this or get it from the configuration?
    };

    BlobClient.prototype.getMetadataURL = function (hash) {
        var metadataBase = this.blobUrl + 'metadata';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    BlobClient.prototype._getURL = function (base, hash, subpath) {
        var subpathURL = '';
        if (subpath) {
            subpathURL = subpath;
        }
        return this.blobUrl + base + '/' + hash + '/' + encodeURIComponent(subpathURL);
    };

    BlobClient.prototype.getViewURL = function (hash, subpath) {
        return this._getURL('view', hash, subpath);
    };

    BlobClient.prototype.getDownloadURL = function (hash, subpath) {
        return this._getURL('download', hash, subpath);
    };

    BlobClient.prototype.getCreateURL = function (filename, isMetadata) {
        if (isMetadata) {
            return this.blobUrl + 'createMetadata/';
        } else {
            return this.blobUrl + 'createFile/' + encodeURIComponent(filename);
        }
    };


    BlobClient.prototype.putFile = function (name, data, callback) {
        function toArrayBuffer(buffer) {
            var ab = new ArrayBuffer(buffer.length);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; ++i) {
                view[i] = buffer[i];
            }
            return ab;
        }
        // on node-webkit, we use XMLHttpRequest, but xhr.send thinks a Buffer is a string and encodes it in utf-8. Send an ArrayBuffer instead
        if (typeof window !== 'undefined' && typeof Buffer !== 'undefined' && data instanceof Buffer) {
            data = toArrayBuffer(data); // FIXME will this have performance problems
        }
        superagent.post(this.getCreateURL(name))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', data.length)
            .send(data)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                var response = res.body;
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var self = this;
        var metadata = new BlobMetadata(metadataDescriptor);

        // FIXME: in production mode do not indent the json file.
        var blob;
        var contentLength;
        if (typeof Blob !== 'undefined') {
            blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});
            contentLength = blob.size;
        } else {
            blob = new Buffer(JSON.stringify(metadata.serialize(), null, 4), 'utf8');
            contentLength = blob.length;
        }

        superagent.post(this.getCreateURL(metadataDescriptor.name, true))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', contentLength)
            .send(blob)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                // Uploaded.
                var response = JSON.parse(res.text);
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putFiles = function (o, callback) {
        var self = this;

        var filenames = Object.keys(o);
        var remaining = filenames.length;

        var hashes = {};

        for (var j = 0; j < filenames.length; j += 1) {
            (function(filename, data) {

                self.putFile(filename, data, function (err, hash) {
                    remaining -= 1;

                    hashes[filename] = hash;

                    if (err) {
                        // TODO: log/handle error
                        return;
                    }

                    if (remaining === 0) {
                        callback(null, hashes);
                    }
                });

            })(filenames[j], o[filenames[j]]);
        }
    };

    BlobClient.prototype.getSubObject = function (hash, subpath, callback) {
        return this.getObject(hash, callback, subpath);
    }

    BlobClient.prototype.getObject = function (hash, callback, subpath) {
        superagent.parse['application/zip'] = function (obj, parseCallback) {
            if (parseCallback) {
                // Running on node; this should be unreachable due to req.pipe() below
            } else {
                return obj;
            }
        }
        //superagent.parse['application/json'] = superagent.parse['application/zip'];

        var req = superagent.get(this.getViewURL(hash, subpath));
        if (req.pipe) {
            // running on node
            var Writable = require('stream').Writable;
            require('util').inherits(BuffersWritable, Writable);

            function BuffersWritable(options) {
                Writable.call(this, options);

                var self = this;
                self.buffers = [];
            }
            BuffersWritable.prototype._write = function(chunk, encoding, callback) {
                this.buffers.push(chunk);
                callback();
            };

            var buffers = new BuffersWritable();
            buffers.on('finish', function () {
                callback(null, Buffer.concat(buffers.buffers));
            });
            buffers.on('error', function (err) {
                callback(err);
            });
            req.pipe(buffers);
        } else {
            req.removeAllListeners('end');
            req.on('request', function () {
                if (typeof this.xhr !== 'undefined') {
                    this.xhr.responseType = 'arraybuffer';
                }
            });
            // req.on('error', callback);
            req.on('end', function() {
                if (req.xhr.status > 399) {
                    callback(req.xhr.status);
                } else {
                    var contentType = req.xhr.getResponseHeader('content-type');
                    var response = req.xhr.response; // response is an arraybuffer
                    if (contentType == 'application/json') {
                        function utf8ArrayToString(uintArray) {
                            return decodeURIComponent(escape(String.fromCharCode.apply(null, uintArray)));
                        }
                        response = JSON.parse(utf8ArrayToString(new Uint8Array(response)));
                    }
                    callback(null, response);
                }
            });
            req.end(callback);
        }
    };

    BlobClient.prototype.getMetadata = function (hash, callback) {
        superagent.get(this.getMetadataURL(hash))
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                } else {
                    callback(null, JSON.parse(res.text));
                }
            });
    };

    BlobClient.prototype.createArtifact = function (name) {
        var artifact = new Artifact(name, this);
        this.artifacts.push(artifact);
        return artifact;
    };

    BlobClient.prototype.getArtifact = function (metadataHash, callback) {
        // TODO: get info check if complex flag is set to true.
        // TODO: get info get name.
        var self = this;
        this.getMetadata(metadataHash, function (err, info) {
            if (err) {
                callback(err);
                return;
            }

            if (info.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                var artifact = new Artifact(info.name, self, info);
                self.artifacts.push(artifact);
                callback(null, artifact);
            } else {
                callback('not supported contentType ' + JSON.stringify(info, null, 4));
            }

        });
    };

    BlobClient.prototype.saveAllArtifacts = function (callback) {
        var remaining = this.artifacts.length;
        var hashes = [];

        if (remaining === 0) {
            callback(null, hashes);
        }

        for (var i = 0; i < this.artifacts.length; i += 1) {

            this.artifacts[i].save(function(err, hash) {
                remaining -= 1;

                hashes.push(hash);

                if (err) {
                    // TODO: log/handle errors
                    return;
                }
                if (remaining === 0) {
                    callback(null, hashes);
                }
            });
        }
    };

    return BlobClient;
});
/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */


/*
 * -------- LOGMANAGER -------
 */

define('logManager',[], function () {

	var logLevels = {
		"ALL": 5,
		"DEBUG": 4,
		"INFO": 3,
		"WARNING": 2,
		"ERROR": 1,
		"OFF": 0
	},
    logColors = {
		"DEBUG": "90",
		"INFO": "36",
		"WARNING": "33",
		"ERROR": "31"
	},
    currentLogLevel = logLevels.WARNING,
    useColors = false,
    excludedComponents = [],
    FS = null,
    logFilePath = null,
    logFileBuffer = [],
    Logger,
    isComponentAllowedToLog,
    printLogMessageToFile,
    logMessage;

	isComponentAllowedToLog = function (componentName) {
		var i, excludedComponentName;

		for (i = 0; i < excludedComponents.length; i += 1) {
			excludedComponentName = excludedComponents[i];

			if (excludedComponentName.substr(-1) === "*") {
				excludedComponentName = excludedComponentName.substring(0, excludedComponentName.length - 1);

				if (componentName.substring(0, excludedComponentName.length) === excludedComponentName) {
					return false;
				}
			} else {
				if (excludedComponentName === componentName) {
					return false;
				}
			}

		}

		return true;
	};

	printLogMessageToFile = function () {
		var message = logFileBuffer[0];
		if (message) {
			FS.appendFile(logFilePath, message, function (err) {
				logFileBuffer.shift();
				if (err) {
					//something wrong so we should fallback to console logging
					logFilePath = null;
					logFileBuffer = [];
				} else {
					if (logFileBuffer.length > 0) {
						printLogMessageToFile();
					}
				}
			});
		}
	};

	logMessage = function (level, componentName, msg) {
		var logTime = new Date(), logTimeStr = (logTime.getHours() < 10) ? "0" + logTime.getHours() : logTime.getHours(), levelStr = level, concreteLogger = console.log;

		//logTimeString
		logTimeStr += ":";
		logTimeStr += (logTime.getMinutes() < 10) ? "0" + logTime.getMinutes() : logTime.getMinutes();
		logTimeStr += ":";
		logTimeStr += (logTime.getSeconds() < 10) ? "0" + logTime.getSeconds() : logTime.getSeconds();
		logTimeStr += ".";
		logTimeStr += (logTime.getMilliseconds() < 10) ? "00" + logTime.getMilliseconds() : ((logTime.getMilliseconds() < 100) ? "0" + logTime.getMilliseconds() : logTime.getMilliseconds());

		//levelStr
		if (useColors === true && logFilePath === null) {
			levelStr = '\u001B[' + logColors[level] + 'm' + level + '\u001B[39m';
		}

		if (isComponentAllowedToLog(componentName) === true) {
			if (logFilePath) {
				msg = levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg + "\n";
				if (logFileBuffer.length === 0) {
					logFileBuffer.push(msg);
					printLogMessageToFile();
				} else {
					logFileBuffer.push(msg);
				}
			} else {
				//console logging
				//log only what meets configuration
				if (logLevels[level] <= currentLogLevel) {
					//see whether console exists
					if (console && console.log) {

						if ((logLevels[level] === logLevels.ERROR) && (console.error)) {
							concreteLogger = console.error;
						}

						if ((logLevels[level] === logLevels.WARNING) && (console.warn)) {
							concreteLogger = console.warn;
						}

						if ((logLevels[level] === logLevels.INFO) && (console.info)) {
							concreteLogger = console.info;
						}

						concreteLogger.call(console, levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg);
					}
				}
			}
		}
	};

	Logger = function (componentName) {
		this.debug = function (msg) {
			logMessage("DEBUG", componentName, msg);
		};

		this.info = function (msg) {
			logMessage("INFO", componentName, msg);
		};

		this.warning = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.warn = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.error = function (msg) {
			logMessage("ERROR", componentName, msg);
		};
	};

    var _setLogLevel = function (level) {
        if ((level >= 0) && (level <= logLevels.ALL)) {
            currentLogLevel = level;
        }
    };

    var _getLogLevel = function () {
        return currentLogLevel;
    };

    var _setFileLogPath = function (logPath) {
        if (FS === null) {
            try {
                FS = require('fs');
                if (FS.appendFile) {
                    logFilePath = logPath;
                }
            } catch (e) {
                FS = {};
                logFilePath = null;
            }
        } else {
            if (FS.appendFile) {
                logFilePath = logPath;
            }
        }
    };

    var _getFileLogPath = function () {
        return logFilePath;
    };

    var _useColors = function (enabled) {
        if ((enabled === true) || (enabled === false)) {
            useColors = enabled;
        } else {
            useColors = false;
        }
    };

    var _excludeComponent = function (componentName) {
        if (excludedComponents.indexOf(componentName) === -1) {
            excludedComponents.push(componentName);
        }
    };

	return {
		logLevels: logLevels,
		setLogLevel: _setLogLevel,
		getLogLevel: _getLogLevel,

		// this function is only for server side!!!
		setFileLogPath:_setFileLogPath,
		getFileLogPath: _getFileLogPath,

		useColors: _useColors,
        excludeComponent: _excludeComponent,

		create: function (componentName) {
			return new Logger(componentName);
		}
	};
});

/**
 * Created by Zsolt on 5/21/2014.
 *
 */


define('executor/ExecutorClient',['superagent'], function (superagent) {

    var ExecutorClient = function (parameters) {
        parameters = parameters || {};
        this.isNodeJS = (typeof window === 'undefined') && (typeof process === "object");
        this.isNodeWebkit = (typeof window === 'object') && (typeof process === "object");

        //console.log(isNode);
        if (this.isNodeJS) {
            var config = WebGMEGlobal.getConfig();
            this.server = '127.0.0.1';
            this.serverPort = config.port;
            this.httpsecure = config.httpsecure;

            this._clientSession = null; // parameters.sessionId;;
        }
        this.server = parameters.server || this.server;
        this.serverPort = parameters.serverPort || this.serverPort;
        this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
        if (this.isNodeJS) {
            this.http = this.httpsecure ? require('https') : require('http');
        }
        this.executorUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.executorUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }
        // TODO: TOKEN???
        this.executorUrl = this.executorUrl + '/rest/external/executor/'; // TODO: any ways to ask for this or get it from the configuration?
        if (parameters.executorNonce) {
            this.executorNonce = parameters.executorNonce;
        } else if (typeof WebGMEGlobal !== "undefined") {
            var webGMEConfig = WebGMEGlobal.getConfig();
            if (webGMEConfig.executorNonce) {
                this.executorNonce = webGMEConfig.executorNonce;
            }
        }
    };

    ExecutorClient.prototype.getInfoURL = function (hash) {
        var metadataBase = this.executorUrl + 'info';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };


    ExecutorClient.prototype.getCreateURL = function (hash) {
        var metadataBase = this.executorUrl + 'create';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    ExecutorClient.prototype.createJob = function (jobInfo, callback) {
        if (typeof jobInfo === 'string') {
            jobInfo = { hash: jobInfo }; // old API
        }
        this.sendHttpRequestWithData('POST', this.getCreateURL(jobInfo.hash), jobInfo, function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.updateJob = function (jobInfo, callback) {
        this.sendHttpRequestWithData('POST', this.executorUrl + 'update/' + jobInfo.hash, jobInfo, function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, response);
        });
    };

    ExecutorClient.prototype.getInfo = function (hash, callback) {
        this.sendHttpRequest('GET', this.getInfoURL(hash), function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getAllInfo = function (callback) {

        this.sendHttpRequest('GET', this.getInfoURL(), function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getInfoByStatus = function (status, callback) {

        this.sendHttpRequest('GET', this.executorUrl + '?status=' + status, function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getWorkersInfo = function (callback) {

        this.sendHttpRequest('GET', this.executorUrl + 'worker', function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.sendHttpRequest = function (method, url, callback) {
        return this.sendHttpRequestWithData(method, url, null, callback);
    };

    ExecutorClient.prototype.sendHttpRequestWithData = function (method, url, data, callback) {
        var req = new superagent.Request(method, url);
        if (this.executorNonce) {
            req.set('x-executor-nonce', this.executorNonce);
        }
        if (data) {
            req.send(data);
        }
        req.end(function (err, res) {
            if (err) {
                callback(err);
                return;
            }
            if (res.status > 399) {
                callback(res.status, res.text);
            } else {
                callback(null, res.text);
            }
        });
    };

    ExecutorClient.prototype._ensureAuthenticated = function (options, callback) {
        //this function enables the session of the client to be authenticated
        //TODO currently this user does not have a session, so it has to upgrade the options always!!!
//        if (options.headers) {
//            options.headers.webgmeclientsession = this._clientSession;
//        } else {
//            options.headers = {
//                'webgmeclientsession': this._clientSession
//            }
//        }
        callback(null, options);
    };

    return ExecutorClient;
});

define('executor/WorkerInfo',[], function () {
    var ClientRequest = function(parameters) {
        this.clientId = parameters.clientId || undefined;
        this.availableProcesses = parameters.availableProcesses || 0;
        this.labels = parameters.labels || [];
    }

    var ServerResponse = function(parameters) {
        this.jobsToStart = parameters.jobsToStart || [];
        this.refreshPeriod = parameters.refreshPeriod || 30 * 1000;
        this.labelJobs = parameters.labelJobs;
    };

    return { ClientRequest: ClientRequest, ServerResponse: ServerResponse };
});


define('executor/JobInfo',[], function() {
    var JobInfo = function (parameters) {
        this.hash = parameters.hash;
        this.resultHashes = parameters.resultHashes || [];
        this.resultSuperSet = parameters.resultSuperSet || null;
        this.userId = parameters.userId || [];
        this.status = parameters.status || null;
        this.createTime = parameters.createTime || null;
        this.startTime = parameters.startTime || null;
        this.finishTime = parameters.finishTime || null;
        this.worker = parameters.worker || null;
        this.labels = parameters.labels || [];
    };

    JobInfo.finishedStatuses = [ 'SUCCESS', 'FAILED_TO_EXECUTE', 'FAILED_TO_GET_SOURCE_METADATA', 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED',
        'FAILED_CREATING_SOURCE_ZIP', 'FAILED_UNZIP', 'FAILED_EXECUTOR_CONFIG', 'FAILED_TO_ARCHIVE_FILE', 'FAILED_TO_SAVE_JOINT_ARTIFACT', 'FAILED_TO_ADD_OBJECT_HASHES',
        'FAILED_TO_SAVE_ARTIFACT'];
    JobInfo.isFinishedStatus = function (status) {
        return JobInfo.finishedStatuses.indexOf(status) !== -1;
    };

    JobInfo.isFailedFinishedStatus = function (status) {
        return JobInfo.isFinishedStatus(status) && status !== 'SUCCESS';
    };

    return JobInfo;
});
/*globals require, nodeRequire, process, console*/
/**
 * Created by Zsolt on 5/16/2014.
 *
 * THIS IS A THROW AWAY CODE AND IMPLEMENTATION.
 *
 * TEMPORARY CODE AND IMPLEMENTATION.
 *
 */

// eb.executorClient.createJob('1092dd2b135af5d164b9d157b5360391246064db', function (err, res) { console.log(require('util').inspect(res)); })
// eb.executorClient.getInfoByStatus('CREATED', function(err, res) { console.log("xxx " + require('util').inspect(res)); })

define('executor/ExecutorWorker',['logManager',
        'blob/BlobClient',
        'blob/BlobMetadata',
        'fs',
        'util',
        'events',
        'path',
        'child_process',
        'minimatch',
        'executor/ExecutorClient',
        'executor/WorkerInfo',
        'executor/JobInfo',
        'superagent',
        'rimraf'
    ],
    function (logManager, BlobClient, BlobMetadata, fs, util, events, path, child_process, minimatch, ExecutorClient, WorkerInfo, JobInfo, superagent, rimraf) {
        var UNZIP_EXE;
        var UNZIP_ARGS;
        if (process.platform === "win32") {
            UNZIP_EXE = "c:\\Program Files\\7-Zip\\7z.exe";
            UNZIP_ARGS = ["x", "-y"];
        } else if (process.platform === "linux") {
            UNZIP_EXE = "/usr/bin/unzip";
            UNZIP_ARGS = ["-o"];
        } else {
            UNZIP_EXE = "unknown";
        }

        var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) return done(null, results);
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            next();
                        });
                    } else {
                        results.push(file);
                        next();
                    }
                });
            })();
        });
    };

    //here you can define global variables for your middleware
    var logger = // logManager.create('REST-External-Executor'); //how to define your own logger which will use the global settings
        function() { };
    logger.prototype.error = function(x) { console.log(x); };
    logger.prototype.info = logger.prototype.error;
    logger.prototype.debug = logger.prototype.error;
    logger = new logger();

    var ExecutorWorker = function (parameters) {
        this.blobClient = new BlobClient({server: parameters.server, serverPort: parameters.serverPort, httpsecure: parameters.httpsecure });

        this.executorClient = new ExecutorClient({server: parameters.server, serverPort: parameters.serverPort, httpsecure: parameters.httpsecure });
        if (parameters.executorNonce) {
            this.executorClient.executorNonce = parameters.executorNonce;
        }
        this.jobList = {};

        this.sourceFilename = 'source.zip';
        this.resultFilename = 'execution_results';
        this.executorConfigFilename = 'executor_config.json';

        this.workingDirectory = parameters.workingDirectory || 'executor-temp';

        if (!fs.existsSync(this.workingDirectory)) {
            fs.mkdirSync(this.workingDirectory);
        }
        this.availableProcessesContainer = parameters.availableProcessesContainer || { availableProcesses: 1 };
        this.clientRequest = new WorkerInfo.ClientRequest({ clientId: null });
        this.labelJobs = {};
    };
    util.inherits(ExecutorWorker, events.EventEmitter);

    ExecutorWorker.prototype.startJob = function (jobInfo, errorCallback, successCallback) {
        var self = this;

        // TODO: create job
        // TODO: what if job is already running?

        // get metadata for hash
        self.blobClient.getMetadata(jobInfo.hash, function (err, metadata) {
            if (err) {
                jobInfo.status = 'FAILED_TO_GET_SOURCE_METADATA';
                errorCallback(err);
                return;
            }

            // download artifacts
            self.blobClient.getObject(jobInfo.hash, function (err, content) {
                if (err) {
                    jobInfo.status = 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED';
                    errorCallback('Failed obtaining job source content, err: ' + err.toString());
                    return;
                }

                var jobDir = path.normalize(path.join(self.workingDirectory, jobInfo.hash));

                if (!fs.existsSync(jobDir)) {
                    fs.mkdirSync(jobDir);
                }

                var zipPath = path.join(jobDir, self.sourceFilename);

                //content = new Uint8Array(content);
                content = new Buffer(new Uint8Array(content));
                fs.writeFile(zipPath, content, function (err) {
                    if (err) {
                        jobInfo.status = 'FAILED_CREATING_SOURCE_ZIP';
                        errorCallback('Failed creating source zip-file, err: ' + err.toString());
                        return;
                    }

                    // unzip downloaded file

                    var args = [path.basename(zipPath)];
                    args.unshift.apply(args, UNZIP_ARGS);
                    var child = child_process.execFile(UNZIP_EXE, args, {cwd: jobDir},
                        function (err, stdout, stderr) {
                        if (err) {
                            jobInfo.status = 'FAILED_UNZIP';
                            console.error(stderr);
                            errorCallback(err);
                            return;
                        }

                        // delete downloaded file
                        fs.unlinkSync(zipPath);

                        jobInfo.startTime = new Date().toISOString();

                        // get cmd file dynamically from the this.executorConfigFilename file
                        fs.readFile(path.join(jobDir, self.executorConfigFilename), 'utf8', function (err, data) {
                            if (err) {
                                jobInfo.status = 'FAILED_EXECUTOR_CONFIG';
                                errorCallback('Could not read ' + self.executorConfigFilename + ' err:' + err);
                                return;
                            }

                            var executorConfig = JSON.parse(data);
                            var cmd = executorConfig.cmd;

                            logger.debug('working directory: ' + jobDir + ' executing: ' + cmd);

                            var child = child_process.spawn(cmd, [], {cwd: jobDir, stdio: ['ignore', 'pipe', 'pipe']});
                            var outlog = fs.createWriteStream(path.join(jobDir, 'job_stdout.txt'));
                            child.stdout.pipe(outlog);
                            child.stdout.pipe(fs.createWriteStream(path.join(self.workingDirectory, jobInfo.hash.substr(0, 6) + '_stdout.txt')));
                            child.stderr.pipe(fs.createWriteStream(path.join(jobDir, 'job_stderr.txt'))); // TODO: maybe put in the same file as stdout
                            child.on('close', function (code, signal) {

                                    jobInfo.finishTime = new Date().toISOString();

                                    if (code !== 0) {
                                        logger.error(jobInfo.hash + ' exec error: ' + code);
                                        jobInfo.status = 'FAILED_TO_EXECUTE';
                                    }

                                    // TODO: save stderr and stdout to files.

                                    successCallback(jobInfo, jobDir, executorConfig); // normally self.saveJobResults(jobInfo, jobDir, executorConfig);
                                });
                        });
                    });

                });
            });
        });
    };

    ExecutorWorker.prototype.saveJobResults = function (jobInfo, directory, executorConfig) {
        var self = this,
            i,
            jointArtifact = self.blobClient.createArtifact('jobInfo_resultSuperSetHash'),
            resultsArtifacts = [],
            afterWalk,
            archiveFile,
            afterAllFilesArchived,
            addObjectHashesAndSaveArtifact;
        jobInfo.resultHashes = {};

        for (i = 0; i < executorConfig.resultArtifacts.length; i += 1) {
            resultsArtifacts.push(
                {
                    name: executorConfig.resultArtifacts[i].name,
                    artifact: self.blobClient.createArtifact(executorConfig.resultArtifacts[i].name),
                    patterns: executorConfig.resultArtifacts[i].resultPatterns instanceof Array ?
                        executorConfig.resultArtifacts[i].resultPatterns : [],
                    files: {}
                }
            );
        }

        afterWalk = function (filesToArchive) {
            var counter,
                pendingStatus,
                i,
                counterCallback = function (err) {
                    if (err) {
                        pendingStatus = err;
                    }
                    counter -= 1;
                    if (counter <= 0) {
                        if (pendingStatus) {
                            jobInfo.status = pendingStatus;
                        } else {
                            afterAllFilesArchived();
                        }

                    }
                };
            counter = filesToArchive.length;
            if (filesToArchive.length === 0) {
                logger.info(jobInfo.hash + ' There were no files to archive..');
                counterCallback(null);
            }
            for (i = 0; i < filesToArchive.length; i += 1) {
                archiveFile(filesToArchive[i].filename, filesToArchive[i].filePath, counterCallback);
            }
        };

        archiveFile = function (filename, filePath, callback) {
            var archiveData = function (err, data) {
                jointArtifact.addFileAsSoftLink(filename, data, function (err, hash) {
                    var j;
                    if (err) {
                        logger.error(jobInfo.hash + ' Failed to archive as "' + filename + '" from "' + filePath + '", err: ' + err);
                        callback('FAILED_TO_ARCHIVE_FILE');
                    } else {
                        // Add the file-hash to the results artifacts containing the filename.
                        //console.log('Filename added : ' + filename);
                        for (j = 0; j < resultsArtifacts.length; j += 1) {
                            if (resultsArtifacts[j].files[filename] === true) {
                                resultsArtifacts[j].files[filename] = hash;
                                //console.log('Replaced! filename: "' + filename + '", artifact "' + resultsArtifacts[j].name
                                //    + '" with hash: ' + hash);
                            }
                        }
                        callback(null);
                    }
                });
            };
            if (typeof File === 'undefined') { // nodejs doesn't have File
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        logger.error(jobInfo.hash + ' Failed to archive as "' + filename + '" from "' + filePath + '", err: ' + err);
                        return callback('FAILED_TO_ARCHIVE_FILE');
                    }
                    archiveData(null, data);
                });
            } else {
                archiveData(null, new File(filePath, filename));
            }
        };

        afterAllFilesArchived = function () {
            jointArtifact.save(function (err, resultHash) {
                var counter,
                    pendingStatus,
                    i,
                    counterCallback;
                if (err) {
                    logger.error(jobInfo.hash + " " + err);
                    jobInfo.status = 'FAILED_TO_SAVE_JOINT_ARTIFACT';
                    self.sendJobUpdate(jobInfo);
                } else {
                    counterCallback = function (err) {
                        if (err) {
                            pendingStatus = err;
                        }
                        counter -= 1;
                        if (counter <= 0) {
                            if (JobInfo.isFailedFinishedStatus(jobInfo.status)) {
                                // Keep the previous error status
                            } else if (pendingStatus) {
                                jobInfo.status = pendingStatus;
                            } else {
                                jobInfo.status = 'SUCCESS';
                            }
                            self.sendJobUpdate(jobInfo);
                        }
                    };
                    counter = resultsArtifacts.length;
                    if (counter === 0) {
                        counterCallback(null);
                    }
                    rimraf(directory, function (err) {
                        if (err) {
                            logger.error('Could not delete executor-temp file, err: ' + err);
                        }
                        jobInfo.resultSuperSetHash = resultHash;
                        for (i = 0; i < resultsArtifacts.length; i += 1) {
                            addObjectHashesAndSaveArtifact(resultsArtifacts[i], counterCallback);
                        }
                    });
                }
            });
        };

        addObjectHashesAndSaveArtifact = function (resultArtifact, callback) {
            resultArtifact.artifact.addMetadataHashes(resultArtifact.files, function (err, hashes) {
                if (err) {
                    logger.error(jobInfo.hash + " " + err);
                    return callback('FAILED_TO_ADD_OBJECT_HASHES');
                }
                resultArtifact.artifact.save(function (err, resultHash) {
                    if (err) {
                        logger.error(jobInfo.hash + " " + err);
                        return callback('FAILED_TO_SAVE_ARTIFACT');
                    }
                    jobInfo.resultHashes[resultArtifact.name] = resultHash;
                    callback(null);
                });
            });
        };

        walk(directory, function (err, results) {
            var i, j, a,
                filesToArchive = [],
                archive,
                filename,
                matched;
            //console.log('Walking the walk..');
            for (i = 0; i < results.length; i += 1) {
                filename = path.relative(directory, results[i]).replace(/\\/g,'/');
                archive = false;
                for (a = 0; a < resultsArtifacts.length; a += 1) {
                    if (resultsArtifacts[a].patterns.length === 0) {
                        //console.log('Matched! filename: "' + filename + '", artifact "' + resultsArtifacts[a].name + '"');
                        resultsArtifacts[a].files[filename] = true;
                        archive = true;
                    } else {
                        for (j = 0; j < resultsArtifacts[a].patterns.length; j += 1) {
                            matched = minimatch(filename, resultsArtifacts[a].patterns[j]);
                            if (matched) {
                                //console.log('Matched! filename: "' + filename + '", artifact "' + resultsArtifacts[a].name + '"');
                                resultsArtifacts[a].files[filename] = true;
                                archive = true;
                                break;
                            }
                        }
                    }
                }
                if (archive) {
                    filesToArchive.push({ filename: filename, filePath: results[i]});
                }
            }
            afterWalk(filesToArchive);
        });
    };

    ExecutorWorker.prototype.sendJobUpdate = function(jobInfo) {
        if (JobInfo.isFinishedStatus(jobInfo.status)) {
            this.availableProcessesContainer.availableProcesses += 1;
        }
        this.executorClient.updateJob(jobInfo, function (err) {
            if (err) {
                console.log(err); // TODO
            }
        });
        this.emit('jobUpdate', jobInfo);
    };

    ExecutorWorker.prototype.cancelJob = function () {

    };

    ExecutorWorker.prototype.checkForUnzipExe = function() {
        this.checkForUnzipExe = function() { };
        fs.exists(UNZIP_EXE, function (exists) {
            if (exists) {
            } else {
                alert("Unzip exe \"" + UNZIP_EXE + "\" does not exist. Please install it.");
            }
        });
    };

    ExecutorWorker.prototype.queryWorkerAPI = function (callback) {
        var self = this;
        self.checkForUnzipExe();

        var _queryWorkerAPI = function() {

            this.clientRequest.availableProcesses = this.availableProcessesContainer.availableProcesses;
            var req = superagent.post(self.executorClient.executorUrl + 'worker');
            if (this.executorClient.executorNonce) {
                req.set('x-executor-nonce', this.executorClient.executorNonce);
            }
            req
                //.set('Content-Type', 'application/json')
                //oReq.timeout = 25 * 1000;

                .send(self.clientRequest)
                .end(function (err, res) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (res.status > 399) {
                        callback('Server returned ' + res.status);
                    } else {
                        var response = JSON.parse(res.text);
                        //console.log(res.text)
                        var jobsToStart = response.jobsToStart;
                        for (var i = 0; i < jobsToStart.length; i++) {
                            self.executorClient.getInfo(jobsToStart[i], function (err, info) {
                                if (err) {
                                    // TODO
                                    this.availableProcessesContainer.availableProcesses += 1;
                                    return;
                                }
                                self.jobList[info.hash] = info;
                                self.availableProcessesContainer.availableProcesses -= 1;
                                self.emit('jobUpdate', info);
                                self.startJob(info, function (err) {
                                    logger.error(info.hash + " failed to run: " + err + ". Status: " + info.status);
                                    self.sendJobUpdate(info);
                                }, function(jobInfo, jobDir, executorConfig) {
                                    self.saveJobResults(jobInfo, jobDir, executorConfig);
                                });
                            });
                        }
                        for (var label in response.labelJobs) {
                            if (self.availableProcessesContainer.availableProcesses) {
                                if (response.labelJobs.hasOwnProperty(label) && !self.labelJobs.hasOwnProperty(label)) {
                                    self.labelJobs[label] = response.labelJobs[label];
                                    self.availableProcessesContainer.availableProcesses -= 1;
                                    (function (label) {
                                        var info = { hash: response.labelJobs[label] };
                                        self.startJob(info, function (err) {
                                            this.availableProcessesContainer.availableProcesses += 1;
                                            logger.error("Label job " + label + "(" + info.hash + ") failed to run: " + err + ". Status: " + info.status);
                                        }, function(jobInfo, jobDir, executorConfig) {
                                            this.availableProcessesContainer.availableProcesses += 1;
                                            if (jobInfo.status !== 'FAILED_TO_EXECUTE') {
                                                self.clientRequest.labels.push(label);
                                                logger.info("Label job " + label + " succeeded. Labels are " + JSON.stringify(self.clientRequest.labels));
                                            } else {
                                                logger.error("Label job " + label + "(" + info.hash + ") run failed: " + err + ". Status: " + info.status);
                                            }
                                        });
                                    })(label);
                                }
                            }
                        }

                        callback(null, response);
                    }

                });
        };
        if (self.clientRequest.clientId) {
            _queryWorkerAPI.call(self);
        } else {
            var child = child_process.execFile("hostname", [], {}, function (err, stdout, stderr) {
                self.clientRequest.clientId = (stdout.trim() || "unknown") + "_" + process.pid;
                _queryWorkerAPI.call(self);
            });
        }
    };

    return ExecutorWorker;
});

/**
 * Created by kevin on 7/14/2014.
 */

define('executor/ExecutorWorkerController',[], function () {
    var ExecutorWorkerController = function ($scope, worker) {
        this.$scope = $scope;
        this.$scope.jobs = { };
        this.worker = worker;

        this.initialize();
    };

    ExecutorWorkerController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    ExecutorWorkerController.prototype.initialize = function () {
        var self = this;
        if (self.worker) {
            self.worker.on('jobUpdate', function (jobInfo) {
                self.$scope.jobs[jobInfo.hash] = jobInfo;
                self.update();
            });
        } else {
            self.initTestData();
        }
    };

    ExecutorWorkerController.prototype.initTestData = function () {
        var self = this,
            i,
            statuses = [ 'CREATED', 'SUCCESS', 'FAILED_TO_EXECUTE', 'FAILED_TO_GET_SOURCE_METADATA', 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED',
                'FAILED_CREATING_SOURCE_ZIP', 'FAILED_UNZIP', 'FAILED_EXECUTOR_CONFIG', 'FAILED_TO_ARCHIVE_FILE', 'FAILED_TO_SAVE_JOINT_ARTIFACT', 'FAILED_TO_ADD_OBJECT_HASHES',
                'FAILED_TO_SAVE_ARTIFACT'];

        self.$scope.jobs = { };

        for (i = 0; i < 30; i += 1) {
            self.$scope.jobs['/' + i] = {
//                status: (i % 3) ? 'OK' : 'FAILED',
                hash: i,
                url: '',
                resultHash: i + 10000
            };

            self.$scope.jobs['/' + i].status = statuses[Math.floor(Math.random() * statuses.length)];
        }

    };

    return ExecutorWorkerController;
});

var nodeRequire = require;

if (typeof define !== 'undefined') {

    define('node_worker', [
        'eventDispatcher',
        'blob/BlobClient',
        'logManager',
        'executor/ExecutorWorker',
        'executor/JobInfo',
        'executor/ExecutorWorkerController',
        'url'
    ], function (eventDispatcher, BlobClient, logManager, ExecutorWorker, JobInfo, ExecutorWorkerController, url) {
        return function (webGMEUrl, tempPath, parameters) {
            var worker;
            var webGMEPort = url.parse(webGMEUrl).port || (url.parse(webGMEUrl).protocol === 'https:' ? 443 : 80);
            worker = new ExecutorWorker({
                server: url.parse(webGMEUrl).hostname,
                serverPort: webGMEPort,
                httpsecure: url.parse(webGMEUrl).protocol === 'https:',
                sessionId: undefined,
                availableProcessesContainer: availableProcessesContainer,
                workingDirectory: tempPath,
                executorNonce: parameters.executorNonce
            });

            console.log("Connecting to " + webGMEUrl);

            worker.queryWorkerAPI(function (err, response) {
                if (!err) {
                    console.log("Connected to " + webGMEUrl);
                }
                var refreshPeriod = 60 * 1000;
                var callback = function (err, response) {
                    if (err) {
                        console.log("Error connecting to " + webGMEUrl + " " + err);
                    } else {}
                    if (response && response.refreshPeriod) {
                        refreshPeriod = response.refreshPeriod;
                    }
                    var timeoutID = setTimeout(function () {
                        worker.queryWorkerAPI(callback);
                    }, refreshPeriod);
                };
                callback(err, response);
            });
        };
    });
}

if (nodeRequire.main === module) {
    var requirejs = require('./node_worker.classes.build').requirejs;

    [
        'superagent',
        'fs',
        'util',
        'events',
        'path',
        'child_process',
        'minimatch',
        'rimraf',
        'url'
    ].forEach(function (name) {
        requirejs.s.contexts._.defined[name] = nodeRequire(name);
    });

    GLOBAL.WebGMEGlobal = {
        getConfig: function () {
            return {};
        }
    } // server: config.server, serverPort: config.port, httpsecure: config.protocol==='https' }; } };

    var webGMEUrls = Object.create(null);
    var availableProcessesContainer = {
        availableProcesses: 1
    }; // shared among all ExecutorWorkers

    requirejs(['node_worker'], function (addWebGMEConnection) {
        var fs = nodeRequire('fs');

        function readConfig() {
            var config = {
                "http://localhost:8888": {}
            };
            try {
                var configJSON = fs.readFileSync('config.json', {
                    encoding: 'utf8'
                });
                config = JSON.parse(configJSON);
                if (Array.isArray(config)) {
                    var oldConfig = config;
                    config = {};
                    oldConfig.forEach(function (webGMEUrl) {
                        config[webGMEUrl] = {};
                    });
                } else if (typeof (config) === "string") {
                    config = {
                        config: {}
                    };
                } else {}
            } catch (e) {
                if (e.code !== "ENOENT") {
                    throw e;
                }
            }
            Object.getOwnPropertyNames(config).forEach(function (webGMEUrl) {
                    if (Object.prototype.hasOwnProperty.call(webGMEUrls, webGMEUrl)) {
                    } else {
                        webGMEUrls[webGMEUrl] = addWebGMEConnection(webGMEUrl, workingDirectory, config[webGMEUrl]);
                    }
                    // TODO: handle removing URL
                });
        }

        var workingDirectory = 'executor-temp';
        var rimraf = nodeRequire('rimraf');
        rimraf(workingDirectory, function (err) {
            if (err) {
                console.log('Could not delete working directory (' + workingDirectory + '), err: ' + err);
                process.exit(2);
            }

            readConfig();
            fs.watch("config.json", function () {
                setTimeout(readConfig, 200);
            }); // setTimeout: likely handle O_TRUNC of config.json (though `move config.json.tmp config.json` is preferred)
        });
    });

};
module.exports.require = require;
module.exports.requirejs = requirejs;
module.exports.define = define;