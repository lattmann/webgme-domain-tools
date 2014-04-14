/**
 * Created by pmeijer on 4/14/2014.
 */

var parser = require('xml2json'),
    fs = require('fs'),
    xmlFileName = 'GroundedRI_cfg1.adm',
    xmlString,
    jsonObj;

xmlString = fs.readFileSync(xmlFileName);
jsonObj = parser.toJson(xmlString, {object: true});

console.log(jsonObj.toString());
