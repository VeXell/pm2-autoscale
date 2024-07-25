"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCpuCount = void 0;
const tslib_1 = require("tslib");
const node_child_process_1 = require("node:child_process");
const node_os_1 = tslib_1.__importDefault(require("node:os"));
// We also get it from nproc and use the minimum of the two.
const getConcurrencyFromNProc = () => {
    try {
        return parseInt((0, node_child_process_1.execSync)('nproc', { stdio: 'pipe' }).toString().trim(), 10);
    }
    catch (error) {
        return null;
    }
};
const getCpuCount = () => {
    if (node_os_1.default.availableParallelism) {
        return node_os_1.default.availableParallelism();
    }
    const node = node_os_1.default.cpus().length;
    const nproc = getConcurrencyFromNProc();
    if (nproc === null) {
        return node;
    }
    return Math.min(nproc, node);
};
exports.getCpuCount = getCpuCount;
