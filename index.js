"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// @ts-ignore
const pmx_1 = tslib_1.__importDefault(require("pmx"));
const pm2_1 = require("./core/pm2");
const logger_1 = require("./utils/logger");
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
}, function (err, conf) {
    if (err)
        return console.error(err.stack || err);
    const moduleConfig = conf.module_conf;
    (0, logger_1.initLogger)({ isDebug: moduleConfig.debug });
    (0, pm2_1.startPm2Connect)(moduleConfig);
    pmx_1.default.configureModule({
        human_info: [
            ['Status', 'Module enabled'],
            ['Debug', moduleConfig.debug ? 'Enabled' : 'Disabled'],
        ],
    });
});
