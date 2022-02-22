import axios from 'axios';

export interface IGithubServiceConfig {
    adaptGhBranch: string;
    adaptGhUsername: string;
    adaptGhToken: string;
    adaptGhOwner: string;
    adaptGhRepository: string;
}

interface IGHCommitResponse {
    sha: string;
    commit: {
        url: string;
    };
}

export class GithubService {
    constructor(private config: IGithubServiceConfig) {}

    async getLastCommitIdentifierAsync(): Promise<string> {
        const lastCommit = await axios.get<IGHCommitResponse>(
            `https://api.github.com/repos/${this.config.adaptGhOwner}/${this.config.adaptGhRepository}/commits/${this.config.adaptGhBranch}`,
            {
                auth: {
                    username: 'enngage',
                    password: this.config.adaptGhToken
                }
            }
        );

        return lastCommit.data.sha;
    }
}
