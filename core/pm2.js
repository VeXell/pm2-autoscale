"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPm2Connect = void 0;
const pm2_1 = __importDefault(require("pm2"));
const app_1 = require("./app");
const WORKER_INTERVAL = 2000;
const SHOW_STAT_INTERVAL = 10000;
const MEMORY_MB = 1048576;
const MIN_SECONDS_TO_ADD_WORKER = 30;
const MIN_SECONDS_TO_RELEASE_WORKER = 30;
const APPS = {};
let backgroundTimer;
const startPm2Connect = (conf) => {
    pm2_1.default.connect((err) => {
        if (err)
            return console.error(err.stack || err);
        backgroundTimer = setInterval(function () {
            pm2_1.default.list((err, apps) => {
                if (err)
                    return console.error(err.stack || err);
                const allAppsPids = {};
                apps.forEach((app) => {
                    // Fill all apps pids
                    if (!allAppsPids[app.name]) {
                        allAppsPids[app.name] = [];
                    }
                    allAppsPids[app.name].push(app.pid);
                });
                apps.forEach((app) => {
                    const pm2_env = app.pm2_env;
                    if (pm2_env.axm_options.isModule) {
                        return;
                    }
                    if (pm2_env.exec_mode === 'fork_mode') {
                        return;
                    }
                    if (!app.name || !app.pid || app.pm_id === undefined) {
                        return;
                    }
                    if (pm2_env.status !== 'online') {
                        delete APPS[app.name];
                        return;
                    }
                    if (!APPS[app.name]) {
                        APPS[app.name] = new app_1.App(app.name, pm2_env.instances);
                    }
                    const workingApp = APPS[app.name];
                    const activePids = allAppsPids[app.name];
                    if (activePids) {
                        APPS[app.name].removeNotActivePids(activePids);
                    }
                    workingApp.updatePid({
                        id: app.pid,
                        memory: Math.round((app.monit.memory || 0) / MEMORY_MB),
                        cpu: app.monit.cpu || 0,
                        pmId: app.pm_id,
                    });
                    processWorkingApp(conf, workingApp);
                });
            });
        }, WORKER_INTERVAL);
        setInterval(function () {
            for (const [, app] of Object.entries(APPS)) {
                console.log(`App "${app.getName()}" has ${app.getActiveWorkersCount()} worker(s). CPU: ${app.getCpuThreshold()}`);
            }
        }, SHOW_STAT_INTERVAL);
        console.log(backgroundTimer);
    });
};
exports.startPm2Connect = startPm2Connect;
function processWorkingApp(conf, workingApp) {
    const cpuValues = [...workingApp.getCpuThreshold()];
    const maxCpuValue = Math.max(...workingApp.getCpuThreshold());
    const averageCpuValue = Math.round(cpuValues.reduce((sum, value) => sum + value) / cpuValues.length);
    if (maxCpuValue >= conf.scale_cpu_threshold) {
        const now = Number(new Date());
        const secondsDiff = Math.round((now - workingApp.getLastIncreaseWorkersTime()) / 1000);
        if (secondsDiff > MIN_SECONDS_TO_ADD_WORKER) {
            console.log('INFO: Increase workers');
            pm2_1.default.scale(workingApp.getName(), '+1', () => {
                console.log(`App "${workingApp.getName()}" scaled with +1 worker`);
            });
        }
    }
    else {
        if (workingApp.getActiveWorkersCount() > workingApp.getDefaultWorkersCount() &&
            averageCpuValue < conf.release_cpu_threshold) {
            const now = Number(new Date());
            const secondsDiff = Math.round((now - workingApp.getLastDecreaseWorkersTime()) / 1000);
            if (secondsDiff > MIN_SECONDS_TO_RELEASE_WORKER) {
                console.log('INFO: Decrease workers');
                const newWorkers = workingApp.getActiveWorkersCount() - 1;
                if (newWorkers >= workingApp.getDefaultWorkersCount()) {
                    pm2_1.default.scale(workingApp.getName(), newWorkers, () => {
                        console.log(`App "${workingApp.getName()}" scaled with -1 worker`);
                    });
                }
            }
        }
    }
}
