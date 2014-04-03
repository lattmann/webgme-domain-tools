/**
 * Created by Dana Zhang on 3/31/2014.
 */

define(['plugin/PluginConfig',
    'plugin/PluginBase',
    'plugin/PluginResult',
    'plugin/PetriNetExporter/PetriNetExporter/XMLWriter'], function (PluginConfig, PluginBase, PluginResult, XMLWriter) {
    'use strict';

    // TODO: to modify the base dir path in config.json to allow dependencies from other dirs

    var PetriNetExporterPlugin = function () {
        PluginBase.call(this);
    };

    PetriNetExporterPlugin.prototype = Object.create(PluginBase.prototype);

    PetriNetExporterPlugin.prototype.getName = function () {
        return 'PetriNetExporter';
    };

    PetriNetExporterPlugin.prototype.main = function (callback) {
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

        core.loadChildren(selectedNode, function(err, childNodes) {
            self.visitObject(err, childNodes, core, callback);
        });


        // TODO: extend XML writer to accept n numbers of attributes

        var xw = new XMLWriter;
        xw.startDocument();
        xw.startElement('root').writeAttribute('foo', 'value');

        xw.writeElement('bar', 'barbar').writeAttribute('foobar', 'value');
        xw.text('Some content');
        xw.endDocument();

        console.log(xw.toString());
    };

    PetriNetExporterPlugin.prototype.visitObject = function (err, childNodes, core, callback) {
        var self = this;

        this.objectToVisit += childNodes.length; // all child objects have to be visited

        var i;
        for (i = 0; i < childNodes.length; ++i) {
//            var name = core.getAttribute(childNodes[i], 'name');
//            this.logger.info('Visiting: ' + name);



            // TODO: get its META Type
            // Get position, Capacity, Initial Marking
            var child = childNodes[i];

            // get its base META Type
            var baseClass = core.getBase(child);
            if (baseClass) {
                var metaType = core.getAttribute(baseClass, 'name');
            }

            if (metaType === 'Place') {


            } else if (metaType === 'Transition') {


            } else if (metaType === 'Arc') {


            }


            var name = core.getAttribute(child, 'name'),
                capacity = core.getAttribute(child, 'Capacity'),
                marking = core.getAttribute(child, 'InitialMarking'),
                xPos = child.data.reg.position.x,
                yPos = child.data.reg.position.y;

            //    HEIGHT = isTypePlace ? 30 : 20; can we use META Aspect
//            var XMLS = new XMLSerializer();
//            var xw = new XMLWriter();

            // TODO: create JSON for each component, e.g. Place, Transition, Arc
            // TODO: convert JSON to xml

            // var js = document.createElement("place");

            core.loadChildren(childNodes[i], function(err, childNodes) {
                self.visitObject(err, childNodes, core, callback);
            });
        }

        this.visitedObjects += 1; // another object was just visited

        if (this.objectToVisit === this.visitedObjects) {
            this.fs.addFile('generatedFile.json', JSON.stringify({'name':'some content'}));
            this.fs.addFile('generatedFile.html', '<html><body>Hello world from an xml</body></html>');
            this.fs.saveArtifact();

            // all objects have been visited
            var pluginResult = new PluginResult();
            pluginResult.success = true;
            if (callback) {
                callback(null, pluginResult);
            }
        } else {
            // some objects still need to be visited
            this.logger.info('Visiting progress: ' + this.visitedObjects + '/' + this.objectToVisit);
        }
    };

    return PetriNetExporterPlugin;
});