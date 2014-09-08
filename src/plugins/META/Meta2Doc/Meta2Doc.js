/**
* Generated by PluginGenerator from webgme on Fri Sep 05 2014 15:31:19 GMT-0500 (Central Daylight Time).
*/

define(['plugin/PluginConfig',
    'plugin/PluginBase'],
    function (PluginConfig, PluginBase) {
    'use strict';

    /**
    * Initializes a new instance of Meta2Doc.
    * @class
    * @augments {PluginBase}
    * @classdesc This class represents the plugin Meta2Doc.
    * @constructor
    */
    var Meta2Doc = function () {
        // Call base class' constructor.
        PluginBase.call(this);

        this.LanguageElements = {};
    };

    // Prototypal inheritance from PluginBase.
    Meta2Doc.prototype = Object.create(PluginBase.prototype);
    Meta2Doc.prototype.constructor = Meta2Doc;

    /**
    * Gets the name of the Meta2Doc.
    * @returns {string} The name of the plugin.
    * @public
    */
    Meta2Doc.prototype.getName = function () {
        return "Meta2Doc";
    };

    /**
    * Gets the semantic version (semver.org) of the Meta2Doc.
    * @returns {string} The version of the plugin.
    * @public
    */
    Meta2Doc.prototype.getVersion = function () {
        return "0.1.0";
    };

    /**
    * Gets the description of the Meta2Doc.
    * @returns {string} The description of the plugin.
    * @public
    */
    Meta2Doc.prototype.getDescription = function () {
        return "Generate Language Documentation from MetaModel";
    };

    /**
    * Main function for the plugin to execute. This will perform the execution.
    * Notes:
    * - Always log with the provided logger.[error,warning,info,debug].
    * - Do NOT put any user interaction logic UI, etc. inside this method.
    * - callback always has to be called even if error happened.
    *
    * @param {function(string, plugin.PluginResult)} callback - the result callback
    */
    Meta2Doc.prototype.main = function (callback) {
        var self = this;

        self.logger.info("Running Meta2Doc");

        var documentationArtifact = self.blobClient.createArtifact('FMU');

        self.getMetaRelationships();

        self.result.setSuccess(true);
        self.save('added obj', function (err) {
            callback(null, self.result);
        });

    };

    Meta2Doc.prototype.getMetaRelationships = function () {
        var self = this,
            metaElementName,
            metaElementNode,
            baseClasses;

        for (metaElementName in self.META) {
            if (self.META.hasOwnProperty(metaElementName)) {
                metaElementNode = self.META[metaElementName];

                self.logger.info("HERE:" + metaElementName);
                self.createMessage(metaElementNode , metaElementName);

                self.LanguageElements[metaElementName] = self.makeNewElementDoc(metaElementNode);
            }
        }

    };

    Meta2Doc.prototype.makeNewElementDoc = function (metaNode) {
        var self = this,
            elementDoc = {
                "Name": null,
                "DisplayedName": null,
                "Role": null,
                "Type": null,
                "GUID": null,
                "Description": null,
                "Namespace": null,
                "IsAbstract": null,
                "IsImmediate": null,
                "Visualization": null,
                "Attributes": [],
                "BaseClasses": [],
                "DerivedClasses": [],
                "ParentContainerClasses": [],
                "ChildClasses": [],
                "ReferredClasses": [],
                "ReferringClasses": [],
                "OutgoingConnectionClasses": [],
                "IncomingConnectionClasses": [],
                "SourceClasses": [],
                "DestinationClasses": []
            };

        return elementDoc;
    };

    Meta2Doc.prototype.makeNewAttributeDoc = function (metaNode) {
        var self = this,
            attributeDoc = {
                "Name": null,
                "Type": null,
                "DefaultValue": null,
                "EnumOptions": null,
                "GUID": null,
                "Description": null,
                "Namespace": null,
                "IsImmediate": null,
                "Help": null
            };

        return attributeDoc;
    };

    return Meta2Doc;
});