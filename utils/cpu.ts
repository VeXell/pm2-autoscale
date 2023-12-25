import { execSync } from 'node:child_process';
import os from 'node:os';

// We also get it from nproc and use the minimum of the two.
const getConcurrencyFromNProc = () => {
    try {
        return parseInt(execSync('nproc', { stdio: 'pipe' }).toString().trim(), 10);
    } catch (error) {
        return null;
    }
};

export const getCpuCount = () => {
    if (os.availableParallelism) {
        return os.availableParallelism();
    }

    const node = os.cpus().length;
    const nproc = getConcurrencyFromNProc();

    if (nproc === null) {
        return node;
    }

    return Math.min(nproc, node);
};
