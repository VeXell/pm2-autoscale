import 'pm2';

declare module 'pm2' {
    export type Pm2Env = {
        axm_options: {
            isModule: boolean;
        };
        axm_actions: any;
        exec_mode: 'fork_mode' | 'cluster_mode';
        status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status';
        instances: number;
        env: { pm2_autoscale: string } & Record<string, string>;
    };

    type ScaleAmount = number | `+${number}` | `-${number}`;
    function scale(appName: string, process: ScaleAmount, callback: () => void): void;
}
