/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 *         Dana Zhang
 */

define(['js/Widgets/DiagramDesigner/Connection',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Draggable',
    './NetLabelWidget.Mouse',
    './NetLabelWidget.Constants',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (Connection,
                                                                             DiagramDesignerWidgetDraggable,
                                                                             NetLabelWidgetMouse,
                                                                             NetLabelWidgetConstants,
                                                                             DiagramDesignerWidgetConstants) {

    "use strict";

    var NetLabelConnection,
        TEXT_OFFSET = 15,
        TEXT_ID_PREFIX = "t_",
        COLLAPSE_ON_INDEX = NetLabelWidgetConstants.MAX_LABEL_NUMBER - 1,
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DEFAULT_WIDTH = 1,
        CONNECTION_DEFAULT_COLOR = "#000000",
        CONNECTION_DEFAULT_PATTERN = DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID,
        CONNECTION_NO_END = DiagramDesignerWidgetConstants.LINE_ARROWS.NONE,
        CONNECTION_DEFAULT_END = CONNECTION_NO_END,
        CONNECTION_SHADOW_DEFAULT_OPACITY = 0,
        CONNECTION_SHADOW_DEFAULT_WIDTH = 5,
        CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED = 1,
        CONNECTION_SHADOW_DEFAULT_COLOR = "#B9DCF7",
        CONNECTION_DEFAULT_LINE_TYPE = DiagramDesignerWidgetConstants.LINE_TYPES.NONE,
        SHADOW_MARKER_SIZE_INCREMENT = 3,
        SHADOW_MARKER_SIZE_INCREMENT_X = 1,
        SHADOW_MARKER_BLOCK_FIX_OFFSET = 2,
        JUMP_XING_RADIUS = 3;

    NetLabelConnection = function (objId) {
        Connection.call(this, objId);
    };

    _.extend(NetLabelConnection.prototype, Connection.prototype);
    _.extend(NetLabelConnection.prototype, NetLabelWidgetMouse.prototype);

    NetLabelConnection.prototype.setConnectionRenderData = function (segPoints) {
        var self = this,
            srcPos = segPoints[0],
            dstPos = segPoints[segPoints.length - 1];

        // setting end connectors positions
        self.sourceCoordinates = { "x": -1,
            "y": -1};

        self.endCoordinates = { "x": -1,
            "y": -1};

        self.sourceCoordinates.x = srcPos.x;
        self.sourceCoordinates.y = srcPos.y;
        self.endCoordinates.x = dstPos.x;
        self.endCoordinates.y = dstPos.y;

        self._segPoints = segPoints.slice(0);
        self._pathPoints = segPoints;

        if (this.showAsLabel) {
            self._setSrcLabelData(segPoints);
            self._setDstLabelData(segPoints);
//            self._createSrcLabel(self.sourceCoordinates.x, self.sourceCoordinates.y);
//            self._createDstLabel(self.endCoordinates.x, self.endCoordinates.y);
        } else {
            self.setLineConnectionRenderData(segPoints);
        }
    };

    /**
     * Draw bus-base from src
     * @param segPoints
     * @private
     */
    NetLabelConnection.prototype._setSrcLabelData = function (segPoints) {
        var pathDef = [],
            p = segPoints[0], // src-start
            lastP = segPoints[1], // src-end
            points = [],
            validPath = segPoints && segPoints.length > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw
            pathDef.push("M" + p.x + "," + p.y);

            // if connector is on top or bottom draw vertical lines
            if (p.x === lastP.x) {
                if (p.y <= lastP.y) {
                    pathDef.push("L" + p.x + "," + (p.y + NetLabelWidgetConstants.MAX_TEXT_WIDTH));
                } else {
                    pathDef.push("L" + p.x + "," + (p.y - NetLabelWidgetConstants.MAX_TEXT_WIDTH));
                }
            } else {
                if (p.x <= lastP.x) {
                    pathDef.push("L" + (p.x + NetLabelWidgetConstants.MAX_TEXT_WIDTH) + "," + p.y);
                } else {
                    pathDef.push("L" + (p.x - NetLabelWidgetConstants.MAX_TEXT_WIDTH) + "," + p.y);
                }
            }

            //construct the SVG path definition from path-points
            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.srcPathDef !== pathDef) {
                this.srcPathDef = pathDef;

                if (this.skinParts.srcPath) {
                    this.logger.debug("Recreating connection with ID: '" + this.id + "'");
                    this.skinParts.srcPath.attr({ "path": pathDef});
                } else {
                    this.logger.debug("Creating connection with ID: '" + this.id + "'");
                    /*CREATE PATH*/
                    this.skinParts.srcPath = this.paper.path(pathDef);

                    $(this.skinParts.srcPath.node).attr({"id": this.id,
                        "class": NetLabelWidgetConstants.NETLABEL_CONNECTION_CLASS + ' src'});
                }
            }

            //in edit mode add edit features
            if (this._editMode === true) {
                this._drawEditModePath(points);
                //show connection end dragpoints
                this.showEndReconnectors();
            }

            this._showConnectionAreaMarker();

            this._renderSrcTexts();
        } else {
            this.srcPathDef = null;
            this._removePath();
            this._removePathShadow();
            this._hideConnectionAreaMarker();
            this._hideTexts();
        }
    };

    /**
     * Draw bus-base starting from dst
     * @param segPoints
     * @private
     */
    NetLabelConnection.prototype._setDstLabelData = function (segPoints) {
        var pathDef = [],
            p = segPoints[segPoints.length - 1], // dst-start
            lastP = segPoints[segPoints.length - 2], // dst-end
            points = [],// todo: set value to this later
            validPath = segPoints && segPoints.length > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw

            pathDef.push("M" + p.x + "," + p.y);

            // if connector is on top or bottom draw vertical lines
            if (p.x === lastP.x) {
                if (p.y <= lastP.y) {
                    // top connector
                    pathDef.push("L" + p.x + "," + (p.y + NetLabelWidgetConstants.MAX_TEXT_WIDTH));
                } else {
                    pathDef.push("L" + p.x + "," + (p.y - NetLabelWidgetConstants.MAX_TEXT_WIDTH));
                }
            } else {
                if (p.x <= lastP.x) {
                    pathDef.push("L" + (p.x + NetLabelWidgetConstants.MAX_TEXT_WIDTH) + "," + p.y);
                } else {
                    pathDef.push("L" + (p.x - NetLabelWidgetConstants.MAX_TEXT_WIDTH) + "," + p.y);
                }
            }

            //construct the SVG path definition from path-points

            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.dstPathDef !== pathDef) {
                this.dstPathDef = pathDef;

                if (this.skinParts.dstPath) {
                    this.logger.debug("Recreating connection with ID: '" + this.id + "'");
                    this.skinParts.dstPath.attr({ "path": pathDef});
                } else {
                    this.logger.debug("Creating connection with ID: '" + this.id + "'");
                    /*CREATE PATH*/
                    this.skinParts.dstPath = this.paper.path(pathDef);

                    $(this.skinParts.dstPath.node).attr({"id": this.id,
                        "class": NetLabelWidgetConstants.NETLABEL_CONNECTION_CLASS + ' dst'});
                }
            }

            //in edit mode add edit features
            if (this._editMode === true) {
                this._drawEditModePath(points);
                //show connection end dragpoints
                this.showEndReconnectors();
            }

            this._showConnectionAreaMarker();

            this._renderDstTexts();
        } else {
            this.pathDef = null;
            this._removePath();
            this._removePathShadow();
            this._hideConnectionAreaMarker();
            this._hideTexts();
        }
    };

    NetLabelConnection.prototype._renderSrcTexts = function () {
        var totalLength = this.skinParts.srcPath.getTotalLength(),
            pathCenter = this.skinParts.srcPath.getPointAtLength(totalLength / 2),
            hasText = false,
            self = this;

        this._hideTexts();

        this.skinParts.textContainer = this._textContainer.clone();
        this.skinParts.textContainer.attr('id', TEXT_ID_PREFIX + this.id);

        if (this.name && this.name !== "") {
            this.skinParts.name = this._textNameBase.clone();
            this.skinParts.name.css({ 'top': pathCenter.y - TEXT_OFFSET,
                'left': pathCenter.x,
                'color': this.designerAttributes.color});
            this.skinParts.name.find('span').text(this.name);
            this.skinParts.textContainer.append(this.skinParts.name);
            hasText = true;


            // set title editable on double-click
            this.skinParts.name.find('span').on("dblclick.editOnDblClick", null, function (event) {
                if (self.nameEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({"class": "",
                        "onChange": function (oldValue, newValue) {
                            self._onNameChanged(oldValue, newValue);
                        }});
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }


        if (hasText) {
            $(this.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(this.skinParts.textContainer);
        }
    };

    NetLabelConnection.prototype._renderDstTexts = function () {
        var totalLength = this.skinParts.dstPath.getTotalLength(),
            pathCenter = this.skinParts.dstPath.getPointAtLength(totalLength / 2),
            hasText = false,
            self = this;

        this._hideTexts();

        this.skinParts.textContainer = this._textContainer.clone();
        this.skinParts.textContainer.attr('id', TEXT_ID_PREFIX + this.id);

        if (this.name && this.name !== "") {
            this.skinParts.name = this._textNameBase.clone();
            this.skinParts.name.css({ 'top': pathCenter.y - TEXT_OFFSET/*+ this.designerAttributes.width / 2*/,
                'left': pathCenter.x,
                'color': this.designerAttributes.color});
            this.skinParts.name.find('span').text(this.name);
            this.skinParts.textContainer.append(this.skinParts.name);
            hasText = true;

            // set title editable on double-click
            this.skinParts.name.find('span').on("dblclick.editOnDblClick", null, function (event) {
                if (self.nameEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({"class": "",
                        "onChange": function (oldValue, newValue) {
                            self._onNameChanged(oldValue, newValue);
                        }});
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        if (hasText) {
            $(this.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(this.skinParts.textContainer);
        }
    };

    NetLabelConnection.prototype.setLineConnectionRenderData = function (segPoints) {
        var i = 0,
            len,
            pathDef = [],
            p,
            lastP = { 'x': NaN,
                'y': NaN},
            points = [],
            validPath = segPoints && segPoints.length > 1,
            minX,
            minY,
            maxX,
            maxY;

        //remove edit features
        this._removeEditModePath();

        if (validPath) {
            //there is a points list given and has at least 2 points
            //remove the null points from the list (if any)
            i = len = segPoints.length;
            len--;
            while (i--) {
                if (segPoints[len - i]) {
                    p = this._fixXY(segPoints[len - i]);
                    if (lastP && (lastP.x !== p.x || lastP.y !== p.y)) {
                        points.push(p);
                        lastP = p;
                    }
                }
            }
        }

        this._simplifyTrivially(points);

        len = points.length;
        validPath = len > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw

            this._pathPoints = points;

            //non-edit mode, one path builds the connection
            p = points[0];

            minX = maxX = p.x;
            minY = maxY = p.y;

            //store source coordinate
            this.sourceCoordinates.x = p.x;
            this.sourceCoordinates.y = p.y;

            i = points.length;
            while (i--) {
                p = points[i];
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }

            //save calculated bounding box
            this._pathPointsBBox.x = minX;
            this._pathPointsBBox.y = minY;
            this._pathPointsBBox.x2 = maxX;
            this._pathPointsBBox.y2 = maxY;

            //save endpoint coordinates
            p = points[points.length - 1];
            this.endCoordinates.x = p.x;
            this.endCoordinates.y = p.y;

            //construct the SVG path definition from path-points
            pathDef = this._getPathDefFromPoints(points);
            pathDef = this._jumpOnCrossings(pathDef);
            pathDef = pathDef.join(" ");

            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.pathDef !== pathDef) {
                this.pathDef = pathDef;

                //calculate the steep of the curve at the beginning/end of path
                this._calculatePathStartEndAngle();

                if (this.skinParts.path) {
                    this.logger.debug("Redrawing connection with ID: '" + this.id + "'");
                    this.skinParts.path.attr({ "path": pathDef});
                    if (this.skinParts.pathShadow) {
                        this._updatePathShadow(this._pathPoints);
                    }
                } else {
                    this.logger.debug("Drawing connection with ID: '" + this.id + "'");
                    /*CREATE PATH*/
                    this.skinParts.path = this.paper.path(pathDef);

                    $(this.skinParts.path.node).attr({"id": this.id,
                        "class": NetLabelWidgetConstants.NETLABEL_CONNECTION_CLASS});

                    this.skinParts.path.attr({ "arrow-start": this.designerAttributes.arrowStart,
                        "arrow-end": this.designerAttributes.arrowEnd,
                        "stroke": this.designerAttributes.color,
                        "stroke-width": this.designerAttributes.width,
                        "stroke-dasharray": this.designerAttributes.pattern});

                    if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
                        this._createPathShadow(this._pathPoints);
                    }
                }
            }

            //in edit mode add edit features
            if (this._editMode === true) {
                this._drawEditModePath(points);
                //show connection end dragpoints
                this.showEndReconnectors();
            }

            this._showConnectionAreaMarker();

            this._renderTexts();
        } else {
            this.pathDef = null;
            this._removePath();
            this._removePathShadow();
            this._hideConnectionAreaMarker();
            this._hideTexts();
        }
    };

    NetLabelConnection.prototype.destroy = function () {
        this._destroying = true;
        if (this.diagramDesigner) {

            this.diagramDesigner.skinParts.$itemsContainer.find('.' + NetLabelWidgetConstants.NETLABEL_CONNECTION_CLASS).remove();
            this._hideTexts();
            this.logger.debug("Destroyed");
        }
    };

    NetLabelConnection.prototype._netLabelListBase = $('<div class="connList"></div>');
    NetLabelConnection.prototype._netLabelBase = $('<div class="netLabel"></div>');
    NetLabelConnection.prototype._expandLabelBase = $('<div class="show-all-labels">...</div>');

    NetLabelConnection.prototype._initialize = function (objDescriptor) {

        /*MODELEDITORCONNECTION CONSTANTS***/
        this.showAsLabel = objDescriptor.showAsLabel;
        this.diagramDesigner = objDescriptor.designerCanvas;

        this.skinParts = {};
        this.paper = this.diagramDesigner.skinParts.SVGPaper;

        this.reconnectable = false;

        this.selected = false;
        this.selectedInMultiSelection = false;

        this.designerAttributes = {};

        this._editMode = false;
        this._readOnly = false;

        //get segnment points
        this.segmentPoints = [];
        if (objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS]) {
            var fixedP;
            var len =  objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS].length;
            var cx, cy;
            for (var i = 0; i < len; i += 1) {
                fixedP = this._fixXY({'x': objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][0],
                    'y': objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][1]});
                cx = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][2] : 0;
                cy = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][3] : 0;
                this.segmentPoints.push([fixedP.x, fixedP.y, cx, cy]);
            }
        }

        if (this.showAsLabel) {
            this._initializeConnectionProps(objDescriptor);
        } else {
            this._initializeLineConnectionProps(objDescriptor);
        }
    };

    NetLabelConnection.prototype._initializeLineConnectionProps = function (objDescriptor) {

        this._segmentPointMarkers = [];
        this._connectionEditSegments = [];

        this._pathPointsBBox = {'x': 0,
            'y': 0,
            'x2': 0,
            'y2': 0,
            'w': 0,
            'h': 0};

        this.reconnectable = objDescriptor.reconnectable === true;
        this.editable = !!objDescriptor.editable;

        this.isBezier = (objDescriptor[DiagramDesignerWidgetConstants.LINE_TYPE] || DiagramDesignerWidgetConstants.LINE_TYPES.NONE).toLowerCase() === DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER;

        /*PathAttributes*/
        this.designerAttributes.arrowStart = objDescriptor[DiagramDesignerWidgetConstants.LINE_START_ARROW] || CONNECTION_DEFAULT_END;
        this.designerAttributes.arrowEnd = objDescriptor[DiagramDesignerWidgetConstants.LINE_END_ARROW] || CONNECTION_DEFAULT_END;
        this.designerAttributes.color = objDescriptor[DiagramDesignerWidgetConstants.LINE_COLOR] || CONNECTION_DEFAULT_COLOR;
        this.designerAttributes.width = parseInt(objDescriptor[DiagramDesignerWidgetConstants.LINE_WIDTH], 10) || CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.pattern = objDescriptor[DiagramDesignerWidgetConstants.LINE_PATTERN] || CONNECTION_DEFAULT_PATTERN
        this.designerAttributes.shadowWidth = this.designerAttributes.width + CONNECTION_SHADOW_DEFAULT_WIDTH - CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.shadowOpacity = CONNECTION_SHADOW_DEFAULT_OPACITY;
        this.designerAttributes.shadowOpacityWhenSelected = CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED;
        this.designerAttributes.shadowColor = CONNECTION_SHADOW_DEFAULT_COLOR;
        this.designerAttributes.lineType = objDescriptor[DiagramDesignerWidgetConstants.LINE_TYPE] || CONNECTION_DEFAULT_LINE_TYPE;

        this.designerAttributes.shadowEndArrowWidth = this.designerAttributes.width + SHADOW_MARKER_SIZE_INCREMENT;
        if (this.designerAttributes.arrowStart.indexOf('-xx') !== -1 ||
            this.designerAttributes.arrowEnd.indexOf('-xx') !== -1 ||
            this.designerAttributes.arrowStart.indexOf('-x') !== -1 ||
            this.designerAttributes.arrowEnd.indexOf('-x') !== -1) {
            this.designerAttributes.shadowEndArrowWidth = this.designerAttributes.width + SHADOW_MARKER_SIZE_INCREMENT_X;
        }

        this.designerAttributes.shadowArrowStartAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowStart, this.designerAttributes.shadowEndArrowWidth, this.designerAttributes.width, false);
        this.designerAttributes.shadowArrowEndAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowEnd, this.designerAttributes.shadowEndArrowWidth, this.designerAttributes.width, true);

        this.srcText = objDescriptor.srcText;
        this.dstText = objDescriptor.dstText;
        this.name = objDescriptor.name;/* || this.id;*/
        this.nameEdit = objDescriptor.nameEdit || false;
        this.srcTextEdit = objDescriptor.srcTextEdit || false;
        this.dstTextEdit = objDescriptor.dstTextEdit || false;

        //get segnment points
//        this.segmentPoints = [];
        if (objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS]) {
            var fixedP;
            var len =  objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS].length;
            var cx, cy;
            for (var i = 0; i < len; i += 1) {
                fixedP = this._fixXY({'x': objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][0],
                    'y': objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][1]});
                cx = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][2] : 0;
                cy = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][3] : 0;
                this.segmentPoints.push([fixedP.x, fixedP.y, cx, cy]);
            }
        }
    };

    NetLabelConnection.prototype._initializeConnectionProps = function (objDescriptor) {
        this.reconnectable = objDescriptor.reconnectable === true;
        this.editable = !!objDescriptor.editable;
        this.name = objDescriptor.name;/* || this.id;*/
        this.nameEdit = objDescriptor.nameEdit || false;

        this.srcTextEdit = objDescriptor.srcTextEdit || false;
        this.dstTextEdit = objDescriptor.dstTextEdit || false;

        // getting relevant src & dst IDs
        this.srcObjId = objDescriptor.srcObjId; // designer item ID (etc 'I_')
        this.srcSubCompId = objDescriptor.srcSubCompId; // port ID, undefined if port nonexistent
        this.dstObjId = objDescriptor.dstObjId;
        this.dstSubCompId = objDescriptor.dstSubCompId;

        this.srcObj = objDescriptor.srcObj;
        this.dstObj = objDescriptor.dstObj;
        this.srcParentObj = objDescriptor.srcParentObj;
        this.dstParentObj = objDescriptor.dstParentObj;

//        this.segmentPoints = [];
    };

    NetLabelConnection.prototype._createSrcLabel = function (x, y) {
        var self = this,
            srcID = self.srcSubCompId || self.srcObjId,
            dstID = self.dstSubCompId || self.dstObjId,
            srcPortLabelList = self.diagramDesigner.skinParts.$itemsContainer.find('[obj-id^="' + srcID + '"]')[0],
            srcPortLabel = self._netLabelBase.clone(),
            nbrOfSrcLabels = srcPortLabelList ? (srcPortLabelList.children ? srcPortLabelList.children.length : 0) : 0,
            expandLabel = self._expandLabelBase.clone()[0],
            dstText = self._getDstText(),
            existingLabel,
            existingCollapseLabel,
            collapsed;

        // check if connLists need to be collapsed:
        if (nbrOfSrcLabels > COLLAPSE_ON_INDEX && !$(srcPortLabelList).find('.show-all-labels')[0]) {
            expandLabel.setAttribute('id', srcID);
            $(srcPortLabelList).append(expandLabel);
        }

        // create a label list for the src object or src port
        if (!srcPortLabelList) {
            srcPortLabelList = self._netLabelListBase.clone()[0];
            srcPortLabelList.setAttribute("obj-id", srcID); // used to highlight actual object
            srcPortLabelList.style.position = "absolute";
        }

        srcPortLabelList.style.left = x.toString() + "px";
        srcPortLabelList.style.top = y.toString() + "px";

        // this should be done by the decorator -- if name is negated, show overline
        if (dstText.indexOf('!') === 0) {
            srcPortLabel.text(dstText.slice(1));
            srcPortLabel.css("text-decoration", "overline");
        } else {
            srcPortLabel.text(dstText);
            srcPortLabel.css("text-decoration", "none");
        }

        srcPortLabel.attr('id', dstID);
        srcPortLabel.attr('connId', self.id);

        existingLabel = $(srcPortLabelList).find('[connid^="' + self.id + '"]')[0];
        // if dst of the current connection hasn't been added & not collapsed, add it to the list of src object & make it visible
        if (!existingLabel) {
            if (nbrOfSrcLabels > COLLAPSE_ON_INDEX) {
                existingCollapseLabel = $(srcPortLabelList).find('.' + NetLabelWidgetConstants.NETLABEL_SHOW_ALL)[0];
                collapsed = existingCollapseLabel ? existingCollapseLabel.style.display === "none" : false;
                if (!collapsed) {
                    srcPortLabel.hide();
                }
            }
            $(srcPortLabelList).append(srcPortLabel);
            self.diagramDesigner.skinParts.$itemsContainer.append(srcPortLabelList);
        } else if (existingLabel.textContent !== dstText) {
            // handling the name update case
            existingLabel.textContent = dstText;
        }

        self.skinParts.srcNetLabel = $(srcPortLabelList).find('[connid^="' + self.id + '"]')[0];
    };

    NetLabelConnection.prototype._getSrcText = function () {
        var self = this,
            srcText,
            srcName = self.srcObj.getAttribute('name'),
            srcParentName = self.srcParentObj.getAttribute('name');

        srcText = self.srcSubCompId ? srcParentName + "." + srcName : srcName;

        return srcText;
    };

    NetLabelConnection.prototype._createDstLabel = function (x, y) {
        var self = this,
            srcID = self.srcSubCompId || self.srcObjId,
            dstID = self.dstSubCompId || self.dstObjId,
            dstPortLabelList = self.diagramDesigner.skinParts.$itemsContainer.find('[obj-id^="' + dstID + '"]')[0],
            dstPortLabel = self._netLabelBase.clone(),
            nbrOfDstLabels = dstPortLabelList ? (dstPortLabelList.children ? dstPortLabelList.children.length : 0) : 0,
            expandLabel = self._expandLabelBase.clone()[0],
            srcText = self._getSrcText(),
            existingLabel,
            existingCollapseLabel,
            collapsed,
            OFFSET = srcText.length >= 9 ? 80 : 20;

        if (nbrOfDstLabels > COLLAPSE_ON_INDEX && !$(dstPortLabelList).find('.show-all-labels')[0]) {
            expandLabel.setAttribute('id', dstID);
            $(dstPortLabelList).append(expandLabel);
        }


        // create a label list for the dst object or dst port
        if (!dstPortLabelList) {
            dstPortLabelList = self._netLabelListBase.clone()[0];
//            dstPortLabelList.setAttribute("objName", dstText);
            dstPortLabelList.setAttribute("obj-id", dstID);
            dstPortLabelList.style.position = "absolute";
        }

        dstPortLabelList.style.left = (x - OFFSET).toString() + "px";
        dstPortLabelList.style.top = y.toString() + "px";

        // this should be done by the decorator -- if name is negated, show overline
        if (srcText.indexOf('!') === 0) {
            dstPortLabel.text(srcText.slice(1));
            dstPortLabel.css('text-decoration', 'overline');
        } else {
            dstPortLabel.text(srcText);
            dstPortLabel.css('text-decoration', 'none');
        }

        // making the dstPortLabel
        dstPortLabel.attr('id', srcID);
        dstPortLabel.attr('connId', self.id);

        existingLabel = $(dstPortLabelList).find('[connid^="' + self.id + '"]')[0];
        // if src of the current connection hasn't been added, add it to the list of dst object
        if (!existingLabel) {
            if (nbrOfDstLabels > COLLAPSE_ON_INDEX) {
                existingCollapseLabel = $(dstPortLabelList).find('.' + NetLabelWidgetConstants.NETLABEL_SHOW_ALL)[0];
                collapsed = existingCollapseLabel ? existingCollapseLabel.style.display === "none" : false;
                if (!collapsed) {
                    dstPortLabel.hide();
                }
            }
            $(dstPortLabelList).append(dstPortLabel);
            self.diagramDesigner.skinParts.$itemsContainer.append(dstPortLabelList);
        } else if (existingLabel.textContent !== srcText) {
            // handling the name update case
            existingLabel.textContent = srcText;
        }
        self.skinParts.dstNetLabel = $(dstPortLabelList).find('[connid^="' + self.id + '"]')[0];
    };

    NetLabelConnection.prototype._getDstText = function () {
        var self = this,
            dstText,
            dstName = self.dstObj.getAttribute('name'),
            dstParentName = self.dstParentObj.getAttribute('name');

        dstText = self.dstSubCompId ? dstParentName + "." + dstName : dstName;

        return dstText;
    };

    NetLabelConnection.prototype.getBoundingBox = function () {
        var bBox,
            strokeWidthAdjust,
            dx,
            dy,
            shadowAdjust = 0,
            endMarkerBBox,
            bBoxPath,
            bPoints,
            len;

        if (this.showAsLabel) {
            bBox = { "x": 0,
                "y": 0,
                "x2": 0,
                "y2": 0,
                "width": 0,
                "height": 0 };
            return bBox;
        }

        //NOTE: getBBox will give back the bounding box of the original path without stroke-width and marker-ending information included
        if (this.skinParts.pathShadow) {
            bBoxPath = this.skinParts.pathShadow.getBBox();
            strokeWidthAdjust = this.designerAttributes.shadowWidth;
            shadowAdjust = this.designerAttributes.shadowArrowEndAdjust;
        } else if (this.skinParts.path) {
            bBoxPath = this.skinParts.path.getBBox();
            strokeWidthAdjust = this.designerAttributes.width;
        } else {
            bBoxPath = { "x": 0,
                "y": 0,
                "x2": 0,
                "y2": 0,
                "width": 0,
                "height": 0 };
        }

        //get a copy of bBoxPath
        //bBoxPath should not be touched because RaphaelJS reuses it unless the path is not redrawn
        bBox = { "x": bBoxPath.x,
            "y": bBoxPath.y,
            "x2": bBoxPath.x2,
            "y2": bBoxPath.y2,
            "width": bBoxPath.width,
            "height": bBoxPath.height };

        //calculate the marker-end size
        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowStart, strokeWidthAdjust, this._pathStartAngle, false);

            dx = shadowAdjust * Math.cos(this._pathStartAngle);
            dy = shadowAdjust * Math.sin(this._pathStartAngle);

            endMarkerBBox = { "x": this.sourceCoordinates.x - dx,
                "y": this.sourceCoordinates.y - dy,
                "x2": this.sourceCoordinates.x - dx,
                "y2": this.sourceCoordinates.y - dy};


            len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.sourceCoordinates.y - dy - bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.sourceCoordinates.y - dy - bPoints[len].y);
            }
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowEnd, strokeWidthAdjust, this._pathEndAngle, true);

            dx = shadowAdjust * Math.cos(this._pathEndAngle) ;
            dy = shadowAdjust * Math.sin(this._pathEndAngle) ;

            endMarkerBBox = endMarkerBBox || { "x": this.endCoordinates.x + dx,
                "y": this.endCoordinates.y + dy,
                "x2": this.endCoordinates.x + dx,
                "y2": this.endCoordinates.y + dy};


            len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.endCoordinates.x + dx + bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.endCoordinates.y + dy + bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.endCoordinates.x + dx + bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.endCoordinates.y + dy + bPoints[len].y);
            }
        }

        //when the line is vertical or horizontal, its dimension information needs to be tweaked
        //otherwise height or width will be 0, no good for selection matching
        if (bBox.height === 0 && bBox.width !== 0) {
            bBox.height = strokeWidthAdjust;
            bBox.y -= strokeWidthAdjust / 2;
            bBox.y2 += strokeWidthAdjust / 2;
        } else if (bBox.height !== 0 && bBox.width === 0) {
            bBox.width = strokeWidthAdjust;
            bBox.x -= strokeWidthAdjust / 2;
            bBox.x2 += strokeWidthAdjust / 2;
        } else if (bBox.height !== 0 && bBox.width !== 0) {
            //check if sourceCoordinates and endCoordinates are closer are
            // TopLeft - TopRight - BottomLeft - BottomRight
            if (Math.abs(bBox.x - this.sourceCoordinates.x) < Math.abs(bBox.x - this.endCoordinates.x)) {
                //source is on the left
                bBox.x -= Math.abs(Math.cos(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
                //target is on the right
                bBox.x2 +=  Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
            } else {
                //target is on the left
                bBox.x -=Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
                //source is on the right
                bBox.x2 += Math.abs(Math.cos(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
            }

            if (Math.abs(bBox.y - this.sourceCoordinates.y) < Math.abs(bBox.y - this.endCoordinates.y)) {
                //source is on the top
                bBox.y -= Math.abs(Math.sin(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
                //target is on the bottom
                bBox.y2 += Math.abs(Math.sin(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
            } else {
                //target is on the top
                bBox.y -= Math.abs(Math.sin(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
                //source is on the bottom
                bBox.y2 += Math.abs(Math.sin(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
            }

            bBox.width = bBox.x2 - bBox.x;
            bBox.height = bBox.y2 - bBox.y;
        }

        //figure out the outermost bounding box for the path itself and the endmarkers
        endMarkerBBox = endMarkerBBox || bBox;
        bBox.x = Math.min(bBox.x, endMarkerBBox.x);
        bBox.y = Math.min(bBox.y, endMarkerBBox.y);
        bBox.x2 = Math.max(bBox.x2, endMarkerBBox.x2);
        bBox.y2 = Math.max(bBox.y2, endMarkerBBox.y2);
        bBox.width = bBox.x2 - bBox.x;
        bBox.height = bBox.y2 - bBox.y;

        //safety check
        if (isNaN(bBox.x)) {bBox.x = 0;}
        if (isNaN(bBox.y)) {bBox.y = 0;}
        if (isNaN(bBox.x2)) {bBox.x2 = 0;}
        if (isNaN(bBox.y2)) {bBox.y2 = 0;}
        if (isNaN(bBox.width)) {bBox.width = 0;}
        if (isNaN(bBox.height)) {bBox.height = 0;}

        return bBox;
    };

    NetLabelConnection.prototype.onSelect = function (multiSelection) {

        this.selected = true;
        this.selectedInMultiSelection = multiSelection;

        if (!this.showAsLabel) {
            this._highlightPath();
            return;
        }
        this.highlight();
        this.showEndReconnectors();

        if (this.skinParts.srcNetLabel.style.display === "none") {
            this._showAllLabels(this.skinParts.srcNetLabel);
        }

        if (this.skinParts.dstNetLabel.style.display === "none") {
            this._showAllLabels(this.skinParts.dstNetLabel);
        }

        //in edit mode and when not participating in a multiple selection,
        //show endpoint connectors
        if (this.selectedInMultiSelection === true) {
            this._setEditMode(false);
        } else {
            //in edit mode and when not participating in a multiple selection,
            //show connectors
            if (this.diagramDesigner.mode === this.diagramDesigner.OPERATING_MODES.DESIGN) {
                this._setEditMode(false); // todo: set it to false for debugging purpose
            }
        }
    };

    NetLabelConnection.prototype._setEditMode = function (editMode) {
        if (this._readOnly === false && this._editMode !== editMode) {
            this._editMode = editMode;
            this.setConnectionRenderData(this._pathPoints);
            if (this._editMode === false) {
                this.hideEndReconnectors();
            }
        }
    };

    NetLabelConnection.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;

        if (!this.showAsLabel) {
            this._unHighlightPath();
            return;
        }

        this.unHighlight();
        this.hideEndReconnectors();
        this._setEditMode(false);
    };

    NetLabelConnection.prototype.readOnlyMode = function (readOnly) {
        this._readOnly = readOnly;
        if (readOnly === true) {
            //this._setEditMode(false);
        }
    };

    NetLabelConnection.prototype.showEndReconnectors = function () {
        var scale = Math.max(1, this.designerAttributes.width / 10);
        if (this.reconnectable) {
            if (this.srcSubCompId) {

                //editor handle at src
                this.skinParts.srcDragPoint = this.skinParts.srcDragPoint || $('<div/>', {
                    "data-end": NetLabelWidgetConstants.CONNECTION_END_SRC,
                    "data-id": this.id,
                    "class": NetLabelWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS + " " + NetLabelWidgetConstants.CONNECTION_END_SRC +
                        " " + NetLabelWidgetConstants.DESIGNER_NETLABEL_CLASS
                });

                this.skinParts.srcDragPoint.css({"position": "absolute",
                    "top": this.sourceCoordinates.y,
                    "left": this.sourceCoordinates.x});

                this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.srcDragPoint);
                //resize connectors to connection width
                this.skinParts.srcDragPoint.css('transform', "scale(" + scale + "," + scale + ")");
            }

            if (this.dstSubCompId) {

                this.skinParts.dstDragPoint = this.skinParts.dstDragPoint || $('<div/>', {
                    "data-end": NetLabelWidgetConstants.CONNECTION_END_DST,
                    "data-id": this.id,
                    "class": NetLabelWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS + " " + NetLabelWidgetConstants.CONNECTION_END_DST +
                        " " + NetLabelWidgetConstants.DESIGNER_NETLABEL_CLASS
                });

                this.skinParts.dstDragPoint.css({"position": "absolute",
                    "top": this.endCoordinates.y,
                    "left": this.endCoordinates.x});

                this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.dstDragPoint);
                //resize connectors to connection width
                this.skinParts.dstDragPoint.css('transform', "scale(" + scale + "," + scale + ")");
            }

        } else {
            this.hideEndReconnectors();
        }
    };

    NetLabelConnection.prototype.hideEndReconnectors = function () {
        if (this.skinParts.srcDragPoint) {
            this.skinParts.srcDragPoint.empty();
            this.skinParts.srcDragPoint.remove();
            this.skinParts.srcDragPoint = null;
        }

        if (this.skinParts.dstDragPoint) {
            this.skinParts.dstDragPoint.empty();
            this.skinParts.dstDragPoint.remove();
            this.skinParts.dstDragPoint = null;
        }
    };

    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    NetLabelConnection.prototype.highlight = function () {
        var srcObj,
            dstObj;

        $(this.skinParts.srcNetLabel).addClass(NetLabelWidgetConstants.SRCLABEL_HIGHLIGHT_CLASS);
        $(this.skinParts.dstNetLabel).addClass(NetLabelWidgetConstants.DSTLABEL_HIGHLIGHT_CLASS);

        srcObj = this.diagramDesigner.items[this.srcObjId];
        dstObj = this.diagramDesigner.items[this.dstObjId];

        srcObj.$el.css('background-color', '#FFD6D6');
        dstObj.$el.css('background-color', '#CFFAFA');
    };

    NetLabelConnection.prototype.unHighlight = function () {
        var srcObj,
            dstObj;

        $(this.skinParts.srcNetLabel).removeClass(NetLabelWidgetConstants.SRCLABEL_HIGHLIGHT_CLASS);
        $(this.skinParts.dstNetLabel).removeClass(NetLabelWidgetConstants.DSTLABEL_HIGHLIGHT_CLASS);

        srcObj = this.diagramDesigner.items[this.srcObjId];
        dstObj = this.diagramDesigner.items[this.dstObjId];
        srcObj.$el.css('background-color', 'initial');
        dstObj.$el.css('background-color', 'initial');
    };

    NetLabelConnection.prototype.update = function (objDescriptor) {
        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);
    };


    //ONLY IF CONNECTION CAN BE DRAWN BETWEEN CONNECTIONS
    NetLabelConnection.prototype.getConnectionAreas = function (id, isEnd) {
        var result = [];

        return result;
    };

    NetLabelConnection.prototype.showSourceConnectors = function (params) {
    };

    NetLabelConnection.prototype.hideSourceConnectors = function () {
    };

    NetLabelConnection.prototype.showEndConnectors = function () {
    };

    NetLabelConnection.prototype.hideEndConnectors = function () {
    };
    //END OF --- ONLY IF CONNECTION CAN BE DRAWN BETWEEN CONNECTIONS

    return NetLabelConnection;
});