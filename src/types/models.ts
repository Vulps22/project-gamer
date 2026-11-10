/** Row shapes, as the bot reads them. Column names are snake_case, as in the database. */

export interface Account {
    id: string;
    discord_id: string;
}

export interface Server {
    id: string;
    discord_id: string;
    lfg_channel_id: string | null;
    lfg_role_id: string | null;
}

export interface Store {
    id: string;
    name: string;
    slug: string;
    base_url: string | null;
    scraper: string | null;
}

export interface Game {
    id: string;
    name: string;
    cover_art: string | null;
}

export interface StoreLink {
    store_name: string;
    url: string;
}

export interface Submission {
    id: string;
    submitted_by: string;
    url: string;
    store_id: string | null;
    status: 'pending' | 'approved' | 'rejected';
}

export interface LfgPost {
    id: string;
    server_id: string;
    posted_by: string;
    game_id: string;
    type: 'immediate' | 'scheduled';
    vc_channel_id: string | null;
    message_id: string | null;
    status: 'active' | 'expired' | 'cancelled';
}
