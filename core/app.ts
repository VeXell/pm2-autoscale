type IPidDataInput = {
    id: number;
    pmId: number;
    memory: number;
    cpu: number;
};

type IPidData = {
    id: number;
    pmId: number;
    memory: number[];
    cpu: number[];
};

const MONIT_ITEMS_LIMIT = 100;

export class App {
    private readonly pids: { [key: number]: IPidData } = {};
    private readonly name: string;
    private readonly defaultWorkersCount: number = 0;
    private lastIncreaseWorkersTime: number = 0;
    private lastDecreaseWorkersTime: number = 0;

    constructor(name: string, instances: number) {
        this.name = name;
        this.defaultWorkersCount = instances;
    }

    removeNotActivePids(activePids: number[]) {
        Object.keys(this.pids).forEach((pid) => {
            if (activePids.indexOf(Number(pid)) === -1) {
                delete this.pids[pid];
                this.lastDecreaseWorkersTime = Number(new Date());
            }
        });
    }

    updatePid(pidData: IPidDataInput) {
        const pid = pidData.id;

        if (!this.pids[pid]) {
            this.pids[pid] = {
                id: pid,
                pmId: pidData.pmId,
                memory: [pidData.memory],
                cpu: [pidData.cpu],
            };

            this.lastIncreaseWorkersTime = Number(new Date());
        } else {
            const memoryValues = [pidData.memory, ...this.pids[pid].memory].slice(
                0,
                MONIT_ITEMS_LIMIT
            );
            const cpuValues = [pidData.cpu, ...this.pids[pid].cpu].slice(0, MONIT_ITEMS_LIMIT);

            this.pids[pid].memory = memoryValues;
            this.pids[pid].cpu = cpuValues;
        }
    }

    getMonitValues() {
        return this.pids;
    }

    getCpuThreshold(): number[] {
        const cpuValues: number[] = [];

        for (const [, entry] of Object.entries(this.pids)) {
            const value = Math.round(
                entry.cpu.reduce((sum, cpuValue) => sum + cpuValue) / entry.cpu.length
            );
            cpuValues.push(value);
        }

        return cpuValues;
    }

    getLastIncreaseWorkersTime() {
        return this.lastIncreaseWorkersTime;
    }

    getLastDecreaseWorkersTime() {
        return this.lastDecreaseWorkersTime;
    }

    getName() {
        return this.name;
    }

    getDefaultWorkersCount() {
        return this.defaultWorkersCount;
    }

    getActiveWorkersCount() {
        return Object.keys(this.pids).length;
    }
}
