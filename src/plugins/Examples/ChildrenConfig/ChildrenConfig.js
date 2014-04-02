/**
 * Created by pmeijer on 3/26/2014.
 */
define(['plugin/PluginConfig',
        'plugin/PluginBase',],
    function (PluginConfig, PluginBase) {
    'use strict';

    var ChildrenConfigPlugin = function () {
        // Call base class's constructor
        PluginBase.call(this);
    };

    ChildrenConfigPlugin.prototype = Object.create(PluginBase.prototype);

    ChildrenConfigPlugin.prototype.constructor = ChildrenConfigPlugin;

    ChildrenConfigPlugin.prototype.getName = function () {
        return "Children Config";
    };

    ChildrenConfigPlugin.prototype.getConfigStructure = function () {
        var configStructure = [
            {
                "name": "logChildrenNames",
                "displayName": "Log Children Names",
                "description": '',
                "value": true, // this is the 'default config'
                "valueType": "boolean",
                "readOnly": true
            },{
                "name": "logLevel",
                "displayName": "Logger level",
                "description": '',
                "value": "info",
                "valueType": "string",
                "valueItems": [
                    "debug",
                    "info",
                    "warn",
                    "error"
                ],
                "readOnly": false
            },{
                "name": "maxChildrenToLog",
                "displayName": "Maximum children to log",
                "description": 'Set this parameter to blabla',
                "value": 4,
                "min": 1,
                "valueType": "number",
                "readOnly": false
            },{
                "name": "whatIsYourName",
                "displayName": "Plugin owner",
                "description": '',
                "readOnly": true,
                "value": 'Patrik',
                "valueType": "string"
            }
        ];

        return configStructure;
    };

    ChildrenConfigPlugin.prototype.main = function (callback) {
        var core = this.core,
            activeNode = this.activeNode,
            self = this;

        // Example how to use FS
        self.fs.addFile('log.txt', 'hello');


        if (!activeNode) {
            callback('activeNode is not defined', this.result);
            return;
        }

        // TODO: check model

        self.logger.info('Current configuration');

        var currentConfig = this.getCurrentConfig();
        self.logger.info(currentConfig.logChildrenNames);
        self.logger.info(currentConfig.logLevel);
        self.logger.info(currentConfig.maxChildrenToLog);
        self.logger.info(currentConfig.whatIsYourName);


        core.loadChildren(activeNode, function (err, childNodes) {
            var i;
            self.logger.info(core.getAttribute(activeNode, 'name') + ' has children');

            for (i = 0; i < childNodes.length; i += 1) {

                self.createMessage(childNodes[i], 'Message text ' + i + ' element');

                self.logger.info('  ' + core.getAttribute(childNodes[i], 'name'));
            }


            if (callback) {
                // TODO: we need a function to set/update success
                self.result.success = true;

                self.fs.addFile('pluginResult.json', JSON.stringify(self.result.serialize()));
                self.fs.saveArtifact();
                callback(null, self.result);
            }
        });
    };


    return ChildrenConfigPlugin;
});
