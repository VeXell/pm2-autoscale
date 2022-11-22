"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const MONIT_ITEMS_LIMIT = 100;
class App {
    constructor(name, instances) {
        this.pids = {};
        this.defaultWorkersCount = 0;
        this.lastIncreaseWorkersTime = 0;
        this.lastDecreaseWorkersTime = 0;
        this.name = name;
        this.defaultWorkersCount = instances;
    }
    removeNotActivePids(activePids) {
        Object.keys(this.pids).forEach((pid) => {
            if (activePids.indexOf(Number(pid)) === -1) {
                delete this.pids[pid];
                this.lastDecreaseWorkersTime = Number(new Date());
            }
        });
    }
    updatePid(pidData) {
        const pid = pidData.id;
        if (!this.pids[pid]) {
            this.pids[pid] = {
                id: pid,
                pmId: pidData.pmId,
                memory: [pidData.memory],
                cpu: [pidData.cpu],
            };
            this.lastIncreaseWorkersTime = Number(new Date());
        }
        else {
            const memoryValues = [pidData.memory, ...this.pids[pid].memory].slice(0, MONIT_ITEMS_LIMIT);
            const cpuValues = [pidData.cpu, ...this.pids[pid].cpu].slice(0, MONIT_ITEMS_LIMIT);
            this.pids[pid].memory = memoryValues;
            this.pids[pid].cpu = cpuValues;
        }
    }
    getMonitValues() {
        return this.pids;
    }
    getCpuThreshold() {
        const cpuValues = [];
        for (const [, entry] of Object.entries(this.pids)) {
            const value = Math.round(entry.cpu.reduce((sum, cpuValue) => sum + cpuValue) / entry.cpu.length);
            cpuValues.push(value);
        }
        return cpuValues;
    }
    getLastIncreaseWorkersTime() {
        return this.lastIncreaseWorkersTime;
    }
    getLastDecreaseWorkersTime() {
        return this.lastDecreaseWorkersTime;
    }
    getName() {
        return this.name;
    }
    getDefaultWorkersCount() {
        return this.defaultWorkersCount;
    }
    getActiveWorkersCount() {
        return Object.keys(this.pids).length;
    }
}
exports.App = App;
