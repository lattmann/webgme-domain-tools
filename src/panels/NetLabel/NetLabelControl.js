/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Authors: Robert Kereskenyi
 *          Dana Zhang
 */

define(['js/Panels/ModelEditor/ModelEditorControl',
    'js/Constants',
    'js/Utils/PreferencesHelper'], function (ModelEditorControl, CONSTANTS, PreferencesHelper) {

    "use strict";

    var NetLabelControl;

    NetLabelControl = function (options) {
        ModelEditorControl.call(this, options);
        this.netLabelList = {};
    };


    _.extend(NetLabelControl.prototype, ModelEditorControl.prototype);


    NetLabelControl.prototype.getConnectionDescriptor = function (gmeID) {

        var self = this,
            CONSTS =  CONSTANTS, // CONSTANTS can only be loaded by assigning it to a var
            gmeClient = self._client,
            connectionObj = gmeClient.getNode(gmeID),
            srcID = connectionObj.getPointer(CONSTANTS.POINTER_SOURCE).to,
            dstID = connectionObj.getPointer(CONSTANTS.POINTER_TARGET).to,
            srcObj = gmeClient.getNode(srcID),
            dstObj = gmeClient.getNode(dstID),
            srcName = srcObj.getAttribute('name'),
            dstName = dstObj.getAttribute('name'),
            srcParentId = srcObj.getParentId(),
            dstParentId = dstObj.getParentId(),
            srcParentName = gmeClient.getNode(srcParentId).getAttribute('name'),
            dstParentName = gmeClient.getNode(dstParentId).getAttribute('name'),
            srcText = srcID.match(/\//g).length > 3 ? srcParentName + "." + srcName : srcName,
            dstText = dstID.match(/\//g).length > 3 ? dstParentName + "." + dstName : dstName;
        return {'srcText': srcText,
                'dstText': dstText,
                'registeredSrcId': gmeID + "-src",
                'registeredDstId': gmeID + "-dst",
                'srcID': srcID,
                'dstID': dstID};
    };

    return NetLabelControl;
});