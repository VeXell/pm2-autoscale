"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const MONIT_ITEMS_LIMIT = 30;
class App {
    constructor(name, instances) {
        this.pids = {};
        this.defaultWorkersCount = 0;
        this.lastIncreaseWorkersTime = 0;
        this.lastDecreaseWorkersTime = 0;
        this.isProcessing = false;
        this.name = name;
        this.defaultWorkersCount = instances;
    }
    removeNotActivePids(activePids) {
        Object.keys(this.pids).forEach((pid) => {
            if (activePids.indexOf(Number(pid)) === -1) {
                delete this.pids[pid];
                this.updateLastDecreaseWorkersTime();
            }
        });
        return this;
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
            this.updateLastIncreaseWorkersTime();
        }
        else {
            const memoryValues = [pidData.memory, ...this.pids[pid].memory].slice(0, MONIT_ITEMS_LIMIT);
            const cpuValues = [pidData.cpu, ...this.pids[pid].cpu].slice(0, MONIT_ITEMS_LIMIT);
            this.pids[pid].memory = memoryValues;
            this.pids[pid].cpu = cpuValues;
        }
        return this;
    }
    updateLastIncreaseWorkersTime() {
        this.lastIncreaseWorkersTime = Number(new Date());
        return this;
    }
    updateLastDecreaseWorkersTime() {
        this.lastDecreaseWorkersTime = Number(new Date());
        return this;
    }
    getMonitValues() {
        return this.pids;
    }
    getCpuThreshold() {
        const cpuValues = [];
        for (const [, entry] of Object.entries(this.pids)) {
            const value = Math.round(entry.cpu.reduce((sum, value) => sum + value) / entry.cpu.length);
            cpuValues.push(value);
        }
        return cpuValues;
    }
    getAverageUsedMemory() {
        const memoryValues = this.getAveragePidsMemory();
        return Math.round(memoryValues.reduce((sum, value) => sum + value) / memoryValues.length);
    }
    getTotalUsedMemory() {
        const memoryValues = [];
        for (const [, entry] of Object.entries(this.pids)) {
            if (entry.memory[0]) {
                // Get the last memory value
                memoryValues.push(entry.memory[0]);
            }
        }
        return memoryValues.reduce((sum, value) => sum + value);
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
    getAveragePidsMemory() {
        const memoryValues = [];
        for (const [, entry] of Object.entries(this.pids)) {
            // Collect average memory for every pid
            const value = Math.round(entry.memory.reduce((sum, value) => sum + value) / entry.memory.length);
            memoryValues.push(value);
        }
        return memoryValues;
    }
}
exports.App = App;
