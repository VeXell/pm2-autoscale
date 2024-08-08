# PM2-Autoscale [![npm version](https://badge.fury.io/js/pm2-autoscale.svg)](https://www.npmjs.com/package/pm2-autoscale)

PM2 is a module that helps dynamically scale applications based on utilization demand.

## Motivation

By default, PM2 runs the application with a specified number of instances, which is not suitable when you have a few applications on one server with many CPUs, and you cannot predict which application will load your server. For example, if you have 48 CPUs and you run the application with `instances=max`, PM2 will run 48 instances, and every instance usually uses at least 100Mb of memory (~5GB for all instances). So, if you have 10 applications, it means you will use about 50GB of server memory without server load.

## Solution

The module helps dynamically increase application instances depending on CPU utilization of every application. You can run your application with the minimum required instances. When the module detects that CPU utilization is higher than `scale_cpu_threshold`, it will start increasing instances to a maximum of `CPUs-1` or `max_instances` (if set in the module config), provided that the server has available free memory. When the module detects that CPU utilization is decreasing, it will stop the unnecessary instances.

## Install

```bash
pm2 install pm2-autoscale
```

## Uninstall

```bash
pm2 uninstall pm2-autoscale
```

## Module Configuration

Default settings:

-   `scale_cpu_threshold` Maximum value of CPU utilization one of application instances when the module will try to increase application instances. (default to `30`)
-   `release_cpu_threshold` Average value of all CPUs utilization of the application when the module will decrease application instances (default to `5`)
-   `ignore_apps` Global setting to skip app by name from the autoscale. You can enter multiple apps names separated by comma (default to "" - empty string)
-   `max_workers` The maximum number of application instances this module will
    spawn up to. If set to `0` or `max` - the maximum number of instance will be the total number of CPUs (default to `-1`)
-   `min_seconds_to_add_worker` The minimum number of seconds between spawning new
    application instances if the load is high CPU utilization is high enough
    (defaults to `10`)
-   `min_seconds_to_release_worker` The minimum number of seconds between closing
    application instances if the CPU utilization is low enough (defaults to `30`)
-   `debug` Enable debug mode to show logs from the module (default to `false`)

To modify the module config values you can use the following commands:

```bash
pm2 set pm2-autoscale:debug true
pm2 set pm2-autoscale:scale_cpu_threshold 50
pm2 set pm2-autoscale:ignore_apps app1,app2
```

## Specific app configuration

If you want to configure specific settings for each of your apps, you can do it by changing the env variable, for example, in your ecosystem.config file.

Have a look at the example below:

```json
{
    "apps": [
        {
            "name": "testapp",
            "script": "build/app.js",
            "instances": "4",
            "autorestart": true,
            "watch": false,
            "max_memory_restart": "1024M",
            "vizion": false,
            "exec_mode": "cluster",
            "env": {
                "pm2_autoscale": {
                    "is_enabled": true,
                    "scale_cpu_threshold": 95,
                    "release_cpu_threshold": 50,
                    "max_workers": 5
                }
            }
        }
    ]
}
```

## Change log

### Version 1.4.0

-   Add new config option `max_workers`. The maximum number of application instances this module will
    spawn up to
-   Add new config option `min_seconds_to_add_worker`. The minimum number of seconds between spawning new
    application instances
-   Add new config option `min_seconds_to_release_worker`. The minimum number of seconds between closing
    application instances

All options are also available for app specific settings in the `ecosystem.config` file.

### Version 1.3.0

-   Add new config option `ignore_apps` exclude apps from autoscale
-   Add specific app configuration for `scale_cpu_threshold` and `release_cpu_threshold` in `env` section of your `ecosystem.config` file.
