import pm2 from 'pm2';
import os from 'node:os';

import { App } from './app';
import { handleUnit } from '../utils';
import { getLogger } from '../utils/logger';
import { getCpuCount } from '../utils/cpu';

const WORKER_CHECK_INTERVAL = 1000;
const SHOW_STAT_INTERVAL = 10000;
const MEMORY_MB = 1048576;
const MIN_SECONDS_TO_ADD_WORKER = 10;
const MIN_SECONDS_TO_RELEASE_WORKER = 30;

const TOTAL_CPUS = getCpuCount();
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

                Object.keys(APPS).forEach((appName) => {
                    if (!allAppsPids[appName]) {
                        // Delete app if not longer exists
                        delete APPS[appName];
                    }
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

        if (conf.debug) {
            setInterval(() => {
                getLogger().debug(
                    `System: Free memory ${handleUnit(os.freemem())}, Total memory: ${handleUnit(
                        os.totalmem()
                    )}`
                );

                if (Object.keys(APPS).length) {
                    for (const [, app] of Object.entries(APPS)) {
                        getLogger().debug(
                            `App "${app.getName()}" has ${app.getActiveWorkersCount()} worker(s). CPU: ${app.getCpuThreshold()}, Memory: ${app.getTotalUsedMemory()}MB`
                        );
                    }
                } else {
                    getLogger().debug(`No apps available`);
                }
            }, SHOW_STAT_INTERVAL);
        }
    });
};

function processWorkingApp(conf: IConfig, workingApp: App) {
    if (workingApp.isProcessing) {
        getLogger().debug(`App "${workingApp.getName()}" is busy`);
        return;
    }

    const cpuValues = [...workingApp.getCpuThreshold()];

    const maxCpuValue = Math.max(...workingApp.getCpuThreshold());
    const averageCpuValue = Math.round(
        cpuValues.reduce((sum, value) => sum + value) / cpuValues.length
    );

    const needIncreaseInstances =
        // Increase workers if any of CPUs loaded more then "scale_cpu_threshold"
        maxCpuValue >= conf.scale_cpu_threshold &&
        // Increase workers only if we have available CPUs for that
        workingApp.getActiveWorkersCount() < MAX_AVAILABLE_WORKERS_COUNT;

    if (needIncreaseInstances) {
        getLogger().info(
            `App "${workingApp.getName()}" needs increase instance because ${maxCpuValue}>${
                conf.scale_cpu_threshold
            }. CPUs ${JSON.stringify(cpuValues)}`
        );
    }

    if (needIncreaseInstances) {
        const freeMem = Math.round(os.freemem() / MEMORY_MB);
        const avgAppUseMemory = workingApp.getAverageUsedMemory();
        const memoryAfterNewWorker = freeMem - avgAppUseMemory;

        if (memoryAfterNewWorker <= 0) {
            // Increase workers only if we have anought free memory
            getLogger().debug(
                `Not enought memory to increase worker for app "${workingApp.getName()}". Free memory ${freeMem}MB, App average memeory ${avgAppUseMemory}MB `
            );
            return;
        }

        const now = Number(new Date());
        const secondsDiff = Math.round((now - workingApp.getLastIncreaseWorkersTime()) / 1000);

        if (secondsDiff > MIN_SECONDS_TO_ADD_WORKER) {
            // Add small delay between increasing workers to detect load
            getLogger().debug(`Increase workers for app "${workingApp.getName()}"`);

            workingApp.isProcessing = true;

            pm2.scale(workingApp.getName(), '+1', () => {
                workingApp.updateLastIncreaseWorkersTime();
                workingApp.isProcessing = false;
                getLogger().info(`App "${workingApp.getName()}" scaled with +1 worker`);
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
                getLogger().debug(`Decrease workers for app "${workingApp.getName()}"`);
                const newWorkers = workingApp.getActiveWorkersCount() - 1;

                workingApp.isProcessing = true;

                if (newWorkers >= workingApp.getDefaultWorkersCount()) {
                    pm2.scale(workingApp.getName(), newWorkers, () => {
                        workingApp.updateLastDecreaseWorkersTime();
                        workingApp.isProcessing = false;
                        getLogger().info(`App "${workingApp.getName()}" decresed one worker`);
                    });
                }
            }
        }
    }
}
