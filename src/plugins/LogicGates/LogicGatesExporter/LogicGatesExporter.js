/**
 * Created by Dana Zhang on 3/31/2014.
 */

'use strict';

define(['plugin/PluginConfig',
        'plugin/PluginBase',
        'plugin/PluginResult',
        'json2xml'], function (PluginConfig, PluginBase, PluginResult, json2xml) {

    // TODO: to modify the base dir path in config.json? to allow dependencies from other dirs

    var LogicGatesExporterPlugin = function () {
        PluginBase.call(this);
    };

    LogicGatesExporterPlugin.prototype = Object.create(PluginBase.prototype);
    LogicGatesExporterPlugin.prototype.constructor = LogicGatesExporterPlugin;

    LogicGatesExporterPlugin.prototype.getName = function () {
        return 'LogicGatesExporter';
    };

    LogicGatesExporterPlugin.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            selectedNode = self.activeNode;

        var pluginResult = new PluginResult();

        if (!selectedNode) {
            callback('selectedNode is not defined', pluginResult);
        }

        // TODO: this is not the right way to do it..., but a way at least
        this.objectToVisit = 0; // number of objects that have to be visited
        this.visitedObjects = 0; // number of already visited

        this.objectToVisit += 1; // we need to visit the selected node

        this.diagramPath = "";

        this.modelID = 0;

        this.diagrams = {};
        this.circuits = [];
        this.ID_LUT = {};

        // only when node is diagram folder then traverse
        core.loadChildren(selectedNode, function(err, childNodes) {
            self.visitObject(err, childNodes, core, callback);
        });

    };

    LogicGatesExporterPlugin.prototype.visitObject = function (err, childNodes, core, callback) {
        var self = this;

        this.objectToVisit += childNodes.length; // all child objects have to be visited

        var i;
        for (i = 0; i < childNodes.length; ++i) {

            var child = childNodes[i];

            var parentPath = child.parent ? core.getPath(child.parent) : "";

            var baseClass = core.getBase(child),
                metaType = baseClass ? core.getAttribute(baseClass, 'name') : ""; // get child's base META Type

            var parentClass = core.getBase(child.parent);
            var parentMeta = parentClass ? core.getAttribute(parentClass, 'name') : "";
            var isComplex = parentMeta === "ComplexLogicGate";
            var isGate = parentMeta === 'ComplexLogicGate' || parentMeta === 'SimpleLogicGate' || parentMeta === 'NumericIOBase' || parentMeta === 'UserInputBase' || parentMeta === 'UserOutput';

            if (isGate) {

                // if key not exist already, add key; otherwise ignore
                var gmeID = core.getPath(child);

                if (!this.ID_LUT.hasOwnProperty(gmeID)) {

                    this.addGate(child, metaType, isComplex, parentPath);
                }

            } else if (metaType === 'PortConnection') {

                this.addWire(child);
            }

            core.loadChildren(childNodes[i], function(err, childNodes) {
                self.visitObject(err, childNodes, core, callback);
            });
        }

        this.visitedObjects += 1; // another object was just visited

        if (this.objectToVisit === this.visitedObjects) {

            this.createObjectFromDiagram();

            // all objects have been visited
            var pluginResult = new PluginResult();
            pluginResult.success = true;
            if (callback) {
                callback(null, pluginResult);
            }
        }
    };

    LogicGatesExporterPlugin.prototype.addGate = function(nodeObj, metaType, isComplex, parentPath) {

        var core = this.core,
            self = this,
            gmeID = core.getPath(nodeObj),
            name = core.getAttribute(nodeObj, 'name'),
            numInputs, // number of children
            xPos = nodeObj.data.reg.position.x,
            yPos = nodeObj.data.reg.position.y,
            angle;

        this.ID_LUT[gmeID] = this.modelID;

        // all logic gates component have attrs: Type, Name, ID
        //                                 element: Point (attrs: X, Y, Angle)

        var gate = {
            "@Type": metaType,
            "@Name": name,
            "@ID": self.modelID,
            "Point": {
                "@X": xPos,
                "@Y": yPos,
                "@Angle": angle
            }
        };

        // add domain specific attributes
        if (isComplex) {
            gate["@NumInputs"] = numInputs;

        } else if (metaType === "Clock") {
            var ms = core.getAttribute(nodeObj, 'Milliseconds');
            gate["@Milliseconds"] = ms;

        } else if (metaType === "NumericInput" || metaType === "NumericOutput") {
            var bits = core.getAttribute(nodeObj, 'Bits');
            var selRep = core.getAttribute(nodeObj, 'SelRep');
            var value = core.getAttribute(nodeObj, 'Value');
            gate["@Bits"] = bits;
            gate["@SelRep"] = selRep;
            gate["@Value"] = value;
        }
        if (!this.diagrams.hasOwnProperty(parentPath)) {
            this.diagrams[parentPath] = {
                "Gate": [],
                "Wire": []
            };
        }
        if (parentPath) {

            this.diagrams[parentPath]["Gate"].push(gate);
        }
        ++this.modelID;
    };

    LogicGatesExporterPlugin.prototype.addWire = function(nodeObj) {

        var core = this.core,
            self = this,
            src = core.getPointerPath(nodeObj, "src"),
            dst = core.getPointerPath(nodeObj, "dst");

        var srcMetaType,
            dstMetaType,
            srcPort,
            dstPort,
            srcID,
            dstID;

        core.loadByPath(self.rootNode, src, function (err, nodeObj) {
            if (!err) {
                // nodeObj is available to use and it is loaded.
                if (!self.ID_LUT.hasOwnProperty(src)) {
                    var baseClass = core.getBase(nodeObj);
                    var parentClass = core.getParent(baseClass);
                    var parentPath = core.getPath(nodeObj.parent);
                    var isComplex = core.getAttribute(parentClass, 'name') === "ComplexLogicGate";
                    srcMetaType = core.getAttribute(baseClass, 'name');
                    self.addGate(nodeObj, srcMetaType, isComplex, parentPath);

                    self.modelID++;
                }
            }
        });

        core.loadByPath(self.rootNode, dst, function (err, nodeObj) {
            if (!err) {
                // nodeObj is available to use and it is loaded.
                if (!self.ID_LUT.hasOwnProperty(dst)) {
                    var parentClass = core.getBase(nodeObj.parent);
                    var parentPath = core.getPath(nodeObj.parent);
                    var isComplex = core.getAttribute(parentClass, 'name') === "ComplexLogicGate";
                    dstMetaType = core.getAttribute(core.getBase(nodeObj), 'name');
                    self.addGate(nodeObj, dstMetaType, isComplex, parentPath);

                    self.modelID++;
                }
            }
        });

        // Wire component's elements: From (attrs: ID, Port), To (attrs: ID, Port)

        var parentPath = core.getPath(nodeObj.parent);
        var wire = {
            "From": {
                "@ID": srcID,
                "@Port": srcPort
            },
            "To": {
                "@ID": dstID,
                "@Port": dstPort
            }
        };
        if (!this.diagrams.hasOwnProperty(parentPath)) {
            this.diagrams[parentPath] = {
                "Gate": [],
                "Wire": []
            };
        }
//
//        var name;
//        core.loadByPath(self.rootNode, parentPath, function (err, parent) {
//            if (!err) {
//                // nodeObj is available to use and it is loaded.
//                name = core.getAttribute(parent, 'name');
//            }
//        });
        if (parentPath) {
            this.diagrams[parentPath]["Wire"].push(wire);
        }
    };

    LogicGatesExporterPlugin.prototype.createObjectFromDiagram = function () {

        var i = 0;
        for (var parentPath in this.diagrams) {
            if (this.diagrams.hasOwnProperty(parentPath)) {
                var diagram = {"CircuitGroup":
                    {
                        "@Version": 1.2,
                        "Circuit" :
                        {
                            "Gates": {},
                            "wires": {}
                        }
                    }
                };
                diagram.CircuitGroup.Circuit.Gates["Gate"] = this.diagrams[parentPath]["Gate"];
                diagram.CircuitGroup.Circuit.Gates["Wire"] = this.diagrams[parentPath]["Wire"];
                this.circuits.push(diagram);
                var j2x = new json2xml;
                var output = j2x.convert(diagram);
                this.fs.addFile("output" + i + ".xml", output);
            }
        }


        this.fs.saveArtifact();
    };

    return LogicGatesExporterPlugin;
});