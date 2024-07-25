type IConfig = {
    scale_cpu_threshold: number;
    release_cpu_threshold: number;
    debug: boolean;
    ignoreApp: string;
};

type IPMXConfig = {
    module_conf: IConfig;
};
