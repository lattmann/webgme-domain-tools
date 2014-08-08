define([], function() {
    var JobInfo = function (parameters) {
        this.hash = parameters.hash;
        this.resultHashes = parameters.resultHashes || [];
        this.resultSuperSet = parameters.resultSuperSet || null;
        this.userId = parameters.userId || [];
        this.status = parameters.status || 'CREATED'; // TODO: define a constant for this
        this.createTime = parameters.createTime || null;
        this.startTime = parameters.startTime || null;
        this.finishTime = parameters.finishTime || null;
        this.worker = parameters.worker || null;
        this.labels = parameters.labels || [];
    };

    JobInfo.finishedStatuses = [ 'SUCCESS', 'ANALYSIS_FAILED', 'FAILED_TO_GET_SOURCE_METADATA', 'FAILED_SOURCE_IS_NOT_COMPLEX', 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED',
        'FAILED_CREATING_SOURCE_ZIP', 'FAILED_UNZIP', 'FAILED_EXECUTOR_CONFIG', 'FAILED_TO_ARCHIVE_FILE', 'FAILED_TO_SAVE_JOINT_ARTIFACT', 'FAILED_TO_ADD_OBJECT_HASHES',
        'FAILED_TO_SAVE_ARTIFACT'];
    JobInfo.isFinishedStatus = function(status)
    {
        return JobInfo.finishedStatuses.indexOf(status) !== -1;
    }

    return JobInfo;
});