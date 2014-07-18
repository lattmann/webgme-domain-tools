/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 *         Dana Zhang
 */


define(['js/Widgets/ModelEditor/ModelEditorWidget',
        'js/Widgets/DiagramDesigner/ConnectionRouteManagerBasic',
        'js/Widgets/DiagramDesigner/ConnectionRouteManager2',
        'js/Widgets/DiagramDesigner/ConnectionRouteManager3',
        'js/Widgets/DiagramDesigner/ConnectionDrawingManager',
        './NetLabelConnection',
        './NetLabelWidget.Mouse',
        'css!./NetLabelWidget'], function (ModelEditorWidget,
                                           ConnectionRouteManagerBasic,
                                           ConnectionRouteManager2,
                                           ConnectionRouteManager3,
                                           ConnectionDrawingManager,
                                           NetLabelConnection,
                                           NetLabelWidgetMouse) {
    "use strict";

    var NetLabelWidget;

    NetLabelWidget = function (container, params) {
        var self = this;
        params = params || {};
        params.loggerName = "NetLabelWidget";

//        params.connectionRouteManager = new ConnectionRouteManager3({"diagramDesigner": this});

        ModelEditorWidget.call(this, container, params);

        this.logger.debug("NetLabelWidget ctor");
        this._activateMouseListeners();
    };

    _.extend(NetLabelWidget.prototype, ModelEditorWidget.prototype);
    _.extend(NetLabelWidget.prototype, NetLabelWidgetMouse.prototype);

    NetLabelWidget.prototype.createConnection = function (objD) {
        var connectionId = this._getGuid("C_"),
            objDescriptor = _.extend({}, objD),
            sourceId = objDescriptor.srcObjId,
            sourceSubcomponentId = objDescriptor.srcSubCompId,
            targetId = objDescriptor.dstObjId,
            targetSubcomponentId = objDescriptor.dstSubCompId,
            newComponent;

        this.logger.debug("Creating connection component with parameters: " + JSON.stringify(objDescriptor));

        objDescriptor.designerCanvas = this;

        this.connectionIds.push(connectionId);

        //add to accounting queues for performance optimization
        this._insertedConnectionIDs.push(connectionId);

        //accounting connection info
        this.connectionEndIDs[connectionId] = {"srcObjId": sourceId,
            "srcSubCompId": sourceSubcomponentId,
            "dstObjId": targetId,
            "dstSubCompId": targetSubcomponentId};


        this._saveConnectionIDbyEndID(connectionId, sourceId, sourceSubcomponentId);
        this._saveConnectionIDbyEndID(connectionId, targetId, targetSubcomponentId);

        newComponent = this.items[connectionId] = new NetLabelConnection(connectionId);
        newComponent._initialize(objDescriptor);
        return newComponent;
    };

    /**************** ON _TART_CONNECTION_CREATE EVENT HANDLER *******************/
    NetLabelWidget.prototype._onStartConnectionCreate = function (params) {
        var srcItemID = params.srcId,
            srcSubCompID = params.srcSubCompId,
            availableEndPoints = [],
            srcItemMetaInfo = this.items[srcItemID]._decoratorInstance ? this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo() : undefined,
            srcSubCompMetaInfo = srcSubCompID ? this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo(srcSubCompID) : undefined,
            i,
            objID,
            filteredDroppableEnds;

        //clear out selection
        this.selectionManager.clear();

        //hide all the source connectors on the 'src' item
        this.items[srcItemID].hideSourceConnectors();

        //iterate through all the known items to build the available connection end list
        i = this.itemIds.length;
        while (i--) {
            availableEndPoints.push({'dstItemID': this.itemIds[i],
                'dstSubCompID': undefined});
        }

        //iterate through all the known items' subcomponents to build the available connection end list
        for (objID in this._itemSubcomponentsMap) {
            if (this._itemSubcomponentsMap.hasOwnProperty(objID)) {
                i = this._itemSubcomponentsMap[objID].length;
                while (i--) {
                    availableEndPoints.push({'dstItemID': objID,
                        'dstSubCompID': this._itemSubcomponentsMap[objID][i]});
                }
            }
        }

        //if connecting to connections are enabled
        if (this._connectToConnection === true) {
            //iterate through all the known connections to build the available connection end list
            i = this.connectionIds.length;
            while (i--) {
                availableEndPoints.push({'dstItemID': this.connectionIds[i],
                    'dstSubCompID': undefined});
            }
        }

        //all available items and their subcomponent is a valid connection-destination by default
        params.availableConnectionEnds = availableEndPoints;

        //call optional filtering
        filteredDroppableEnds = this.onFilterNewConnectionDroppableEnds(params) || [];
        this.logger.debug('_onStartConnectionCreate filteredDroppableEnds: ' + JSON.stringify(filteredDroppableEnds));

        //iterate through all the filteredDroppableEnds and
        //ask the decorators to display the connectors for the given item/subcomponent
        var processedIndices = [];
        var decoratorPackages = [];
        while (filteredDroppableEnds.length > 0) {
            i = filteredDroppableEnds.length;
            objID = filteredDroppableEnds[0].dstItemID;
            var decoratorUpdatePackage = [];
            processedIndices = [];
            while (i--) {
                if (objID === filteredDroppableEnds[i].dstItemID) {
                    processedIndices.push(i);
                    decoratorUpdatePackage.push(filteredDroppableEnds[i].dstSubCompID);
                }
            }
            decoratorPackages.push([objID, srcItemMetaInfo, srcSubCompMetaInfo, decoratorUpdatePackage]);
            processedIndices.sort(function(a,b){return a-b});
            i = processedIndices.length;
            while(i--) {
                filteredDroppableEnds.splice(processedIndices[i], 1);
            }
        }

        this.logger.debug('_onStartConnectionCreate decorator update package: ' + JSON.stringify(decoratorPackages));
        i = decoratorPackages.length;
        while (i--) {
            objID = decoratorPackages[i][0];
            this.items[objID].showEndConnectors({'srcItemMetaInfo': decoratorPackages[i][1],
                'srcSubCompMetaInfo': decoratorPackages[i][2],
                'connectors': decoratorPackages[i][3]} );
        }

        //add class to items container
        // todo: return the ids
        this._getValidEndIDs(decoratorPackages);
        this._connectionDrawStartAddClass();
    };

    NetLabelWidget.prototype._getValidEndIDs = function (decoratorPackages) {
        var i,
            j,
            connectors,
            srcID,
            sCompID,
            validEndIDList = [];

        for (i = 0; i < decoratorPackages.length; i += 1) {
            srcID  = decoratorPackages[i][0];
            connectors = decoratorPackages[i][3];
            if (!connectors[0]) {
                validEndIDList.push({'srcID': srcID,
                                   'sCompID': undefined});
            }
            for (j = 0; j < connectors.length; j += 1) {
                if (connectors[j]) {
                    sCompID = connectors[j];
                    validEndIDList.push({'srcID': srcID,
                                       'sCompID': sCompID});
                }
            }
        }

        return validEndIDList;
    };

    NetLabelWidget.prototype._getNamesFromIDs = function (validEndIDs) {
        var retNames = [],
            NAME_SEPARATOR = '.',
            i,
            srcID,
            srcObj,
            srcName,
            sCompID,
            subCompObj,
            subCompName;

        for (i = validEndIDs; i < validEndIDs.length; i += 1) {
            // get src obj name
            srcID = validEndIDs[i].srcID;
            srcObj = this._client.getNode(srcID);
            srcName = srcObj.getAttribute('name');

            // get subcomp name if exists
            sCompID = validEndIDs[i].sCompID;
            if (sCompID) {
                subCompObj = this._client.getNode(sCompID);
                subCompName = srcName + NAME_SEPARATOR + subCompObj.getAttribute('name');
                retNames.push(subCompName);
            } else {
                retNames.push(srcName);
            }
        }

        return retNames;
    };

    return NetLabelWidget;
});