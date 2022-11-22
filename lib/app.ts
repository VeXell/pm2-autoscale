type IPidData = {
    id: number;
    pmId: number;
    memory: number;
    cpu: number;
};

export class App {
    private readonly pids: { [key: number]: IPidData } = {};
    private readonly name: string;
    private readonly defaultInstances: number = 0;

    constructor(name: string, instances: number) {
        this.name = name;
        this.defaultInstances = instances;
    }

    updatePid(pidData: IPidData) {
        const pid = pidData.id;

        if (!this.pids[pid]) {
            this.pids[pid] = pidData;
        } else {
            this.pids[pid].memory = pidData.memory;
            this.pids[pid].cpu = pidData.cpu;
        }
    }

    getName() {
        return this.name;
    }

    getDefaultInstances() {
        return this.defaultInstances;
    }
}
