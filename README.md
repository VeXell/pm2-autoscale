# PM2-Autoscale

PM2 module to help dynamically scale applications based on utilization demand. [![npm version](https://badge.fury.io/js/pm2-autoscale.svg)](https://www.npmjs.com/package/pm2-autoscale)

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

## Configuration

Default settings:

-   `scale_cpu_threshold` Maximum value of CPU utilization one of application instances when the module will try to increase application instances. (default to `30`)
-   `release_cpu_threshold` Average value of all CPUs utilization of the application when the module will decrease application instances (default to `5`)
-   `debug` Enable debug mode to show logs from the module (default to `false`)

To modify the module config values you can use the following commands:

```bash
pm2 set pm2-autoscale:debug true
pm2 set pm2-autoscale:scale_cpu_threshold 50
```
