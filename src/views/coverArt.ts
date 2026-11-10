import { ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder } from 'discord.js';

/**
 * A game's cover art, full width under a separator, as v1's LFG post showed it. Every view with cover art
 * uses this, so game cards and LFG posts look alike. Does nothing when there's no art.
 */
export function addCoverArt(container: ContainerBuilder, coverArt: string | null, gameName: string): ContainerBuilder {
    if (!coverArt) {
        return container;
    }
    return container
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(coverArt).setDescription(gameName.slice(0, 1024)),
        ));
}
