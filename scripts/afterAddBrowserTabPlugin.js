const fs = require('fs');
const Q = require('q');

module.exports = function(ctx) {
    var deferral = new Q.defer();

    if (ctx.opts.plugins.includes('cordova-plugin-browsertab')) {

        let file = ctx.opts.projectRoot + '/plugins/cordova-plugin-browsertab/src/android/BrowserTab.gradle';
        console.log(file);

        checkForFix(file);
    }

    return deferral.promise;
};

function checkForFix(file) {
    fs.readFile(file, function read(err, data) {
        if (err) {
            throw err;
        }

        if (!data.includes('minSdkFix')) {
            writeFix(file);
        }
    });
}

function writeFix(file) {
    fs.appendFile(file, '\n\n// minSdkFix\nminSdkVersion = 21;\ncdvMinSdkVersion = minSdkVersion;\n' +
        'ext.cdvMinSdkVersion = minSdkVersion;', function(err) {
        if (err) {
            console.log('Adding minSdkFix failed: ' + err);
        }
        console.log("Writing success!");
    });
}