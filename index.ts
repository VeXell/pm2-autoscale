// @ts-ignore
import pmx from 'pmx';

import { startPm2Connect } from './core/pm2';

/*pmx.configureModule({
    human_info: [
        ['Status', 'Module ready!'],
        ['Comment', 'This is a superb comment the user should see'],
        ['IP', 'my machine ip!'],
    ],
});*/

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
    function (err: any, conf: IPMXConfig) {
        if (err) return console.error(err.stack || err);

        startPm2Connect(conf.module_conf);
    }
);
