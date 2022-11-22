"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const pmx_1 = __importDefault(require("pmx"));
const pm2_1 = __importDefault(require("pm2"));
const app_1 = require("./lib/app");
const WORKER_INTERVAL = 1000;
const APPS = {};
let backgroundTimer;
pmx_1.default.configureModule({
    human_info: [
        ['Status', 'Module ready!'],
        ['Comment', 'This is a superb comment the user should see'],
        ['IP', 'my machine ip!'],
    ],
});
pmx_1.default.initModule({
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
}, function () { });
pm2_1.default.connect((err) => {
    if (err)
        return console.error(err.stack || err);
    backgroundTimer = setInterval(function () {
        pm2_1.default.list((err, apps) => {
            if (err)
                return console.error(err.stack || err);
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
                console.log('----- APPPPPP -------');
                if (!APPS[app.name]) {
                    APPS[app.name] = new app_1.App(app.name, pm2_env.instances);
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
