import { MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

/** A game's cover art, full width, as v1 showed it on game cards and LFG posts. */
export function coverImage(coverArt: string, gameName: string): MediaGalleryBuilder {
    return new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(coverArt).setDescription(`${gameName} Branding Image`.slice(0, 1024)),
    );
}
