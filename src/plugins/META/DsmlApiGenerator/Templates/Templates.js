/* Generated file based on ejs templates */
define([], function() {
    return {
    "./constructorsDomain.js.ejs": "define(['plugin/<%- projectName %>/DSML/<%- projectName %>.def'], function (<%- projectName %>) {\r\n\r\n    'use strict';\r\n\r\n    /**\r\n    * This file defines all constructors of the <%- projectName %> domain specific API types.\r\n    *\r\n    * Generated on <%- new Date().toString() %> [<%- new Date().toISOString() %>]\r\n    * @exports <%- projectName %>\r\n    * @version 1.0\r\n    */\r\n\r\n<% for (var metaTypeIndex = 0; metaTypeIndex < metaTypes.length; metaTypeIndex += 1) {\r\n    var metaTypeName = metaTypes[metaTypeIndex].name;\r\n    var base = metaTypes[metaTypeIndex].base\r\n    var hasChildren = metaTypes[metaTypeIndex].children.length > 0%>\r\n/******************************************** <%- metaTypeName %> **********************************************/\r\n\r\n    /**\r\n    * Initializes a new instance of <%- metaTypeName %>.\r\n    *\r\n    * @class\r\n    <% if (base) { %>* @augments {<%- projectName %>.<%- base %>}<% } %>\r\n    * @classdesc This class represents a(n) <%- metaTypeName %>.\r\n    * @property {<%- projectName %>.<%- metaTypeName %>.Attributes} attributes The attributes of the <%- metaTypeName %>.\r\n    * @property {<%- projectName %>.<%- metaTypeName %>.Registry} registry The registry of the <%- metaTypeName %>.\r\n    <%if (hasChildren) {%>* @property {<%- projectName %>.<%- metaTypeName %>.Children} childrenOfKind Holds the children of the <%- metaTypeName %>.<% } %>\r\n    * @param {object} nodeObj The wrapped WebGME object.\r\n    * @constructor\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %> = function (nodeObj) {\r\n        this._nodeObj = nodeObj;\r\n        this.attributes = new <%- projectName %>.<%- metaTypeName %>.Attributes(this._nodeObj);\r\n        this.registry = new <%- projectName %>.<%- metaTypeName %>.Registry(this._nodeObj);\r\n        <%if (hasChildren) {%>this.childrenOfType = new <%- projectName %>.<%- metaTypeName %>.Children(this._nodeObj);<%}%>\r\n    };\r\n\r\n    /**\r\n    * Initializes a new instance of <%- metaTypeName %>.Attributes\r\n    *\r\n    * @class\r\n    * @classdesc This class wraps the attributes of <%- metaTypeName %>.\r\n    * @param {object} nodeObj The wrapped WebGME object of <%- metaTypeName %>.\r\n    * @constructor\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Attributes = function (nodeObj) {\r\n        this._nodeObj = nodeObj;\r\n    };\r\n\r\n    /**\r\n    * Initializes a new instance of <%- metaTypeName %>.Registry\r\n    *\r\n    * @class\r\n    * @classdesc This class wraps the registry of <%- metaTypeName %>.\r\n    * @param {object} nodeObj The wrapped WebGME object of <%- metaTypeName %>.\r\n    * @constructor\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Registry = function (nodeObj) {\r\n        this._nodeObj = nodeObj;\r\n    };\r\n<%if (hasChildren) {%>\r\n    /**\r\n    * Initializes a new instance of <%- metaTypeName %>.Children\r\n    *\r\n    * @class\r\n    * @classdesc This class wraps the children of <%- metaTypeName %>.\r\n    * @param {object} nodeObj The wrapped WebGME object of <%- metaTypeName %>.\r\n    * @constructor\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Children = function (nodeObj) {\r\n        this._nodeObj = nodeObj;\r\n    };\r\n<%}%>\r\n<%}%>\r\n    return <%- projectName %>;\r\n});",
    "./defDomain.js.ejs": "define([], function () {\r\n\r\n    var <%- projectName %> = function () {};\r\n\r\n    <%- projectName %>.initialize = function (core, storage, META) {\r\n        var name;\r\n        for (name in META) {\r\n            if (META.hasOwnProperty(name)) {\r\n                if (<%- projectName %>.hasOwnProperty(name)) {\r\n                    <%- projectName %>[name].Type = META[name];\r\n                } else {\r\n                    <%- projectName %>[name] = {};\r\n                    <%- projectName %>[name].Type = META[name];\r\n                }\r\n            }\r\n        }\r\n\r\n        <%- projectName %>._core = core;\r\n        <%- projectName %>._storage = storage;\r\n    };\r\n\r\n\r\n    <%- projectName %>.createMETATypesTests = function (core) {\r\n        var META = {},\r\n        options = {},\r\n        node;\r\n\r\n        <% for (var metaTypeIndex = 0; metaTypeIndex < metaTypes.length; metaTypeIndex += 1) {\r\n            var metaTypeName = metaTypes[metaTypeIndex].name;\r\n        %>\r\n        node = core.createNode(options);\r\n        core.setAttribute(node, 'name', '<%- metaTypeName %>');\r\n        META.<%- metaTypeName %> = node;\r\n        <%\r\n        }\r\n        %>\r\n\r\n        return META;\r\n    };\r\n\r\n    return CyPhyLight;\r\n});",
    "./mainDOMAIN.js.ejs": "define(['plugin/<%- projectName %>/DSML/<%- projectName %>.def',\r\n<% for (var metaTypeIndex = 0; metaTypeIndex < metaTypes.length; metaTypeIndex += 1) {\r\n    var metaTypeName = metaTypes[metaTypeIndex].name;\r\n    var endSign = (metaTypeIndex === metaTypes.length - 1) ? ']' : ',';\r\n%>        'plugin/<%- projectName %>/DSML/<%- projectName%>.<%- metaTypeName%>.Dsml'<%- endSign %>\r\n<%\r\n}\r\n%>    ,function (<%- projectName %>,\r\n<% for (var metaTypeIndex = 0; metaTypeIndex < metaTypes.length; metaTypeIndex += 1) {\r\n    var metaTypeName = metaTypes[metaTypeIndex].name;\r\n    var endSign = (metaTypeIndex === metaTypes.length - 1) ? ') {' : ',';\r\n%>        <%- metaTypeName %><%- endSign %>\r\n<%}%>\r\n\r\n    'use strict';\r\n\r\n<% for (var metaTypeIndex = 0; metaTypeIndex < metaTypes.length; metaTypeIndex += 1) {\r\n    var metaTypeName = metaTypes[metaTypeIndex].name;%>\r\n    <%- projectName %>.<%- metaTypeName %> = <%- metaTypeName %>;\r\n<%\r\n}\r\n%>\r\n\r\n    return <%- projectName %>;\r\n\r\n});",
    "./typeDOMAIN.js.ejs": "define (['plugin/<%- projectName %>/DSML/<%- projectName %>.constructors'<%if(base){ %>, 'plugin/<%- projectName %>/DSML/<%- projectName %>.<%-base%>.Dsml'<%}%>], function (<%- projectName %><%if(base){ %>, <%-base%><%}%>) {\r\n    'use strict';\r\n\r\n    <%\r\n    if (base) {\r\n    %>\r\n    // This will give inheritance when checking types\r\n    <%- projectName %>.<%- metaTypeName %>.prototype = Object.create(<%- base %>.prototype);\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.constructor = <%- projectName %>.<%- metaTypeName %>;\r\n<%  }%>\r\n\r\n    //<editor-fold desc=\"<%- metaTypeName %> static fields, properties and functions\">\r\n\r\n    /**\r\n    * WebGME node object that represents <%- metaTypeName %> type.\r\n    * @type {Object}\r\n    * @static\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Type = null; // this is set by the <%- projectName %>.initialize function\r\n\r\n    /**\r\n    * WebGME node object's meta type ID of <%- metaTypeName %>.\r\n    * @type {string}\r\n    * @static\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.ID = \"<%- ID %>\";\r\n\r\n    /**\r\n    * WebGME node object's meta type GUID of <%- metaTypeName %>.\r\n    * @type {string}\r\n    * @static\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.GUID = \"<%- GUID %>\";\r\n\r\n    /**\r\n    * WebGME node object's meta type hash value of <%- metaTypeName %>.\r\n    * @type {string}\r\n    * @static\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Hash = \"<%- Hash %>\";\r\n    <%\r\n    if (isConnection) {\r\n    %>\r\n    <%- projectName %>.<%- metaTypeName %>.createObj = function (parent, src, dst) {\r\n        var nodeObj = <%- projectName %>._core.createNode({parent: parent.getNodeObj(), base: <%- projectName %>.<%- metaTypeName %>.Type});\r\n        <%- projectName %>._core.setPointer(nodeObj, 'src', src.getNodeObj());\r\n        <%- projectName %>._core.setPointer(nodeObj, 'dst', dst.getNodeObj());\r\n        return new <%- projectName %>.<%- metaTypeName %>(nodeObj);\r\n    };\r\n    <%\r\n    } else {\r\n    %>\r\n    /**\r\n    * Creates a new <%- metaTypeName %> inside given parent.\r\n    * @returns {<%- projectName %>.<%- metaTypeName %>} The newly created <%- metaTypeName %>.\r\n    * @param {<%- projectName %>.FCO} parent Instance where the new <%- metaTypeName %> should be created.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.createObj = function (parent) {\r\n        var nodeObj = <%- projectName %>._core.createNode({parent: parent.getNodeObj(), base: <%- projectName %>.<%- metaTypeName %>.Type});\r\n        return new <%- projectName %>.<%- metaTypeName %>(nodeObj);\r\n    };\r\n    <%\r\n    }\r\n    %>\r\n    //</editor-fold>\r\n\r\n    //<editor-fold desc=\"<%- metaTypeName %> instance properties and functions\">\r\n    /**\r\n    * Gets the ID of the <%- metaTypeName %> instance.\r\n    * @returns {string} The ID.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.getID = function () {\r\n        return <%- projectName %>._core.getID(this._nodeObj);\r\n    };\r\n\r\n    /**\r\n    * Gets the GUID of the <%- metaTypeName %> instance.\r\n    * @returns {string} The GUID.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.getGUID = function () {\r\n        return <%- projectName %>._core.getGuid(this._nodeObj);\r\n    };\r\n\r\n    /**\r\n    * Gets the core object of the <%- metaTypeName %> instance.\r\n    * @returns {Object} The core nodeObject.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.getNodeObj = function () {\r\n        return this._nodeObj;\r\n    };\r\n    //</editor-fold>\r\n\r\n    //<editor-fold desc=\"<%- metaTypeName %> Child objects\">\r\n    <%\r\nfor (var j = 0; j < children.length; j += 1) {\r\n    var child = idMap[children[j]];\r\n    %>\r\n    <% if (child.isAbstract) {\r\n        continue;\r\n    }%>\r\n    // TODO: Handle inheritance and abstract types.\r\n    /**\r\n    * Calls callback with an array of all children of type <%-child.name%> in the Component.\r\n    * @param {<%- projectName %>.<%- metaTypeName %>.Children.<%-child.name%>~callback} callback The callback that handles the response.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Children.prototype.<%-child.name%> = function (callback) {\r\n        <%- projectName %>._core.loadChildren(this._nodeObj, function (err, childNodes) {\r\n            var i, nodeObj, orgChild,\r\n            dsmlChildren = [];\r\n            for (i = 0; i < childNodes.length; i += 1) {\r\n                orgChild = childNodes[i];\r\n                nodeObj = <%- projectName %>._core.getBase(orgChild);\r\n                while (nodeObj) {\r\n                    if (<%- projectName %>._core.getGuid(nodeObj) === <%- projectName %>.<%-child.name%>.GUID) {\r\n                        dsmlChildren.push(new <%- projectName %>.<%-child.name%>(orgChild));\r\n                        break;\r\n                    }\r\n                    nodeObj = <%- projectName %>._core.getBase(nodeObj);\r\n                }\r\n            }\r\n\r\n            callback(dsmlChildren);\r\n        });\r\n    };\r\n\r\n    /**\r\n    * This callback is displayed as part of the <%- projectName %>.<%- metaTypeName %>.Children.<%child.name%> class.\r\n    * @callback <%- metaTypeName %>.Children.<%child.name%>~callback\r\n    * @param {Array.<<%- projectName %>.<%- child.name %>>} dsmlChildren Gets populated with children of type <%child.name%>.\r\n    */\r\n\r\n    <%\r\n    if (child.isConnection) {\r\n        // FIXME: this is still buggy\r\n    %>\r\n    /**\r\n    * Creates a new <%- projectName %>.<%- child.name %> inside this <%- metaTypeName %> instance with src and dst connected.\r\n    * @param {<%- projectName %>.FCO} src The source of the new connection.\r\n    * @param {<%- projectName %>.FCO} dst The destination of the new connection.\r\n    * @returns {<%- projectName %>.<%- child.name %>} The newly created <%- child.name %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.create<%- child.name %> = function (src, dst) {\r\n        return <%- projectName %>.<%- child.name %>.createObj(this, src, dst);\r\n    };\r\n    <%\r\n    } else {\r\n    %>\r\n    /**\r\n    * Creates a new <%- projectName %>.<%- child.name %> inside this <%- metaTypeName %> instance.\r\n    * @returns {<%- projectName %>.<%- child.name %>} The newly created <%- child.name %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.prototype.create<%- child.name %> = function () {\r\n        return <%- projectName %>.<%- child.name %>.createObj(this);\r\n    };\r\n    <% } %>\r\n<%} %>\r\n    //</editor-fold>\r\n\r\n    //<editor-fold desc=\"<%- metaTypeName %> Attributes\">\r\n\r\n    <%\r\n    for (var i = 0; i < attributeNames.length; i += 1) {\r\n        var attributeName = attributeNames[i];\r\n    %>\r\n    /**\r\n    * Gets the attribute <%- attributeName %> of the <%- metaTypeName %> instance.\r\n    * @returns {string|object} Currently set <%- attributeName %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Attributes.prototype.get<%- attributeName %> = function () {\r\n        return <%- projectName %>._core.getAttribute(this._nodeObj, '<%- attributeName %>');\r\n    };\r\n\r\n    /**\r\n    * Sets the attribute <%- attributeName %> of the <%- metaTypeName %> instance.\r\n    * @param {string|object} value New <%- attributeName %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Attributes.prototype.set<%- attributeName %> = function (value) {\r\n        return <%- projectName %>._core.setAttribute(this._nodeObj, '<%- attributeName %>', value);\r\n    };\r\n\r\n    <%\r\n    }\r\n    %>\r\n\r\n    //</editor-fold>\r\n\r\n\r\n    //<editor-fold desc=\"<%- metaTypeName %> registry entries\">\r\n\r\n    <%\r\n    for (var i = 0; i < registryNames.length; i += 1) {\r\n        var registryName = registryNames[i];\r\n    %>\r\n    /**\r\n    * Gets the registry value <%- registryName %> of the <%- metaTypeName %> instance.\r\n    * @returns {string|object} Currently set <%- registryName %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Registry.prototype.get<%- registryName %> = function () {\r\n        return <%- projectName %>._core.getRegistry(this._nodeObj, '<%- registryName %>');\r\n    };\r\n\r\n    /**\r\n    * Sets the registry value <%- registryName %> of the <%- metaTypeName %> instance.\r\n    * @param {string|object} value New registry value of <%- registryName %>.\r\n    * @public\r\n    */\r\n    <%- projectName %>.<%- metaTypeName %>.Registry.prototype.set<%- registryName %> = function (value) {\r\n        return <%- projectName %>._core.setRegistry(this._nodeObj, '<%- registryName %>', value);\r\n    };\r\n\r\n    <%\r\n    }\r\n    %>\r\n\r\n    //</editor-fold>\r\n\r\n    // TODO: DSML connections\r\n    // TODO: DSML references\r\n    // TODO: DSML sets\r\n    // TODO: DSML pointers\r\n\r\n    return <%- projectName %>.<%- metaTypeName %>;\r\n});"
}});