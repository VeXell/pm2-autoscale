import pm2 from 'pm2';
import os from 'node:os';

import { App } from './app';

const WORKER_CHECK_INTERVAL = 1000;
const SHOW_STAT_INTERVAL = 10000;
const MEMORY_MB = 1048576;
const MIN_SECONDS_TO_ADD_WORKER = 30;
const MIN_SECONDS_TO_RELEASE_WORKER = 30;

const TOTAL_CPUS = os.cpus().length;
const MAX_AVAILABLE_WORKERS_COUNT = TOTAL_CPUS - 1;

const APPS: { [key: string]: App } = {};

export const startPm2Connect = (conf: IConfig) => {
    pm2.connect((err) => {
        if (err) return console.error(err.stack || err);

        setInterval(() => {
            pm2.list((err, apps) => {
                if (err) return console.error(err.stack || err);

                const allAppsPids: { [key: string]: number[] } = {};

                apps.forEach((app) => {
                    // Fill all apps pids
                    if (!allAppsPids[app.name]) {
                        allAppsPids[app.name] = [];
                    }

                    allAppsPids[app.name].push(app.pid);
                });

                apps.forEach((app) => {
                    const pm2_env = app.pm2_env as pm2.Pm2Env;

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
                        APPS[app.name] = new App(app.name, pm2_env.instances);
                    }

                    const workingApp = APPS[app.name];

                    const activePids = allAppsPids[app.name];
                    if (activePids) {
                        workingApp.removeNotActivePids(activePids);
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
        }, WORKER_CHECK_INTERVAL);

        setInterval(() => {
            for (const [, app] of Object.entries(APPS)) {
                console.log(
                    `App "${app.getName()}" has ${app.getActiveWorkersCount()} worker(s). CPU: ${app.getCpuThreshold()}.`
                );
            }
        }, SHOW_STAT_INTERVAL);
    });
};

function processWorkingApp(conf: IConfig, workingApp: App) {
    if (workingApp.isProcessing) {
        console.log(`INFO: App "${workingApp.getName()}" is busy`);
        return;
    }

    const cpuValues = [...workingApp.getCpuThreshold()];

    const maxCpuValue = Math.max(...workingApp.getCpuThreshold());
    const averageCpuValue = Math.round(
        cpuValues.reduce((sum, value) => sum + value) / cpuValues.length
    );

    if (
        // Increase workers if any of CPUs loaded more then "scale_cpu_threshold"
        maxCpuValue >= conf.scale_cpu_threshold &&
        // Increase workers only if we have available CPUs for that
        workingApp.getActiveWorkersCount() < MAX_AVAILABLE_WORKERS_COUNT
    ) {
        const now = Number(new Date());
        const secondsDiff = Math.round((now - workingApp.getLastIncreaseWorkersTime()) / 1000);

        if (secondsDiff > MIN_SECONDS_TO_ADD_WORKER) {
            // Add small delay between increasing workers to detect load
            console.log('INFO: Increase workers');

            workingApp.isProcessing = true;

            pm2.scale(workingApp.getName(), '+1', () => {
                workingApp.updateLastIncreaseWorkersTime();
                workingApp.isProcessing = false;
                console.log(`App "${workingApp.getName()}" scaled with +1 worker`);
            });
        }
    } else {
        if (
            // Decrease workers if average CPUs load less then "release_cpu_threshold"
            averageCpuValue < conf.release_cpu_threshold &&
            // Process only if we have more workers than default value
            workingApp.getActiveWorkersCount() > workingApp.getDefaultWorkersCount()
        ) {
            const now = Number(new Date());
            const secondsDiff = Math.round((now - workingApp.getLastDecreaseWorkersTime()) / 1000);

            if (secondsDiff > MIN_SECONDS_TO_RELEASE_WORKER) {
                console.log('INFO: Decrease workers');
                const newWorkers = workingApp.getActiveWorkersCount() - 1;

                workingApp.isProcessing = true;

                if (newWorkers >= workingApp.getDefaultWorkersCount()) {
                    pm2.scale(workingApp.getName(), newWorkers, () => {
                        workingApp.updateLastDecreaseWorkersTime();
                        workingApp.isProcessing = false;
                        console.log(`App "${workingApp.getName()}" decresed one worker`);
                    });
                }
            }
        }
    }
}
