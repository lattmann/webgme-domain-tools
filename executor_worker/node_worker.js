var nodeRequire = require;

if (typeof define !== 'undefined') {

    define('node_worker', [
        'eventDispatcher',
        'blob/BlobClient',
        'logManager',
        'executor/ExecutorWorker',
        'executor/JobInfo',
        'executor/ExecutorWorkerController',
        'url'
    ], function (eventDispatcher, BlobClient, logManager, ExecutorWorker, JobInfo, ExecutorWorkerController, url) {
        return function (webGMEUrl, tempPath, parameters) {
            var worker;
            var webGMEPort = url.parse(webGMEUrl).port || (url.parse(webGMEUrl).protocol === 'https:' ? 443 : 80);
            worker = new ExecutorWorker({
                server: url.parse(webGMEUrl).hostname,
                serverPort: webGMEPort,
                httpsecure: url.parse(webGMEUrl).protocol === 'https:',
                sessionId: undefined,
                availableProcessesContainer: availableProcessesContainer,
                workingDirectory: tempPath,
                executorNonce: parameters.executorNonce
            });

            console.log("Connecting to " + webGMEUrl);

            var callback;
            worker.queryWorkerAPI(function (err, response) {
                if (!err) {
                    console.log("Connected to " + webGMEUrl);
                }
                var refreshPeriod = 60 * 1000;
                callback = callback || function (err, response) {
                    if (err) {
                        console.log("Error connecting to " + webGMEUrl + " " + err);
                    } else {}
                    if (response && response.refreshPeriod) {
                        refreshPeriod = response.refreshPeriod;
                    }
                    var timeoutID = setTimeout(function () {
                        worker.queryWorkerAPI(callback);
                    }, refreshPeriod);
                };
                callback(err, response);
            });
            var cancel = function() {
                callback = function() {};
            };
            return cancel;
        };
    });
}

if (nodeRequire.main === module) {
    var requirejs = require('./node_worker.classes.build').requirejs;

    [
        'superagent',
        'fs',
        'util',
        'events',
        'path',
        'child_process',
        'minimatch',
        'rimraf',
        'url'
    ].forEach(function (name) {
        requirejs.s.contexts._.defined[name] = nodeRequire(name);
    });

    GLOBAL.WebGMEGlobal = {
        getConfig: function () {
            return {};
        }
    } // server: config.server, serverPort: config.port, httpsecure: config.protocol==='https' }; } };

    var webGMEUrls = Object.create(null);
    var maxConcurrentJobs = 1;
    var availableProcessesContainer = {
        availableProcesses: maxConcurrentJobs
    }; // shared among all ExecutorWorkers

    requirejs(['node_worker'], function (addWebGMEConnection) {
        var fs = nodeRequire('fs');
        var path = nodeRequire('path');

        function readConfig() {
            var config = {
                "http://localhost:8888": {}
            };
            try {
                var configJSON = fs.readFileSync('config.json', {
                    encoding: 'utf8'
                });
                config = JSON.parse(configJSON);
                if (Array.isArray(config)) {
                    var oldConfig = config;
                    config = {};
                    oldConfig.forEach(function (webGMEUrl) {
                        config[webGMEUrl] = {};
                    });
                } else if (typeof (config) === "string") {
                    config = {
                        config: {}
                    };
                } else {}
            } catch (e) {
                if (e.code !== "ENOENT") {
                    throw e;
                }
            }
            Object.getOwnPropertyNames(config).forEach(function (key) {
                var webGMEUrl;
                if (key.indexOf("http") === 0) {
                    webGMEUrl = key;
                    if (Object.prototype.hasOwnProperty.call(webGMEUrls, webGMEUrl)) {
                    } else {
                        webGMEUrls[webGMEUrl] = addWebGMEConnection(webGMEUrl, path.join(workingDirectory, '' + workingDirectoryCount++), config[webGMEUrl]);
                    }
                } else if (key === "maxConcurrentJobs") {
                    availableProcessesContainer.availableProcesses += config[maxConcurrentJobs] - maxConcurrentJobs;
                    maxConcurrentJobs = config[maxConcurrentJobs];
                } else {
                    console.log("Unknown configuration key " + key);
                }
            });
            // remove webGMEUrls no longer in config
            Object.getOwnPropertyNames(webGMEUrls).forEach(function (webGMEUrl) {
                if (Object.prototype.hasOwnProperty.call(config, webGMEUrl) === false) {
                    console.log("Removing " + webGMEUrl);
                    webGMEUrls[webGMEUrl]();
                    delete webGMEUrls[webGMEUrl];
                }
            });
        }

        var workingDirectoryCount = 0;
        var workingDirectory = 'executor-temp';
        var rimraf = nodeRequire('rimraf');
        rimraf(workingDirectory, function (err) {
            if (err) {
                console.log('Could not delete working directory (' + workingDirectory + '), err: ' + err);
                process.exit(2);
            }
            if (!fs.existsSync(workingDirectory)) {
                fs.mkdirSync(workingDirectory);
            }

            readConfig();
            fs.watch("config.json", function () {
                setTimeout(readConfig, 200);
            }); // setTimeout: likely handle O_TRUNC of config.json (though `move config.json.tmp config.json` is preferred)
        });
    });

}