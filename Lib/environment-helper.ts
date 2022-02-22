export class EnvironmentHelper {
  getRequiredValue(variableName: string): string {
    const value = process.env[variableName];

    if (!value) {
      throw Error(`Missing environment variable '${variableName}'`);
    }

    return value;
  }
}

export const environmentHelper = new EnvironmentHelper();
