import { Database } from '../database/Database';
import { describeError } from '../errors';
import { Log } from '../types/Log';

export type InteractionType = 'command' | 'button' | 'select' | 'modal' | 'search';
export type Outcome = 'ok' | 'error' | 'timeout';

export interface AnalyticsEvent {
    interactionType: InteractionType;
    interactionName: string;
    userId: string;
    guildId: string | null;
    executionId: string;
    flowId: string;
    durationMs: number;
    outcome: Outcome;
    errorCode: string | null;
    detail: string | null;
}

/** Writes analytics.events. The bot only ever inserts; it never reads analytics. */
export class AnalyticsService {
    private static readonly SERVICE = 'pg';

    constructor(private readonly db: Database, private readonly log: Log) {}

    /** Fire-and-forget: never awaited, never able to fail an interaction. A failed write is logged and dropped. */
    record(event: AnalyticsEvent): void {
        void this.db.query(
            `INSERT INTO analytics.events
               (service, interaction_type, interaction_name, user_id, guild_id, execution_id, flow_id, duration_ms, outcome, error_code, detail)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                AnalyticsService.SERVICE, event.interactionType, event.interactionName, event.userId, event.guildId,
                event.executionId, event.flowId, Math.round(event.durationMs), event.outcome, event.errorCode, event.detail,
            ],
        ).catch((error: unknown) => {
            this.log.error(`Analytics write failed for ${event.interactionType} ${event.interactionName} (dropped)\n${describeError(error)}`);
        });
    }
}
