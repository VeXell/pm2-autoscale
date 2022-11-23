type IConfig = {
    scale_cpu_threshold: number;
    release_cpu_threshold: number;
    debug: boolean;
};

type IPMXConfig = {
    module_conf: IConfig;
};
