/**
 * Run Command :
 *  node_modules\.bin\istanbul.cmd --hook-run-in-context cover node_modules\mocha\bin\_mocha -- -R spec test/plugins/CyPhyLight.CyPhy2Modelica/CyPhyLight.CyPhy2Modelica.js
 */

'use strict';
var requirejs = require("requirejs"),
    chai = require('chai'),
    should = chai.should(),
    assert = chai.assert,
    expect = chai.expect;

requirejs.config({
    baseUrl: '.',
    nodeRequire: require
});

var SPRING_COMPONENT_CONFIG =  {
    "exportedComponentClass": "Modelica.Mechanics.Translational.Components.Spring",
    "components": [
        {
            "parameters": [
                {
                    "name": "c",
                    "value": ""
                },
                {
                    "name": "s_rel0",
                    "value": 0
                }
            ],
            "connectors": [],
            "extends": [
                {
                    "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliant",
                    "parameters": []
                }
            ],
            "fullName": "Modelica.Mechanics.Translational.Components.Spring"
        },
        {
            "parameters": [],
            "connectors": [
                {
                    "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_a",
                    "name": "flange_a"
                },
                {
                    "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_b",
                    "name": "flange_b"
                }
            ],
            "extends": [],
            "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliant"
        }
    ]
};


describe('CyPhy2Modelica Helper Methods', function (){
    var plugin = requirejs('src/plugins/CyPhyLight.CyPhy2Modelica/CyPhyLight.CyPhy2Modelica');

    describe('getComponentContent', function() {
            var componentConfig,
            flatData = {parameters: {}, connectors: {}};

        componentConfig = SPRING_COMPONENT_CONFIG;

        plugin.getComponentContent(flatData, componentConfig, componentConfig.exportedComponentClass);

        it ('should be two parameters', function() {
            var cnt = 0;
            for (var key in flatData.parameters){
                cnt += 1;
            }

            expect(cnt).to.equal(2);
        });

        it ('should be two connectors', function() {
            var cnt = 0;
            for (var key in flatData.connectors){
                cnt += 1;
            }

            expect(cnt).to.equal(2);
        });

        it ('names of parameters correct', function() {
            expect("c" in flatData.parameters).to.equal(true);
            expect("s_rel0" in flatData.parameters).to.equal(true);
        });

        it ('names of connectors correct', function() {
            expect("flange_a" in flatData.connectors).to.equal(true);
            expect("flange_b" in flatData.connectors).to.equal(true);
        });
    });

    describe('PopulateComponent', function() {
//        var CoreMock = requirejs('../../src/mocks/CoreMock');
//        var core = new CoreMock();
//        var meta = core.createNode({parent: core.getRootNode()});
//        var ModelicaModel = core.createNode({parent: meta});
//        var Property = core.createNode({parent: meta});
//        var CyPhyLight = {
//            Component: core.createNode({parent: meta})
//        };
    });
});