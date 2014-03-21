/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define(['./PluginBase', './PluginContext'], function (PluginBase, PluginContext) {

    var PluginManagerBase = function (storage, Core, plugins) {

        this._Core = Core;       // webgme core is used to operate on objects
        this._storage = storage; // webgme storage
        this._plugins = plugins; // key value pair of pluginName: pluginType - plugins are already loaded/downloaded
    };

    PluginManagerBase.prototype.initialize = function (managerConfiguration, callback) {

    };

    /**
     * Gets a new instance of a plugin by name.
     * @param {string} name
     * @returns {PluginBase}
     */
    PluginManagerBase.prototype.getPluginByName = function (name) {
        return this._plugins[name];
    };

    PluginManagerBase.prototype.loadMetaNodes = function (pluginContext, callback) {
        // get meta members
        var metaIDs = pluginContext.core.getMemberPaths(pluginContext.rootNode, 'MetaAspectSet');

        var len = metaIDs.length;

        var nodeObjs = [];


        var allObjectsLoadedHandler = function () {
            var len2 = nodeObjs.length;

            var nameObjMap = {};

            while (len2--) {
                var nodeObj = nodeObjs[len2];

                nameObjMap[pluginContext.core.getAttribute(nodeObj, 'name')] = nodeObj;
            }

            pluginContext.META = nameObjMap;
            callback(null, pluginContext);
        };

        var loadedMetaObjectHandler = function (err, nodeObj) {
            nodeObjs.push(nodeObj);

            if (nodeObjs.length === metaIDs.length) {
                allObjectsLoadedHandler();
            }
        };

        while (len--) {
            pluginContext.core.loadByPath(pluginContext.rootNode, metaIDs[len], loadedMetaObjectHandler);
        }
    };

    /**
     *
     * @param {PluginManagerConfiguration} managerConfiguration
     * @param {function} callback
     */
    PluginManagerBase.prototype.getPluginContext = function (managerConfiguration, callback) {

        var self = this;

        this._storage.openDatabase(function(err) {
            console.log('database is open');

            if (!err) {
                self._storage.openProject(managerConfiguration.project, function(err, project){
                    if(!err){
                        var pluginContext =  new PluginContext();

                        // TODO: initialize context

                        // TODO: based on the string values get the node objects
                        // 1) Open project
                        // 2) Load commit hash
                        // 3) Load rootNode
                        // 4) Load selected object
                        // 5) Load selected objects
                        // 6) Update context
                        // 7) return

                        //callback(null, pluginContext);

                        pluginContext.project = project;
                        pluginContext.projectName = managerConfiguration.project;
                        pluginContext.core = new self._Core(pluginContext.project,{corerel:2});
                        pluginContext.commitHash = managerConfiguration.commit;
                        pluginContext.selected = managerConfiguration.selected;

                        var loadCommitHashAndRun = function (commitHash) {
                            pluginContext.project.loadObject(commitHash, function(err, commitObj) {
                                if(!err && commitObj !== null && commitObj !== undefined){
                                    pluginContext.core.loadRoot(commitObj.root, function(err, rootNode) {
                                        if(!err){
                                            pluginContext.rootNode = rootNode;
                                            if(typeof pluginContext.selected === 'string'){
                                                pluginContext.core.loadByPath(pluginContext.rootNode, pluginContext.selected, function (err, selectedNode) {
                                                    if(!err){
                                                        pluginContext.selectedNode = selectedNode;
                                                        self.loadMetaNodes(pluginContext, callback);
                                                    } else {
                                                        callback("unable to load selected object", pluginContext);
                                                    }
                                                });
                                            } else {
                                                pluginContext.selectedNode = null;
                                                self.loadMetaNodes(pluginContext, callback);
                                            }
                                        } else {
                                            callback("unable to load root", pluginContext);
                                        }
                                    });
                                } else {
                                    callback('cannot find commit', pluginContext);
                                }

                            });
                        };

                        if (managerConfiguration.branchName) {
                            pluginContext.project.getBranchNames(function (err, branchNames) {
                                console.log(branchNames);
                                if (branchNames.hasOwnProperty(managerConfiguration.branchName)) {
                                    pluginContext.commitHash = branchNames[managerConfiguration.branchName];
                                    console.log(pluginContext.commitHash);
                                    loadCommitHashAndRun(pluginContext.commitHash);
                                } else {
                                    callback('cannot find branch', pluginContext);
                                }
                            });
                        } else {
                            loadCommitHashAndRun(pluginContext.commitHash);
                        }


                    } else {
                        callback("cannot openproject", pluginContext);
                    }
                });
            } else {
                callback("cannot open database", pluginContext);
            }
        });
    };

    PluginManagerBase.prototype.executePlugin = function (name, managerConfiguration, done) {
        var Plugin = this.getPluginByName(name);
        var plugin = new Plugin();

        // TODO: if automation - get last config
        var pluginConfig = Plugin.getDefaultConfig();

        // TODO: plugin.doInteractiveConfig

        this.getPluginContext(managerConfiguration, function (err, pluginContext) {
            if (err) {
                done(err, null);
            } else {
                pluginContext.setConfig(pluginConfig);

                // TODO: provide implementation here
                plugin.main(pluginContext, function (err, result) {
                    done(err, result);
                });
            }
        });
    };


    return PluginManagerBase;
});