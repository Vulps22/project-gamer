/**
 * The composition root. Every service is built here, with its dependencies passed in.
 * No service imports the database, the logger or another service itself.
 */
import { Queue } from 'bullmq';
import { REST } from 'discord.js';
import { AppConfig } from '../config/AppConfig';
import { Database } from '../database/Database';
import { DiscordApi } from '../discord/DiscordApi';
import { JobQueue } from '../jobs/JobQueue';
import { HttpFetch, ScraperRegistry } from '../scrapers/Scraper';
import { SteamScraper } from '../scrapers/SteamScraper';
import { Log } from '../types/Log';
import { AnalyticsService } from './AnalyticsService';
import { GameService } from './GameService';
import { LfgService } from './LfgService';
import { LfgSessionService } from './LfgSessionService';
import { LibraryService } from './LibraryService';
import { ServerService } from './ServerService';
import { SubmissionNotifier } from './SubmissionNotifier';
import { SubmissionService } from './SubmissionService';
import { UserService } from './UserService';

export interface Services {
    config: AppConfig;
    log: Log;
    discord: DiscordApi;
    jobs: JobQueue;
    scrapers: ScraperRegistry;
    analytics: AnalyticsService;
    users: UserService;
    servers: ServerService;
    games: GameService;
    library: LibraryService;
    submissions: SubmissionService;
    submissionNotifier: SubmissionNotifier;
    lfg: LfgService;
    lfgSessions: LfgSessionService;
}

export interface ServiceDependencies {
    config: AppConfig;
    log: Log;
    db: Database;
    rest: REST;
    queue: Queue;
    http: HttpFetch;
}

export function createServices({ config, log, db, rest, queue, http }: ServiceDependencies): Services {
    const discord = new DiscordApi(rest);
    const games = new GameService(db);
    const library = new LibraryService(db);
    const lfg = new LfgService(db);
    return {
        config,
        log,
        discord,
        jobs: new JobQueue(queue),
        scrapers: new ScraperRegistry({ steam: new SteamScraper(http) }),
        analytics: new AnalyticsService(db, log),
        users: new UserService(db),
        servers: new ServerService(db),
        games,
        library,
        submissions: new SubmissionService(db, games, library),
        submissionNotifier: new SubmissionNotifier(discord, games, config),
        lfg,
        lfgSessions: new LfgSessionService(lfg, discord, log),
    };
}
