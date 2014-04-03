/**
 * Created by Dana Zhang on 4/2/2014.
 * Functions are taken from https://github.com/touv/node-xml-writer/blob/master/lib/xml-writer.js with MIP license
 */

'use strict';
define([], function () {

    var XMLWriter = function () {
        this.initialize();
    };

    function strval(s) {
        if (typeof s == 'string') {
            return s;
        }
        else if (typeof s == 'function') {
            return s();
        }
        else if (s instanceof XMLWriter) {
            return s.toString();
        }
        else throw Error('Bad Parameter');
    }

    XMLWriter.prototype.initialize = function(indent, callback) {

        if (!(this instanceof XMLWriter)) {
            return new XMLWriter();
        }

        this.name_regex = /[_:A-Za-z][-._:A-Za-z0-9]*/;
        this.indent = indent ? true : false;
        this.output = '';
        this.stack = [];
        this.tags = 0;
        this.attributes = 0;
        this.attribute = 0;
        this.texts = 0;
        this.comment = 0;
        this.dtd = 0;
        this.root = '';
        this.pi = 0;
        this.cdata = 0;
        this.started_write = false;
        this.writer;
        this.writer_encoding = 'UTF-8';

        if (typeof callback == 'function') {
            this.writer = callback;
        } else {
            this.writer = function (s, e) {
                this.output += s;
            }
        }
    };

    XMLWriter.prototype.startDocument = function (version, encoding, standalone) {
        if (this.tags || this.attributes) return this;

        this.startPI('xml');
        this.startAttribute('version');
        this.text(typeof version == "string" ? version : "1.0");
        this.endAttribute();
        if (typeof encoding == "string") {
            this.startAttribute('encoding');
            this.text(encoding);
            this.endAttribute();
            this.writer_encoding = encoding;
        }
        if (standalone) {
            this.startAttribute('standalone');
            this.text("yes");
            this.endAttribute();
        }
        this.endPI();
        if (!this.indent) {
            this.write('\n');
        }
        return this;
    };

    XMLWriter.prototype.endDocument = function () {
        if (this.attributes) this.endAttributes();
        return this;
    };

    XMLWriter.prototype.startElement = function (name) {
        name = strval(name);
        if (!name.match(this.name_regex)) throw Error('Invalid Parameter');
        if (this.tags === 0 && this.root && this.root !== name) throw Error('Invalid Parameter');
        if (this.attributes) this.endAttributes();
        ++this.tags;
        this.texts = 0;
        if (this.stack.length > 0)
            this.stack[this.stack.length-1].containsTag = true;

        this.stack.push({
            name: name,
            tags: this.tags
        });
        if (this.started_write) this.indenter();
        this.write('<', name);
        this.startAttributes();
        this.started_write = true;
        return this;
    };

    XMLWriter.prototype.endElement = function () {
        if (!this.tags) return this;
        var t = this.stack.pop();
        if (this.attributes > 0) {
            if (this.attribute) {
                if (this.texts) this.endAttribute();
                this.endAttribute();
            }
            this.write('/');
            this.endAttributes();
        } else {
            if (t.containsTag) this.indenter();
            this.write('</', t.name, '>');
        }
        --this.tags;
        this.texts = 0;
        return this;
    };

    XMLWriter.prototype.writeElement = function (name, content) {
        return this.startElement(name).text(content).endElement();
    };

    XMLWriter.prototype.startAttribute = function (name) {
        name = strval(name);
        if (!name.match(this.name_regex)) throw Error('Invalid Parameter');
        if (!this.attributes && !this.pi) return this;
        if (this.attribute) return this;
        this.attribute = 1;
        this.write(' ', name, '="');
        return this;
    };

    XMLWriter.prototype.endAttribute = function () {
        if (!this.attribute) return this;
        this.attribute = 0;
        this.texts = 0;
        this.write('"');
        return this;
    };

    XMLWriter.prototype.writeAttribute = function (name, content) {
        return this.startAttribute(name).text(content).endAttribute();
    };

    XMLWriter.prototype.toString = function () {
        this.flush();
        return this.output;
    };

    XMLWriter.prototype.text = function (content) {
        content = strval(content);
        if (!this.tags && !this.comment && !this.pi && !this.cdata) return this;
        if (this.attributes && this.attribute) {
            ++this.texts;
            this.write(content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
            return this;
        } else if (this.attributes && !this.attribute) {
            this.endAttributes();
        }
        if (this.comment) {
            this.write(content);
        }
        else {
            this.write(content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        }
        ++this.texts;
        this.started_write = true;
        return this;
    };

    XMLWriter.prototype.indenter = function () {
        if (this.indent) {
            this.write('\n');
            for (var i = 1; i < this.tags; ++i) {
                this.write('\t');
            }
        }
    };

    XMLWriter.prototype.write = function () {
        for (var i = 0; i < arguments.length; i++) {
            this.writer(arguments[i], this.writer_encoding);
        }
    };

    XMLWriter.prototype.flush = function () {
        for (var i = this.tags; i > 0; i--) {
            this.endElement();
        }
        this.tags = 0;
    };

    XMLWriter.prototype.startPI = function (name) {
        name = strval(name);
        if (!name.match(this.name_regex)) throw Error('Invalid Parameter');
        if (this.pi) return this;
        if (this.attributes) this.endAttributes();
        if (this.started_write) this.indenter();
        this.write('<?', name);
        this.pi = 1;
        this.started_write = true;
        return this;
    };

    XMLWriter.prototype.endPI = function () {
        if (!this.pi) return this;
        this.write('?>');
        this.pi = 0;
        return this;
    };

    XMLWriter.prototype.writeElementNS = function (prefix, name, uri, content) {
        if (!content) {
            content = uri;
        }
        return this.startElementNS(prefix, name, uri).text(content).endElement();
    };

    XMLWriter.prototype.startElementNS = function (prefix, name, uri) {
        prefix = strval(prefix);
        name = strval(name);

        if (!prefix.match(this.name_regex)) throw Error('Invalid Parameter');
        if (!name.match(this.name_regex)) throw Error('Invalid Parameter');
        if (this.attributes) this.endAttributes();
        ++this.tags;
        this.texts = 0;
        if (this.stack.length > 0)
            this.stack[this.stack.length-1].containsTag = true;

        this.stack.push({
            name: prefix + ':' + name,
            tags: this.tags
        });
        if (this.started_write) this.indenter();
        this.write('<', prefix + ':' + name);
        this.startAttributes();
        this.started_write = true;
        return this;
    };

    XMLWriter.prototype.startAttributes = function () {
        this.attributes = 1;
        return this;
    };

    XMLWriter.prototype.endAttributes = function () {
        if (!this.attributes) return this;
        if (this.attribute) this.endAttribute();
        this.attributes = 0;
        this.attribute = 0;
        this.texts = 0;
        this.write('>');
        return this;
    };

    XMLWriter.prototype.startAttributeNS = function (prefix, name, uri) {
        prefix = strval(prefix);
        name = strval(name);

        if (!prefix.match(this.name_regex)) throw Error('Invalid Parameter');
        if (!name.match(this.name_regex)) throw Error('Invalid Parameter');
        if (!this.attributes && !this.pi) return this;
        if (this.attribute) return this;
        this.attribute = 1;
        this.write(' ', prefix + ':' + name, '="');
        return this;
    };




    return XMLWriter;
});