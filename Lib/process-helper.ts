export class ProcessHelper {

    changeWorkingDirectory(directory: string): void {
        process.chdir(directory);
    }

}

export const processHelper = new ProcessHelper();