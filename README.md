# PM2-Autoscale [![npm version](https://badge.fury.io/js/pm2-autoscale.svg)](https://www.npmjs.com/package/pm2-autoscale)

PM2 module to help dynamically scale applications based on utilization demand.

## Motivation

By default PM2 runs application with specified number of instances which is not suatable when you have few application on one server with many CPUs and you can not predict which application will load your server. For example you have 48 CPUs and if you run application with `instances=max` PM2 will run 48 instances and every instance usually uses at least 100Mb on the Memory (~5GB for all instances). So if you have 10 application it means you will use about 50GB of the server memory without server load.

## Solution

The module helps dynamically increase application instances depends on CPUs utilization of every application. You can run you application with minimum required instances. When module detects that CPU utilisation is higher then `scale_cpu_threshold` it will start increasing instances to max `CPUs-1` and if server has available free memory. When module detects CPU utilization is decreasing it will stop useless instances.

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
-   `debug` Enable debug mode to show logs from the module (default to `false`)

To modify the module config values you can use the following commands:

```bash
pm2 set pm2-autoscale:debug true
pm2 set pm2-autoscale:scale_cpu_threshold 50
pm2 set pm2-autoscale:ignore_apps app1,app2
```

## Spicific app configuration

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
                    "release_cpu_threshold": 50
                }
            }
        }
    ]
}
```

## Change log

### Version 1.3.0

-   Add new config option `ignore_apps` exclude apps from autoscale
-   Add specific app configuration for `scale_cpu_threshold` and `release_cpu_threshold` in `env` section of your `ecosystem.config` file.
