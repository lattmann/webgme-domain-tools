/* Generated file based on ejs templates */
define([], function() {
    return {
    "combine_templates.js.ejs": "/*\r\n * Copyright (C) 2014 Vanderbilt University, All rights reserved.\r\n *\r\n * Author: Zsolt Lattmann, Patrik Meijer\r\n *\r\n * This script will combine all ejs files in the current directory (recursively)\r\n * into one Templates.js file. By importing this file as TEMPLATE you can retrieve the\r\n * content of each original ejs file through TEMPLATES['plugin.js.ejs'].\r\n *\r\n * Usage: Run this script in the directory with the ejs-templates, e.g. '%YourPlugin%/Templates'.\r\n */\r\n\r\nvar main = function () {\r\n    'use strict';\r\n    var fs = require('fs'),\r\n        path = require('path'),\r\n        walk = require('walk'),\r\n        walker  = walk.walk('.', { followLinks: false }),\r\n        files = {},\r\n        content = {},\r\n        templateContent;\r\n\r\n    walker.on('file', function (root, stat, next) {\r\n        // Add this file to the list of files\r\n        if (path.extname(stat.name) === '.ejs') {\r\n            files[stat.name] = root + '/' + stat.name;\r\n            content[stat.name] = fs.readFileSync(root + '/' + stat.name, {'encoding': 'utf-8'});\r\n        }\r\n        next();\r\n    });\r\n\r\n    walker.on('end', function () {\r\n        console.log(files);\r\n        console.log(content);\r\n\r\n        templateContent = '';\r\n        templateContent += '/* Generated file based on ejs templates */\\r\\n';\r\n        templateContent += 'define([], function() {\\r\\n';\r\n        templateContent += '    return ' + JSON.stringify(content, null, 4);\r\n        templateContent += '});';\r\n\r\n        fs.writeFileSync('Templates.js', templateContent);\r\n    });\r\n};\r\n\r\nif (require.main === module) {\r\n    main();\r\n}",
    "plugin.js.ejs": "/**\r\n* Generated by PluginGenerator from webgme on <%= date %>.\r\n*/\r\n\r\ndefine(['plugin/PluginConfig', 'plugin/PluginBase'<%if (templateType) {%>, 'ejs', 'plugin/<%=pluginID%>/<%=pluginID%>/Templates/Templates'<%}%>], function (PluginConfig, PluginBase<%if (templateType) {%>, EJS, TEMPLATES<%}%>) {\r\n    'use strict';\r\n\r\n    /**\r\n    * Initializes a new instance of <%= pluginID %>.\r\n    * @class\r\n    * @augments {PluginBase}\r\n    * @classdesc This class represents the plugin <%= pluginID %>.\r\n    * @constructor\r\n    */\r\n    var <%= pluginID %> = function () {\r\n        // Call base class' constructor.\r\n        PluginBase.call(this);\r\n    };\r\n\r\n    // Prototypal inheritance from PluginBase.\r\n    <%= pluginID %>.prototype = Object.create(PluginBase.prototype);\r\n    <%= pluginID %>.prototype.constructor = <%= pluginID %>;\r\n<%if (templateType) {%>\r\n    if (!ejs) {\r\n        ejs = EJS || window.ejs;\r\n    }\r\n<%}%>\r\n    /**\r\n    * Gets the name of the <%= pluginID %>.\r\n    * @returns {string} The name of the plugin.\r\n    * @public\r\n    */\r\n    <%= pluginID %>.prototype.getName = function () {\r\n        return \"<%= pluginName %>\";\r\n    };<% if (description) {%>\r\n\r\n    /**\r\n    * Gets the description of the <%= pluginID %>.\r\n    * @returns {string} The description of the plugin.\r\n    * @public\r\n    */\r\n    <%= pluginID %>.prototype.getDescription = function () {\r\n        return \"<%= description %>\";\r\n    };<%} if (hasVersion) {%>\r\n\r\n    /**\r\n    * Gets the semantic version (semver.org) of the <%= pluginID %>.\r\n    * @returns {string} The version of the plugin.\r\n    * @public\r\n    */\r\n    <%= pluginID %>.prototype.getVersion = function () {\r\n        return \"0.1.0\";\r\n    };<%} if (configStructure) {%>\r\n\r\n    /**\r\n    * Gets the configuration structure for the <%= pluginID %>.\r\n    * The ConfigurationStructure defines the configuration for the plugin\r\n    * and will be used to populate the GUI when invoking the plugin from webGME.\r\n    * @returns {object} The version of the plugin.\r\n    * @public\r\n    */\r\n    <%= pluginID %>.prototype.getConfigStructure = function () {\r\n        return [\r\n            {\r\n                'name': 'species',\r\n                'displayName': 'Animal Species',\r\n                'description': 'Which species does the animal belong to.',\r\n                'value': 'Horse',\r\n                'valueType': 'string',\r\n                'readOnly': false\r\n            },\r\n            {\r\n                'name': 'age',\r\n                'displayName': 'Age',\r\n                'description': 'How old is the animal.',\r\n                'value': 3,\r\n                'valueType': 'number',\r\n                'minValue': 0,\r\n                'maxValue': 10000,\r\n                'readOnly': false\r\n            },\r\n            {\r\n                'name': 'carnivor',\r\n                'displayName': 'Carnivor',\r\n                'description': 'Does the animal eat other animals?',\r\n                'value': false,\r\n                'valueType': 'boolean',\r\n                'readOnly': false\r\n            },\r\n            {\r\n                'name': 'classification',\r\n                'displayName': 'Classification',\r\n                'description': '',\r\n                'value': 'Vertebrates',\r\n                'valueType': 'string',\r\n                'valueItems': [\r\n                    'Vertebrates',\r\n                    'Invertebrates',\r\n                    'Unknown'\r\n                ]\r\n            },\r\n            {\r\n                \"name\": \"color\",\r\n                \"displayName\": \"Color\",\r\n                \"description\": 'The hex color code for the animal.',\r\n                \"readOnly\": false,\r\n                \"value\": '#FF0000',\r\n                \"regex\": '^#([A-Fa-f0-9]{6})$',\r\n                \"valueType\": \"string\"\r\n            }\r\n        ];\r\n    };\r\n<%}%>\r\n    /**\r\n    * Main function for the plugin to execute. This will perform the execution.\r\n    * Notes:\r\n    * - Always log with the provided logger.[error,warning,info,debug].\r\n    * - Do NOT put any user interaction logic UI, etc. inside this method.\r\n    * - callback always have to be called even if error happened.\r\n    *\r\n    * @param {function(string, plugin.PluginResult)} callback - the result callback\r\n    */\r\n    <%= pluginID %>.prototype.main = function (callback) {\r\n        // Use self to access core, project, result, logger etc from PluginBase.\r\n        // These are all instantiated at this point.\r\n        var self = this;\r\n        self.result.setSuccess(true);\r\n<% if (core) {%>\r\n        // Using core to create an object.\r\n        var newNode = self.core.createNode({parent: self.rootNode, base: self.META['FCO']});\r\n        self.core.setAttribute(newNode, 'name', 'My new obj');\r\n        self.core.setRegistry(newNode, 'position', {x: 70, y: 70});\r\n<%}\r\nif (logger) {%>\r\n        // Using the logger.\r\n        self.logger.info('This is a debug message.');\r\n        self.logger.info('This is an info message.');\r\n        self.logger.warning('This is a warning message.');\r\n        self.logger.error('This is an error message.');\r\n<%}\r\nif (templateType) {%>\r\n        // To transform ejs file into js file (needed for client-side runs) run combine_templates\r\n        // see instructions in file. You must run this after any modifications to the ejs template.\r\n        // https://github.com/webgme/webgme-domain-tools/blob/master/src/tools/combine_templates.js\r\n        var template<%=templateExt.toUpperCase()%> = ejs.render(TEMPLATES['<%=templateType%>.<%=templateExt%>.ejs'], {a: 'a', b: 'b'});\r\n        self.fs.addFile('generatedFiles/<%=templateType%>.<%=templateExt%>', template<%=templateExt.toUpperCase()%>);\r\n<%if (!fs) {%>        self.fs.saveArtifact();<%}%>\r\n<%}\r\nif (fs) {%>\r\n        // self.fs works on both client and server side.\r\n        self.fs.addFile('dir/subdir/file.txt', 'This is a text file.');\r\n        self.fs.addFile('dir/subdir2/file2.txt', 'This is another text file.');\r\n        self.fs.saveArtifact();\r\n<%}\r\nif (configStructure) {%>\r\n        // Obtain the current user configuration.\r\n        var currentConfig = self.getCurrentConfig();\r\n        self.logger.info('Current configuration ' + JSON.stringify(currentConfig, null, 4));\r\n<%}\r\nif (core) { %>\r\n        // This will save the changes. If you don't want to save;\r\n        // exclude self.save and call callback directly from this scope.\r\n        self.save('added obj', function (err) {\r\n            callback(null, self.result);\r\n        });\r\n<%} else {%>\r\n        // Uncomment to save changes.\r\n        //self.save('added obj', function (err) {\r\n            callback(null, self.result);\r\n        //});\r\n<%}%>\r\n    };\r\n\r\n    /**\r\n    * Checks if the given node is of the given meta-type.\r\n    * Usage: <tt>self.isMetaTypeOf(aNode, self.META['FCO']);</tt>\r\n    * @param node - Node to be check for type.\r\n    * @param metaTypeObj - Node object defining the meta type.\r\n    * @returns {boolean} - True if the given object was of the META type.\r\n    */\r\n    <%= pluginID %>.prototype.isMetaTypeOf = function (node, metaTypeObj) {\r\n        var self = this;\r\n        while (node) {\r\n            if (self.core.getGuid(node) === self.core.getGuid(metaTypeObj)) {\r\n                return true;\r\n            }\r\n            node = self.core.getBase(node);\r\n        }\r\n        return false;\r\n    };\r\n\r\n    /**\r\n    * Finds and returns the node object defining the meta type for the given node.\r\n    * @param node - Node to be check for type.\r\n    * @returns {Object} - Node object defining the meta type of node.\r\n    */\r\n    <%= pluginID %>.prototype.getMetaType = function (node) {\r\n        var self = this,\r\n            name;\r\n        while (node) {\r\n            name = self.core.getAttribute(node, 'name');\r\n            if (self.META.hasOwnProperty(name) && self.core.getPath(self.META[name]) === self.core.getPath(node)) {\r\n                break;\r\n            }\r\n            node = self.core.getBase(node);\r\n        }\r\n        return node;\r\n    };\r\n\r\n    return <%= pluginID %>;\r\n});",
    "unit_test.js.ejs": "/**\r\n* Generated by PluginGenerator from webgme on <%= date %>.\r\n*/\r\n\r\n'use strict';\r\nif (typeof window === 'undefined') {\r\n    // server-side setup\r\n    var requirejs = require('requirejs');\r\n    require('../../../../../test-conf.js');\r\n\r\n    var chai = require('chai'),\r\n        should = chai.should(),\r\n        assert = chai.assert,\r\n        expect = chai.expect;\r\n}\r\n\r\n// TODO: Update this with a more to-the-point regular expression\r\nvar semanticVersionPattern = /^\\d+\\.\\d+\\.\\d+$/;\r\n\r\ndescribe('<%= pluginID %>', function () {\r\n    var plugin;\r\n\r\n    before(function (done) {\r\n        requirejs(['plugin/<%= pluginID %>/<%= pluginID %>/<%= pluginID %>'], function (<%= pluginID %>) {\r\n            plugin = new <%= pluginID %>();\r\n            // TODO: Add option for generating createMETATypesTests and including core etc.\r\n            //core = new Core();\r\n            //meta = createMETATypesTests(core);\r\n            //rootNode = core.getRootNode();\r\n            //modelsNode = core.createNode({base: meta.ModelElement, parent: rootNode});\r\n            //core.setAttribute(modelsNode, 'name', 'Models');\r\n        done();\r\n        });\r\n    });\r\n\r\n    it('getVersion', function () {\r\n        expect(semanticVersionPattern.test(plugin.getVersion())).to.equal(true);\r\n    });\r\n\r\n    it('getDescription', function () {\r\n        var description = plugin.getDescription();\r\n        expect(typeof description === 'string' || description instanceof String).to.equal(true);\r\n    });\r\n\r\n    it('getName', function () {\r\n        var name = plugin.getName();\r\n        expect(typeof name === 'string' || name instanceof String).to.equal(true);\r\n    });\r\n\r\n    it('main should be implemented', function () {\r\n        var proto = Object.getPrototypeOf(plugin);\r\n        expect(proto.hasOwnProperty('main')).to.equal(true);\r\n    });\r\n\r\n});"
}});