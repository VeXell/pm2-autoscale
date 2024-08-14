type ICommonConfig = {
    scale_cpu_threshold: number;
    release_cpu_threshold: number;
    max_workers: number | string | 'max';
    min_seconds_to_add_worker: number;
    min_seconds_to_release_worker: number;
};

type IAppEnvConfig = Partial<ICommonConfig> & {
    is_enabled?: boolean;
};

type IConfig = ICommonConfig & {
    debug: boolean;
    ignore_apps: string;
};

type IPMXConfig = {
    module_conf: IConfig;
};
