"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
class App {
    constructor(name, instances) {
        this.pids = {};
        this.defaultInstances = 0;
        this.name = name;
        this.defaultInstances = instances;
    }
    updatePid(pidData) {
        const pid = pidData.id;
        if (!this.pids[pid]) {
            this.pids[pid] = pidData;
        }
        else {
            this.pids[pid].memory = pidData.memory;
            this.pids[pid].cpu = pidData.cpu;
        }
    }
    getName() {
        return this.name;
    }
    getDefaultInstances() {
        return this.defaultInstances;
    }
}
exports.App = App;
