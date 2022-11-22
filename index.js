"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const pmx_1 = __importDefault(require("pmx"));
const pm2_1 = require("./core/pm2");
/*pmx.configureModule({
    human_info: [
        ['Status', 'Module ready!'],
        ['Comment', 'This is a superb comment the user should see'],
        ['IP', 'my machine ip!'],
    ],
});*/
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
    (0, pm2_1.startPm2Connect)(conf.module_conf);
});
