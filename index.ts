// @ts-ignore
import pmx from 'pmx';
import pm2 from 'pm2';

import { App } from './lib/app';

const WORKER_INTERVAL = 1000;
const APPS: { [key: string]: App } = {};

let backgroundTimer: number | undefined;

pmx.configureModule({
    human_info: [
        ['Status', 'Module ready!'],
        ['Comment', 'This is a superb comment the user should see'],
        ['IP', 'my machine ip!'],
    ],
});

pmx.initModule(
    {
        widget: {
            el: {
                probes: true,
                actions: true,
            },

            block: {
                actions: false,
                issues: true,
                meta: true,
            },
        },
    },
    function () {}
);

pm2.connect((err) => {
    if (err) return console.error(err.stack || err);

    backgroundTimer = setInterval(function () {
        pm2.list((err, apps) => {
            if (err) return console.error(err.stack || err);

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

                console.log('----- APPPPPP -------');

                if (!APPS[app.name]) {
                    APPS[app.name] = new App(app.name, pm2_env.instances);
                }

                const workingApp = APPS[app.name];
                workingApp.updatePid({
                    id: app.pid,
                    memory: app.monit.memory || 0,
                    cpu: app.monit.cpu || 0,
                    pmId: app.pm_id,
                });

                console.log(app.monit.cpu);
                console.log(app);

                // if its a module and the rotate of module is disabled, ignore
                /*if (typeof app.pm2_env.axm_options.isModule !== 'undefined' && !ROTATE_MODULE)
                    return;

                // if apps instances are multi and one of the instances has rotated, ignore
                if (app.pm2_env.instances > 1 && appMap[app.name]) return;

                appMap[app.name] = app;

                proceed_app(app, false);*/

                console.log(workingApp);
            });
        });
    }, WORKER_INTERVAL);

    console.log(backgroundTimer);
});
