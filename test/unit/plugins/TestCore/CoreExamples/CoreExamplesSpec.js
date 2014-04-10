/**
 * Created by pmeijer on 4/9/2014.
 */

'use strict';
if (typeof window === 'undefined') {

    // server-side setup
    var requirejs = require("requirejs");
    var testConfig = require("../../../../../test-conf.js").testConfig;
    requirejs.config(testConfig.requirejs);

    var chai = require('chai'),
        should = chai.should(),
        assert = chai.assert,
        expect = chai.expect;
}

var semanticVersionPattern = /^\d+\.\d+\.\d+$/;

describe('CoreExamples', function () {
    var plugin,
        core,
        meta,
        mParent,
        orgNode,
        refNode,
        port1,
        port2,
        port3,
        conn11,
        conn21,
        conn33,
        m1;

    before(function (done) {
        requirejs(['plugin/CoreExamples/CoreExamples/CoreExamples', 'mocks/CoreMock'], function (CoreExamples, Core) {
            var rootNode,
                modelsNode,
                parentExample,
                mChild,
                referenceExample,
                connectionExample,
                p1;

            plugin = new CoreExamples();
            core = new Core();
            meta = createMETATypesTests(core);
            rootNode = core.getRootNode();
            modelsNode = core.createNode({base: meta.ModelElement, parent: rootNode});
            core.setAttribute(modelsNode, 'name', 'Models');

            // Parent Example
            parentExample = core.createNode({base: meta.ModelElement, parent: modelsNode});
            core.setAttribute(parentExample, 'name', 'ParentExample');
            mParent = core.createNode({base: meta.ModelElement, parent: parentExample});
            core.setAttribute(mParent, 'name', 'm_parent');
            mChild = core.createNode({base: meta.ModelElement, parent: mParent});
            core.setAttribute(mChild, 'name', 'm_child');

            // Reference Example
            referenceExample = core.createNode({base: meta.ModelElement, parent: modelsNode});
            core.setAttribute(referenceExample, 'name', 'ReferenceExample');
            orgNode = core.createNode({base: meta.ModelElement, parent: referenceExample});
            core.setAttribute(orgNode, 'name', 'm');
            refNode = core.createNode({base: meta.ModelRef, parent: referenceExample});
            core.setAttribute(refNode, 'name', 'm-ref');
            core.setPointer(refNode, 'ref', orgNode);
            done();

            // Connection Example
            connectionExample = core.createNode({base: meta.ModelElement, parent: modelsNode});
            core.setAttribute(connectionExample, 'name', 'ConnectionExample');
            m1 = core.createNode({base: meta.ModelElement, parent: connectionExample});
            core.setAttribute(m1, 'name', 'm1');
            p1 = core.createNode({base: meta.PortElement, parent: m1});
            core.setAttribute(p1, 'name', 'p1');

            port1 = core.createNode({base: meta.PortElement, parent: connectionExample});
            core.setAttribute(port1, 'name', 'Port1');
            port2 = core.createNode({base: meta.PortElement, parent: connectionExample});
            core.setAttribute(port2, 'name', 'Port2');
            port3 = core.createNode({base: meta.PortElement, parent: connectionExample});
            core.setAttribute(port3, 'name', 'Port3');

            conn11 = core.createNode({base: meta.ConnectionElement, parent: connectionExample});
            core.setAttribute(conn11, 'name', 'ConnectionElement');
            core.setPointer(conn11, 'src', port1);
            core.setPointer(conn11, 'dst', p1);

            conn21 = core.createNode({base: meta.ConnectionElement, parent: connectionExample});
            core.setAttribute(conn21, 'name', 'ConnectionElement');
            core.setPointer(conn21, 'src', port2);
            core.setPointer(conn21, 'dst', port1);

            conn33 = core.createNode({base: meta.ConnectionElement, parent: connectionExample});
            core.setAttribute(conn33, 'name', 'ConnectionElement');
            core.setPointer(conn33, 'src', port3);
            core.setPointer(conn33, 'dst', port3);
        });
    });

    it('getVersion', function () {
        expect(semanticVersionPattern.test(plugin.getVersion())).to.equal(true);
    });

    it('getDescription', function () {
        var description = plugin.getDescription();
        expect(typeof description === 'string' || description instanceof String).to.equal(true);
    });

    it('getName', function () {
        var name = plugin.getName();
        expect(typeof name === 'string' || name instanceof String).to.equal(true);
    });

    it('main should be implemented', function () {
        var proto = Object.getPrototypeOf(plugin);
        expect(proto.hasOwnProperty('main')).to.equal(true);
    });

    it('compareParentAndChildsParent', function (done) {
        var self = {};
        self.core = core;
        self.logger = new TestLogger();

        plugin.compareParentAndChildsParent(self, mParent, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages[0]).
                to.equal("Parent och its child's parent had the same GUID (as expected).");
            done();
        });
    });

    it('parentExample', function (done) {
        var self = {},
            children = [mParent];
        self.core = core;
        self.logger = new TestLogger();
        self.META = meta;
        self.compareParentAndChildsParent = plugin.compareParentAndChildsParent;
        plugin.parentExample(self, children, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages[0]).
                to.equal("Parent och its child's parent had the same GUID (as expected).");
            done();
        });
    });

    it('referenceExample', function (done) {
        var self = {},
            children = [orgNode, refNode];
        self.core = core;
        self.logger = new TestLogger();
        self.META = meta;
        self.isMetaTypeOf = plugin.isMetaTypeOf;
        plugin.referenceExample(self, children, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages[0]).
                to.equal("Reference and original node had the same GUID (as expected).");
            done();
        });
    });

    it('visitPorts1', function (done) {
        var self = {};
        self.core = core;
        self.logger = new TestLogger();

        plugin.visitPorts(self, port1, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages[0]).
                to.equal('ConnectionElement connects "Port1" and "p1".');
            done();
        });
    });

    it('visitPorts3', function (done) {
        var self = {};
        self.core = core;
        self.logger = new TestLogger();

        plugin.visitPorts(self, port3, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages[0]).
                to.equal('ConnectionElement connects "Port3" and "Port3".');
            done();
        });
    });

    it('connectionExample', function (done) {
        var self = {},
            children = [port1, port2, port3, conn11, conn21, conn33, m1];
        self.core = core;
        self.logger = new TestLogger();
        self.isMetaTypeOf = plugin.isMetaTypeOf;
        self.META = meta;
        self.visitPorts = plugin.visitPorts;

        plugin.connectionExample(self, children, function (err) {
            expect(err).to.equal('');
            expect(self.logger.info_messages.length).to.equal(3);
            done();
        });
    });

    // Helper Functions
    function createMETATypesTests(core) {
        var META = {},
            options = {},
            node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'ConnectionElement');
        META.ConnectionElement = node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'FCO');
        META.FCO = node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'Language');
        META.Language = node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'ModelElement');
        META.ModelElement = node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'ModelRef');
        META.ModelRef = node;

        node = core.createNode(options);
        core.setAttribute(node, 'name', 'PortElement');
        META.PortElement = node;

        return META;
    }

    function TestLogger() {
        this.log_messages = [];
        this.debug_messages = [];
        this.info_messages = [];
        this.warning_messages = [];
        this.error_messages = [];
    }

    TestLogger.prototype.log = function (msg) {
        this.log_messages.push(msg);
    };

    TestLogger.prototype.debug = function (msg) {
        this.debug_messages.push(msg);
    };

    TestLogger.prototype.info = function (msg) {
        this.info_messages.push(msg);
    };

    TestLogger.prototype.warning = function (msg) {
        this.warning_messages.push(msg);
    };

    TestLogger.prototype.error = function (msg) {
        this.error_messages.push(msg);
    };
});




