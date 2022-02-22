import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { environmentHelper, GithubService, processHelper } from '../Lib';

interface IRequestData {
    courseId?: string;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        context.log(`Initializing variables`);

        const body: IRequestData = req.rawBody ? JSON.parse(req.rawBody) : {};

        if (!body.courseId) {
            throw Error(
                `Could not generate course because course could not be identifier. Use 'courseId' body parameter to identify course.`
            );
        }
        const courseId: string = body.courseId;

        context.log(`Starting process for course '${courseId}'`);

        // prepare env variables
        const isDevelopment = environmentHelper.getRequiredValue('IsDevelopment')?.toLowerCase() === 'true';
        const buildCourseServerUrl = environmentHelper.getRequiredValue('BuildCourseServerUrl');
        const scormAppId = environmentHelper.getRequiredValue('ScormAppId');
        const scormAppSecret = environmentHelper.getRequiredValue('ScormAppSecret');
        const adaptGhBranch = environmentHelper.getRequiredValue('AdaptGhBranch');
        const adaptGhUsername = environmentHelper.getRequiredValue('AdaptGhUsername');
        const adaptGhToken = environmentHelper.getRequiredValue('AdaptGhToken');
        const adaptGhOwner = environmentHelper.getRequiredValue('AdaptGhOwner');
        const adaptGhRepository = environmentHelper.getRequiredValue('AdaptGhRepository');

        // This is a folder in Azure function where we have write access to
        const azureSharedFolderPath = `D:\\home`;
        const dataFolderName = `elearning-data`;
        const commitFolderPrefix = 'commit_';

        // prepare folder where course will be downloaded to
        const mainFolder: string = isDevelopment ? homedir() : azureSharedFolderPath;

        const dataFolderPath = `${mainFolder}\\${dataFolderName}`;

        // go to working directory where we have write access
        processHelper.changeWorkingDirectory(mainFolder);

        if (!existsSync(dataFolderName)) {
            // create data folder
            mkdirSync(dataFolderName);
        }

        // This is very imporant, we have to manually set Path in our script so that 'npm' version is using '8.1.0' rather then '1.x.y' (See issue https://github.com/Azure/azure-functions-nodejs-worker/issues/479)
        // The path below is a copy & paste from Azure Kudu app -> Environment section
        // This is also only needed in production, it works just fine locally
        if (!isDevelopment) {
            process.env[
                'Path'
            ] = `C:\\home\\site\\deployments\\tools;C:\\Program Files (x86)\\SiteExtensions\\Kudu\\96.40113.5578\\bin\\Scripts;C:\\Program Files (x86)\\MSBuild\\14.0\\Bin;C:\\Program Files\\Git\\cmd;C:\\Program Files (x86)\\Microsoft Visual Studio 11.0\\Common7\\IDE\\CommonExtensions\\Microsoft\\TestWindow;C:\\Program Files (x86)\\Microsoft SQL Server\\110\\Tools\\Binn;C:\\Program Files (x86)\\Microsoft SDKs\\F#\\3.1\\Framework\\v4.0;C:\\Program Files\\Git\\bin;C:\\Program Files\\Git\\usr\\bin;C:\\Program Files\\Git\\mingw64\\bin;C:\\Program Files (x86)\\npm\\8.1.0;C:\\Program Files (x86)\\bower\\1.7.9;C:\\Program Files (x86)\\grunt\\0.1.13;C:\\Program Files (x86)\\gulp\\3.9.0.1;C:\\Program Files (x86)\\funcpack\\1.0.0;C:\\Python27;C:\\Program Files (x86)\\PHP\\v5.6;C:\\Program Files (x86)\\nodejs\\16.13.0;C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Program Files\\Microsoft Network Monitor 3\\;C:\\Program Files\\Git\\cmd;C:\\Users\\imgadmin\\AppData\\Roaming\\npm;C:\\Program Files (x86)\\nodejs\\;C:\\Program Files (x86)\\Mercurial\\;C:\\Program Files (x86)\\Microsoft ASP.NET\\ASP.NET Web Pages\\v1.0\\;C:\\Windows\\system32\\config\\systemprofile\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Program Files (x86)\\dotnet;C:\\Program Files\\dotnet;C:\\Program Files\\Java\\Adoptium-Eclipse-Temurin-OpenJDK-8u302\\bin`;
        }

        const githubService = new GithubService({
            adaptGhRepository: adaptGhRepository,
            adaptGhBranch: adaptGhBranch,
            adaptGhOwner: adaptGhOwner,
            adaptGhToken: adaptGhToken,
            adaptGhUsername: adaptGhUsername
        });

        context.log(`Getting last GH commit identifier`);

        // get latest commit from GH so that we can version downloaded course data
        const lastCommitIdentifier = await githubService.getLastCommitIdentifierAsync();

        context.log(`Last commit identifier = '${lastCommitIdentifier}'`);

        const commitFolderName: string = `${commitFolderPrefix}${lastCommitIdentifier}`;

        const cloneFolder: string = `${dataFolderPath}\\${commitFolderName}`;
        const repositoryFolder: string = `${cloneFolder}\\${adaptGhRepository}`;

        // go to data folder
        processHelper.changeWorkingDirectory(dataFolderPath);

        if (existsSync(cloneFolder)) {
            context.log(`GitHub repository already exists for folder '${cloneFolder}'`);
        } else {
            // first clean old commit folders as we are limited by space in Azure functions
            const commitFolders = readdirSync(dataFolderPath);

            for (const folder of commitFolders) {
                if (folder.toLowerCase().startsWith(commitFolderPrefix.toLowerCase())) {
                    // only delete folder with our prefix -> this is to prevent accidental deletion on other folders
                    context.log(`Deleting previous commit folder '${folder}'`);
                    rmSync(folder, { recursive: true });
                }
            }

            // create clone folder
            context.log(`Create new folder '${commitFolderName}'`)
            mkdirSync(commitFolderName);

            const githubCloneUrl: string = `https://${adaptGhUsername}:${adaptGhToken}@github.com/${adaptGhOwner}/${adaptGhRepository}`;
            context.log(`Cloning branch '${adaptGhBranch}' of '${githubCloneUrl}'`);

            execSync(`git clone -b ${adaptGhBranch} ${githubCloneUrl}`, {
                cwd: cloneFolder // sets directory context for cloning
            });

            context.log(`Installing dependencies in '${repositoryFolder}'`);

            // install dependencies only once for each unique commit
            execSync(`npm i`, {
                cwd: repositoryFolder
            });
        }

        // build & publish course
        context.log(`Getting course data for '${courseId}' using serverUrl '${buildCourseServerUrl}'`);

        execSync(`npm run get:course -- courseId=${courseId} serverUrl=${buildCourseServerUrl}`, {
            cwd: repositoryFolder
        });

        context.log(`Building adapt course`);
        execSync(`npm run build`, {
            cwd: repositoryFolder
        });

        context.log(`Publishing course '${courseId}'`);

        execSync(
            `npm run publish:scormcloud  -- courseId=k01 scormAppId=${scormAppId} scormAppSecret=${scormAppSecret}`,
            {
                cwd: repositoryFolder
            }
        );

        context.log(`Finished`);

        context.res = {
            status: 200,
            body: `Completed for course '${courseId}'`
        };
    } catch (error) {
        const msg: string = `There was an error generating course. See Azure Logs for more details.`;
        context.log(msg);
        context.log(error);

        context.res = {
            status: 500,
            body: msg
        };

        throw Error(msg);
    }
};

export default httpTrigger;
