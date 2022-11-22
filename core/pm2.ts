import pm2 from 'pm2';

import { App } from './app';

const WORKER_INTERVAL = 2000;
const SHOW_STAT_INTERVAL = 10000;
const MEMORY_MB = 1048576;
const MIN_SECONDS_TO_SCALE_APP = 30;

const APPS: { [key: string]: App } = {};

let backgroundTimer: number | undefined;

export const startPm2Connect = (conf: IConfig) => {
    pm2.connect((err) => {
        if (err) return console.error(err.stack || err);

        backgroundTimer = setInterval(function () {
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
                console.log(
                    `App "${app.getName()}" has ${app.getActiveWorkersCount()} worker(s). CPU: ${app.getCpuThreshold()}`
                );
            }
        }, SHOW_STAT_INTERVAL);

        console.log(backgroundTimer);
    });
};

function processWorkingApp(conf: IConfig, workingApp: App) {
    const cpuValues = [...workingApp.getCpuThreshold()];

    const maxCpuValue = Math.max(...workingApp.getCpuThreshold());
    const averageCpuValue = Math.round(
        cpuValues.reduce((sum, value) => sum + value) / cpuValues.length
    );

    if (maxCpuValue >= conf.scale_cpu_threshold) {
        const now = Number(new Date());
        const secondsDiff = Math.round((now - workingApp.getLastIncreasedWorkersTime()) / 1000);

        if (secondsDiff > MIN_SECONDS_TO_SCALE_APP) {
            console.log('Increase workers');
            pm2.scale(workingApp.getName(), '+1', () => {
                console.log(`App "${workingApp.getName()}" scaled with +1 worker`);
            });
        }
    } else {
        if (
            workingApp.getActiveWorkersCount > workingApp.getDefaultWorkersCount &&
            averageCpuValue < conf.release_cpu_threshold
        ) {
            console.log('INFO: Decrease workers');
        }
    }
}
