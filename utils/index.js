"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnit = void 0;
function handleUnit(bytes, precision = 0) {
    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
    if (bytes >= 0 && bytes < kilobyte) {
        return bytes + 'B';
    }
    else if (bytes >= kilobyte && bytes < megabyte) {
        return (bytes / kilobyte).toFixed(precision) + 'KB';
    }
    else if (bytes >= megabyte && bytes < gigabyte) {
        return (bytes / megabyte).toFixed(precision) + 'MB';
    }
    else if (bytes >= gigabyte && bytes < terabyte) {
        return (bytes / gigabyte).toFixed(precision) + 'GB';
    }
    else if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + 'TB';
    }
    else {
        return bytes + 'B';
    }
}
exports.handleUnit = handleUnit;
