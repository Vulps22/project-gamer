import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { customIdsFor } from '../../discord/customIds';
import { UserFacingError } from '../../errors';
import { CommandHandler } from '../../types/Handler';
import { MAX_PLAYER_OPTIONS, pickPlayersView, PlayerOption } from '../../views/lfgViews';
import { guildContext } from '../context';
import { requireGame } from '../shared/requireGame';
import { EPHEMERAL } from '../shared/ephemeral';

export const lfg: CommandHandler = {
    name: 'lfg',
    data: new SlashCommandBuilder()
        .setName('lfg')
        .setDescription('Find people to play with')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(sub => sub
            .setName('play')
            .setDescription('Play a game now: pick players who own it, or post an open invitation')
            .addStringOption(option => option.setName('game').setDescription('The game to play').setRequired(true).setAutocomplete(true)))
        .toJSON(),

    async execute(interaction, services) {
        await interaction.deferReply(EPHEMERAL);
        const { server } = await guildContext(interaction, services);
        if (!server.lfg_channel_id) {
            throw new UserFacingError('This server has no LFG channel yet. Ask an admin to run `/config lfg-channel`.');
        }
        const game = await requireGame(services, interaction.options.getString('game', true));

        const ownerIds = (await services.library.sharingOwners(server.id, game.id)).filter(id => id !== interaction.user.id);
        const players = await playerOptions(interaction.guild, ownerIds.slice(0, MAX_PLAYER_OPTIONS * 2));
        await interaction.editReply(pickPlayersView(game, players, customIdsFor(interaction)));
    },

    async autocomplete(interaction, services) {
        const games = await services.games.search(interaction.options.getFocused().trim());
        return games.map(game => ({ name: game.name.slice(0, 100), value: game.id }));
    },
};

/** Names for the members still in the server. Fetching by ID needs no privileged intent. */
async function playerOptions(guild: import('discord.js').Guild | null, discordIds: string[]): Promise<PlayerOption[]> {
    if (!guild || discordIds.length === 0) {
        return [];
    }
    const members = await guild.members.fetch({ user: discordIds });
    return discordIds.flatMap(id => {
        const member = members.get(id);
        return member ? [{ discordId: id, label: member.displayName }] : [];
    });
}
