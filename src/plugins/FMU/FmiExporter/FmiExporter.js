/**
* Generated by PluginGenerator from webgme on Wed Apr 16 2014 16:05:02 GMT-0500 (Central Daylight Time).
*/

define(['plugin/PluginConfig',
        'plugin/PluginBase',
        'plugin/FmiExporter/FmiExporter/FMU',
        'plugin/FmiExporter/FmiExporter/tarjan',
        'plugin/FmiExporter/FmiExporter/Templates/Templates',
        'ejs',
        'executor/ExecutorClient'], function (PluginConfig, PluginBase, FmuMetaTypes, Tarjan, TEMPLATES, ejs, ExecutorClient) {
    // PM: This change saves you one indent (or JSLint complaints for each method).
    'use strict';

    /**
    * Initializes a new instance of FmiExporter.
    * @class
    * @augments {PluginBase}
    * @classdesc This class represents the plugin FmiExporter.
    * @constructor
    */
    var FmiExporter = function () {
        // Call base class' constructor.
        PluginBase.call(this);

        this.pathToFmuInfo = {};
        this.priorityMap = {};
        this.pathToTarjansVertex = {};
        this.nodeCount = 0;
        this.path2node = {};
        this.fmuPackageHashMap = {};
        this.connectionMap = {};
        this.connections = [];
        this.simulationInfo = {
            'StartTime': 0,
            'StopTime': 1,
            'StepSize': 0.001
        };
        this.modelExchangeConfig = {
            'Connections': null,
            'PriorityMap': null,
            'FMUs': null,
            'SimulationInfo': null
        };
        this.filesToSave = {};
    };

    // Prototype inheritance from PluginBase.
    FmiExporter.prototype = Object.create(PluginBase.prototype);
    FmiExporter.prototype.constructor = FmiExporter;

    /**
    * Gets the name of the FmiExporter.
    * @returns {string} The name of the plugin.
    * @public
    */
    FmiExporter.prototype.getName = function () {
        return 'FMI ModelExchange Exporter';
    };

    /**
    * Gets the description of the FmiExporter.
    * @returns {string} The description of the plugin.
    * @public
    */
    FmiExporter.prototype.getDescription = function () {
        return 'Generates a model_exchange_config.json for simulating a FMI system';
    };

    /**
    * Gets the semantic version (semver.org) of the FmiExporter.
    * @returns {string} The version of the plugin.
    * @public
    */
    FmiExporter.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the ExecutionPackageGeneration.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    FmiExporter.prototype.getConfigStructure = function () {
        return [
            {
                'name': 'createAndExecuteJob',
                'displayName': "Run FMI Simulation",
                'description': "Run FMI Model Exchange Simulation",
                'value': true,
                'valueType': 'boolean',
                'readOnly': false
            }
        ];
    };

    FmiExporter.prototype.main = function (callback) {
        var self = this,
            selectedNode = self.activeNode,
            config = self.getCurrentConfig(),
            modelExchangeNode,
            modelExchangeName;

        if (!selectedNode) {
            callback('selectedNode is not defined', self.result);
            return;
        }

        this.updateMETA(FmuMetaTypes);

        if (self.isMetaTypeOf(selectedNode, FmuMetaTypes.ModelExchange)) {
            modelExchangeNode = selectedNode;
            modelExchangeName = self.core.getAttribute(modelExchangeNode, 'name');
            self.nodeCount +=1;
        } else {
            callback('SelectedNode is not a ModelExchange!', self.result);
            return;
        }

        var allNodesAreLoadedCallbackFunction = function (err) {
            if (err) {
                var msg = 'Something went wrong getting loading child nodes';
                self.logger.error(msg);
                return callback(msg, self.result);
            }

            self.buildModelExchangeConfig();
            self.runTarjansAlgorithm();

            var artifactIsReadyCallbackFunction = function (err, executionArtifact) {
                var artifactSaveCallback = function (err, executionArtifactHash) {
                    if (err) {
                        self.result.setSuccess(false);
                        return callback(err, self.result);
                    }

                    if (config.createAndExecuteJob) {
                        var runSimulationCallback = function (err, simulationResultHashes) {
                            if (err) {
                                self.result.setSuccess(false);
                                return callback(err, self.result);
                            }

                            var updateSaveModelCallback = function (err) {
                                self.save("Execution was successful!", function (err) {
                                    if (err) {
                                        self.result.setSuccess(false);
                                        callback(err, self.result);
                                    }

                                    self.result.setSuccess(true);
                                    callback(null, self.result);
                                });                            };

                            if (simulationResultHashes.hasOwnProperty('results')) {
                                self.updateModelResultAssets(simulationResultHashes.results, updateSaveModelCallback);
                            } else {
                                updateSaveModelCallback(null);
                            }
                        };

                        self.createAndExecuteJob(modelExchangeNode, executionArtifactHash, runSimulationCallback);
                    } else {
                        self.logger.info('Execution Artifact Hash: ' + executionArtifactHash);
                        self.result.addArtifact(executionArtifactHash);
                        self.save("Simulation package generated.", function (err) {
                            if (err) {
                                self.result.setSuccess(false);
                                callback(err, self.result);
                            }
                            self.result.setSuccess(true);
                            callback(null, self.result);
                        });
                    }
                };

                executionArtifact.save(artifactSaveCallback);
            };
            self.generateExecutionArtifact(modelExchangeName, artifactIsReadyCallbackFunction);
        };
        self.loadAllNodesRecursive(modelExchangeNode, null, allNodesAreLoadedCallbackFunction);
    };

    FmiExporter.prototype.generateExecutionArtifact = function (modelExchangeName, callback) {
        var self = this,
            executionArtifact = self.blobClient.createArtifact(modelExchangeName),
            executor_config = {
                cmd: 'run_execution.cmd',
                resultArtifacts: [
                    {
                        name: 'all',
                        resultPatterns: []
                    },
                    {
                        name: 'table',
                        resultPatterns: ['Results/results.csv']
                    },
                    {
                        name: 'plots',
                        resultPatterns: ['Results/*.svg']
                    },
                    {
                        name: 'results',
                        resultPatterns: ['Results/**', 'jmodelica_model_exchange_py.log']
                    }
                ]
            };

        self.modelExchangeConfig.Connections = self.connectionMap;
        self.modelExchangeConfig.PriorityMap = self.priorityMap;
        self.modelExchangeConfig.FMUs = self.pathToFmuInfo;
        self.modelExchangeConfig.SimulationInfo = self.simulationInfo;

        self.filesToSave['model_exchange_config.json'] = JSON.stringify(self.modelExchangeConfig, null, 4);
        self.filesToSave['executor_config.json'] = JSON.stringify(executor_config, null, 4);
        self.filesToSave['fmi_wrapper.py'] = ejs.render(TEMPLATES['fmi_wrapper.py.ejs']);
        self.filesToSave['jmodelica_model_exchange.py'] = ejs.render(TEMPLATES['jmodelica_model_exchange.py.ejs']);
        self.filesToSave['run_execution.cmd'] = ejs.render(TEMPLATES['run_jmodelica_model_exchange.cmd.ejs']);
        self.filesToSave['ReadMe.txt'] = ejs.render(TEMPLATES['ReadMe.txt.ejs']);

        var addFilesCallback = function (err, fileHashes) {
            if (err) {
                self.result.setSuccess(false);
                return callback(err, self.result);
            }

            var i,
                fmuPathWithinArtifact,
                fmuHash,
                fmuPackageHashMapKeys = Object.keys(self.fmuPackageHashMap),
                addHashesError,
                addHashesCounter = fmuPackageHashMapKeys.length;

            var addHashCounterCallback = function (addHashCallbackError, addedHash) {
                if (addHashCallbackError) {
                    addHashesError += addHashCallbackError;
                }

                fileHashes.push(addedHash);
                addHashesCounter -= 1;

                if (addHashesCounter === 0) {
                    if (addHashesError) {
                        self.result.setSuccess(false);
                        callback(addHashesError, self.result);
                    } else {
                        callback(addHashesError, executionArtifact);
                    }
                }
            };

            for (i = 0; i < fmuPackageHashMapKeys.length; i += 1) {
                fmuPathWithinArtifact = fmuPackageHashMapKeys[i];
                fmuHash = self.fmuPackageHashMap[fmuPathWithinArtifact];
                executionArtifact.addObjectHash(fmuPathWithinArtifact, fmuHash, addHashCounterCallback);
            }
        };

        executionArtifact.addFiles(self.filesToSave, addFilesCallback);
    };

    FmiExporter.prototype.createAndExecuteJob = function (modelExchangeNode, executionPackageHash, callback) {
        var self = this,
            executorClient = new ExecutorClient(),
            createJobCallback = function (err, createdJobInfo) {
                if (err) {
                    self.result.setSuccess(false);
                    return callback('Creating job failed: ' + err.toString(), self.result);
                }
                self.logger.debug(createdJobInfo);

                var onJobSuccess = function (completedJobInfo) {

                        for (var key in completedJobInfo.resultHashes) {
                            if (completedJobInfo.resultHashes.hasOwnProperty(key)) {
                                self.result.addArtifact(completedJobInfo.resultHashes[key]);
                            }
                        }

                        callback(null, completedJobInfo.resultHashes);

                    },
                    intervalId = setInterval(function () {
                        // Get the job-info at intervals and check for a non-CREATED status.

                        var getInfoCallback = function (err, jobInfo) {
                            if (err) {
                                return callback(err, null);
                            }

                            self.logger.info(JSON.stringify(jobInfo, null, 4));
                            if (jobInfo.status === 'CREATED' || jobInfo.status === 'RUNNING') {
                                // The job is still running...
                                return;
                            }

                            clearInterval(intervalId);
                            if (jobInfo.status === 'SUCCESS') {
                                onJobSuccess(jobInfo);
                            } else {
                                callback('Job execution failed', null);
                            }
                        };

                        executorClient.getInfo(executionPackageHash, getInfoCallback);
                    }, 400);
            };

        executorClient.createJob(executionPackageHash, createJobCallback);
    };

    FmiExporter.prototype.updateModelResultAssets = function (resultFileHash, callback) {
        var self = this;

        var blobGetMetadataCallback = function (err, metadata) {
            if (err) {
                return callback(err);
            }

            var metadataContent = metadata.content,
                plotMapFileHash = metadataContent["Results/plot_map.json"].content,
                plotMapString,
                plotMap,
                plotFileName,
                plotSoftLink,
                nodeObject;

            var ab2str_arraymanipulation = function (buf) {
                var bufView = new Uint8Array(buf);
                var unis = [];
                for (var i = 0; i < bufView.length; i++) {
                    unis.push(bufView[i]);
                }
                return String.fromCharCode.apply(null, unis);
            };

            var blobGetPlotMapObjectCallback = function (err, content) {
                if (err) {
                    return callback(err);
                }

                plotMapString = ab2str_arraymanipulation(content);
                plotMap = JSON.parse(plotMapString);

                for (var objectPath in plotMap) {
                    if (plotMap.hasOwnProperty(objectPath)) {
                        plotFileName = plotMap[objectPath];
                        plotSoftLink = metadataContent["Results/" + plotFileName].content;
                        nodeObject = self.path2node[objectPath];
                        self.core.setAttribute(nodeObject, "svg", plotSoftLink);
                        self.logger.debug("Set svg for " + self.core.getAttribute(nodeObject, "name"));
                    } else {
                        self.logger.error("Could not set svg for " + objectPath);
                    }
                }

                callback(null);
            };

            self.blobClient.getObject(plotMapFileHash, blobGetPlotMapObjectCallback);
        };

        self.blobClient.getMetadata(resultFileHash, blobGetMetadataCallback);
    };

    FmiExporter.prototype.buildModelExchangeConfig = function () {
        var self = this,
            thisNode,
            thisNodeName,
            thisNodePath,
            parentFmuPath,
            connSrcPath,
            connDstPath,
            isFmu,
            isParam,
            isInput,
            isOutput;

        for (thisNodePath in self.path2node) {
            if (self.path2node.hasOwnProperty(thisNodePath)) {
                thisNode = self.path2node[thisNodePath];
                thisNodeName = self.core.getAttribute(thisNode, 'name');

                // DEBUG
                isFmu = self.isMetaTypeOf(thisNode, FmuMetaTypes.FMU);
                isParam = self.isMetaTypeOf(thisNode, FmuMetaTypes.Parameter);
                isInput = self.isMetaTypeOf(thisNode, FmuMetaTypes.Input);
                isOutput = self.isMetaTypeOf(thisNode, FmuMetaTypes.Output);
                //

                if (self.isMetaTypeOf(thisNode, FmuMetaTypes.PortComposition)) {

                    connSrcPath = self.core.getPointerPath(thisNode, 'src');
                    connDstPath = self.core.getPointerPath(thisNode, 'dst');

                    if (connSrcPath && connDstPath) {
                        if (self.connectionMap.hasOwnProperty(connSrcPath)) {
                            self.connectionMap[connSrcPath].push(connDstPath);   // append to existing list of destinations

                        } else {
                            self.connectionMap[connSrcPath] = [connDstPath];
                        }
                    } else {
                        var portCompositionPath = self.core.getPath(thisNode);
                        self.logger.warning('PortComposition (' + portCompositionPath + ') is missing a SrcPointer or DstPointer.');
                    }

                } else if (isFmu) {
                    if (!self.pathToFmuInfo.hasOwnProperty(thisNodePath)) {
                        self.getFmuInfo(thisNodePath, thisNode, thisNodeName);
                    }

                } else if (isParam) {
                    parentFmuPath = self.getParentPath(thisNodePath);

                    if (!self.pathToFmuInfo.hasOwnProperty(parentFmuPath)) {
                        self.getFmuInfo(parentFmuPath);
                    }

                    self.pathToFmuInfo[parentFmuPath].Parameters[thisNodeName] = self.core.getAttribute(thisNode, 'value');

                } else if (isInput) {
                    parentFmuPath = self.getParentPath(thisNodePath);

                    if (!self.pathToFmuInfo.hasOwnProperty(parentFmuPath)) {
                        self.getFmuInfo(parentFmuPath);
                    }

                    self.pathToFmuInfo[parentFmuPath].Inputs[thisNodePath] = thisNodeName;

                } else if (isOutput) {
                    parentFmuPath = self.getParentPath(thisNodePath);

                    if (!self.pathToFmuInfo.hasOwnProperty(parentFmuPath)) {
                        self.getFmuInfo(parentFmuPath);
                    }

                    self.pathToFmuInfo[parentFmuPath].Outputs[thisNodePath] = thisNodeName;

                } else if (self.isMetaTypeOf(thisNode, FmuMetaTypes.SimulationParameter)) {
                    if (self.simulationInfo.hasOwnProperty(thisNodeName)) {
                        self.simulationInfo[thisNodeName] = self.core.getAttribute(thisNode, 'value');
                    }
                }
            }
        }
    };

    FmiExporter.prototype.getFmuInfo = function (fmuNodePath, fmuNode, fmuNodeName) {
        var self = this;
        fmuNode = fmuNode || self.path2node(fmuNodePath);
        fmuNodeName = fmuNodeName || self.core.getAttribute(fmuNode, 'name');

        var fmuInstanceAssetHash = self.core.getAttribute(fmuNode, 'resource'),
            fmuBaseNode = self.core.getBase(fmuNode),
            fmuBaseName = self.core.getAttribute(fmuBaseNode, 'name'),
            fmuBaseAssetHash = self.core.getAttribute(fmuBaseNode, 'resource'),
            fmuInfo = {
                'InstanceName': fmuNodeName,
                'NodePath': fmuNodePath,
                'Parameters': {},
                'Inputs': {},
                'Outputs': {},
                'File': '',
                'Asset': ''
            };

        self.pathToTarjansVertex[fmuNodePath] = new Tarjan.Vertex(fmuNodePath);

        if (fmuInstanceAssetHash === fmuBaseAssetHash) {
            fmuInfo.File = 'FMUs/' + fmuBaseName + '.fmu';
            fmuInfo.Asset = self.core.getAttribute(fmuBaseNode, 'resource');
        } else {
            fmuInfo.File = 'FMUs/' + fmuNodeName + '.fmu';
            fmuInfo.Asset = self.core.getAttribute(fmuNode, 'resource');
        }

        self.fmuPackageHashMap[fmuInfo.File] = fmuInfo.Asset;
        self.pathToFmuInfo[fmuNodePath] = fmuInfo;
    };

    FmiExporter.prototype.getParentPath = function (childPath) {
        var splitPath = childPath.split('/'),
            slicedPath = splitPath.slice(0, -1);

        return slicedPath.join('/');
    };

    FmiExporter.prototype.loadAllNodesRecursive = function (parentNode, errors, callback) {
        var self = this,
            loadChildrenCallbackFunction;

        loadChildrenCallbackFunction = function (err, children) {
            if (err) {
                errors += err;
            }

            self.nodeCount -= 1;

            var childNodes = children;
            self.nodeCount += childNodes.length;

            if (self.nodeCount === 0) {
                callback(errors);
            }

            for (var i = 0; i < childNodes.length; i += 1) {
                self.path2node[self.core.getPath(childNodes[i])] = childNodes[i];
                self.loadAllNodesRecursive(childNodes[i], errors, callback);
            }
        };

        self.core.loadChildren(parentNode, loadChildrenCallbackFunction);
    };

    FmiExporter.prototype.runTarjansAlgorithm = function() {
        var self = this,
            tarjansVertex,
            tarjansVertices = [],
            fmuInfo,
            fmuTargetPath,
            connectedInputs,
            ithConnectedInput,
            i;


        for (var fmuPath in self.pathToTarjansVertex) {
            if (self.pathToTarjansVertex.hasOwnProperty(fmuPath)) {
                fmuInfo = self.pathToFmuInfo[fmuPath];
                tarjansVertex = self.pathToTarjansVertex[fmuPath];

                for (var outputPath in fmuInfo.Outputs) {
                    if (fmuInfo.Outputs.hasOwnProperty(outputPath) &&
                        self.connectionMap.hasOwnProperty(outputPath)) {
                        connectedInputs = self.connectionMap[outputPath];

                        for (i = 0; i < connectedInputs.length; i += 1) {
                            ithConnectedInput = connectedInputs[i];

                            fmuTargetPath = self.getParentPath(ithConnectedInput);
                            tarjansVertex.connectTo(self.pathToTarjansVertex[fmuTargetPath]);
                        }
                    }
                }

                tarjansVertices.push(tarjansVertex);
            }
        }

        var tarjansGraph = new Tarjan.Graph(tarjansVertices),
            tarjansAlgorithm = new Tarjan.Tarjan(tarjansGraph),
            tarjansScc = tarjansAlgorithm.run();

        for (i = 0; i < tarjansScc.length; i += 1) {
            if (tarjansScc[i].length === 1) {
                self.priorityMap[tarjansScc.length - i] = tarjansScc[i][0].name;

            } else {
                self.logger.error("Tarjan's algorithm detected a loop with fmu " + tarjansScc[i][0].name);
                self.result.setSuccess(false);
                return;
            }
        }
    };

    return FmiExporter;
});

