import pm2 from 'pm2';
import os from 'node:os';
import pidusage from 'pidusage';

import { App, IPidDataInput } from './app';
import { handleUnit } from '../utils';
import { getLogger } from '../utils/logger';
import { getCpuCount } from '../utils/cpu';

type IPidsData = Record<number, IPidDataInput>;
type IAppData = { pids: number[]; pm2Env: pm2.Pm2Env; appConfig: IAppEnvConfig };

const WORKER_CHECK_INTERVAL = 1000;
const SHOW_STAT_INTERVAL = 10000;
const MEMORY_MB = 1048576;
const MIN_SECONDS_TO_ADD_WORKER = 10;
const MIN_SECONDS_TO_RELEASE_WORKER = 30;

const TOTAL_CPUS = getCpuCount();
const MAX_AVAILABLE_WORKERS_COUNT = TOTAL_CPUS - 1;

const APPS: { [key: string]: App } = {};

const isMonitoringApp = (app: pm2.ProcessDescription) => {
    const pm2_env = app.pm2_env as pm2.Pm2Env;

    if (
        pm2_env.axm_options.isModule ||
        !app.name ||
        !app.pid ||
        app.pm_id === undefined || // pm_id might be zero
        pm2_env.status !== 'online'
    ) {
        return false;
    }

    return true;
};

const updateAppPidsData = (workingApp: App, pidData: IPidDataInput) => {
    workingApp.updatePid({
        id: pidData.id,
        memory: Math.round((pidData.memory || 0) / MEMORY_MB),
        cpu: pidData.cpu || 0,
        pmId: pidData.pmId,
    });
};

const getPm2AutoscaleConfig = (app: pm2.ProcessDescription) => {
    const pm2_env = app.pm2_env as pm2.Pm2Env;
    const logger = getLogger();

    let config: IAppEnvConfig = {};

    if (pm2_env.env.pm2_autoscale) {
        try {
            config = JSON.parse(pm2_env.env.pm2_autoscale);
        } catch (error) {
            logger.debug(`Error: Can not parse "pm2_autoscale" env config for app ${app.name}`);
        }
    }

    return config;
};

const detectActiveApps = (conf: IConfig) => {
    const logger = getLogger();

    pm2.list((err, apps) => {
        if (err) return console.error(err.stack || err);

        const pidsMonit: IPidsData = {};
        const mapAppData: { [key: string]: IAppData } = {};
        const appsToIgnore = (conf.ignore_apps ? conf.ignore_apps.split(',') : []).map((entry) =>
            entry.trim()
        );

        // Fill all available apps pids
        apps.forEach((app) => {
            const appName = app.name;

            if (!isMonitoringApp(app) || !appName || !app.pid || app.pm_id === undefined) {
                return;
            }

            if (appsToIgnore.includes(appName)) {
                logger.debug(`App "${appName}" is in ignore list`);
                delete APPS[appName];
                return;
            }

            const appConfig = getPm2AutoscaleConfig(app);

            if (appConfig.is_enabled === false) {
                logger.debug(`Autoscale module is disabled in the app "${appName}"`);
                delete APPS[appName];
                return;
            }

            const pm2Env = app.pm2_env as pm2.Pm2Env;

            if (!mapAppData[appName]) {
                mapAppData[appName] = {
                    pids: [],
                    pm2Env,
                    appConfig,
                };
            }

            mapAppData[appName].pids.push(app.pid);

            // Fill monitoring data
            pidsMonit[app.pid] = { cpu: 0, memory: 0, pmId: app.pm_id, id: app.pid };
        });

        // Filters existed apps which do not have active pids
        Object.keys(APPS).forEach((appName) => {
            const processingApp = mapAppData[appName];

            if (!processingApp) {
                logger.debug(`Delete ${appName} because it not longer exists`);
                delete APPS[appName];
            } else {
                const workingApp = APPS[appName];

                if (workingApp) {
                    const activePids = processingApp.pids;

                    workingApp.removeNotActivePids(activePids);

                    // Set new config data
                    workingApp.setAppConfig(mapAppData[appName].appConfig);
                }
            }
        });

        // Create new apps if not exist
        for (const [appName, entry] of Object.entries(mapAppData)) {
            if (entry.pids.length && !APPS[appName]) {
                APPS[appName] = new App(appName, entry.pm2Env.instances);
            }
        }

        // Get all pids to monit
        const pids = Object.keys(pidsMonit);

        if (pids.length) {
            // Get real pids data.
            // !ATTENTION! Can not use PM2 app.monit because of incorrect values of CPU usage
            pidusage(pids, (err, stats) => {
                if (err) return console.error(err.stack || err);

                // Fill data for all pids
                if (stats && Object.keys(stats).length) {
                    for (const [pid, stat] of Object.entries(stats)) {
                        const pidId = Number(pid);

                        if (pidId && pidsMonit[pidId]) {
                            pidsMonit[pidId].cpu = Math.round(stat.cpu * 10) / 10;
                            pidsMonit[pidId].memory = stat.memory;
                        }
                    }
                }

                for (const [appName, entry] of Object.entries(mapAppData)) {
                    const workingApp = APPS[appName];

                    if (workingApp) {
                        entry.pids.forEach((pidId) => {
                            const monit = pidsMonit[pidId];

                            if (monit) {
                                updateAppPidsData(workingApp, monit);
                            }
                        });

                        // Processing...
                        processWorkingApp(conf, workingApp);
                    }
                }
            });
        }
    });
};

export const startPm2Connect = (conf: IConfig) => {
    pm2.connect((err) => {
        if (err) return console.error(err.stack || err);

        setInterval(() => {
            detectActiveApps(conf);
        }, WORKER_CHECK_INTERVAL);

        if (conf.debug) {
            setInterval(() => {
                getLogger().debug(
                    `System: Free memory ${handleUnit(os.freemem())}, Total memory: ${handleUnit(
                        os.totalmem()
                    )}. CPU available: ${MAX_AVAILABLE_WORKERS_COUNT}`
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

    const scaleCpuThreshold =
        workingApp.getAppConfig().scale_cpu_threshold ?? conf.scale_cpu_threshold;
    const releaseCpuThreshold =
        workingApp.getAppConfig().release_cpu_threshold ?? conf.release_cpu_threshold;

    const needIncreaseInstances =
        // Increase workers if any of CPUs loaded more then "scaleCpuThreshold"
        maxCpuValue >= scaleCpuThreshold &&
        // Increase workers only if we have available CPUs for that
        workingApp.getActiveWorkersCount() < MAX_AVAILABLE_WORKERS_COUNT;

    if (needIncreaseInstances) {
        getLogger().info(
            `App "${workingApp.getName()}" needs increase instance because ${maxCpuValue}>${scaleCpuThreshold}. CPUs ${JSON.stringify(
                cpuValues
            )}`
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
            // Decrease workers if average CPUs load less then "releaseCpuThreshold"
            averageCpuValue < releaseCpuThreshold &&
            // Process only if we have more workers than default value
            workingApp.getActiveWorkersCount() > workingApp.getDefaultWorkersCount()
        ) {
            const now = Number(new Date());
            const secondsDiff = Math.round((now - workingApp.getLastDecreaseWorkersTime()) / 1000);

            if (secondsDiff > MIN_SECONDS_TO_RELEASE_WORKER) {
                getLogger().debug(
                    `Decrease workers for app "${workingApp.getName()}". Average CPU ${averageCpuValue} < Release CPU ${releaseCpuThreshold}`
                );
                const newWorkers = workingApp.getActiveWorkersCount() - 1;

                if (newWorkers >= workingApp.getDefaultWorkersCount()) {
                    workingApp.isProcessing = true;

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
