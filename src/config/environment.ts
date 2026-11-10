export const ENVIRONMENTS = ['dev', 'stage', 'prod'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function parseEnvironment(value: string | undefined): Environment {
    const environment = ENVIRONMENTS.find(e => e === value);
    if (!environment) {
        throw new Error(`ENVIRONMENT must be one of ${ENVIRONMENTS.join(', ')} (got ${value ?? 'nothing'})`);
    }
    return environment;
}
