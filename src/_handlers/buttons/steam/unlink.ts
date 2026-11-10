import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { steamNotLinkedView, steamUnlinkedView } from '../../../views/steamViews';
import { guildContext } from '../../context';

/** steam_unlink, as v1: the Unlink button on "Steam Account Already Linked". Games already added stay. */
const unlink: Handler<BotButtonInteraction> = {
    name: 'unlink',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        if (!await services.steam.unlink(account.id)) {
            await interaction.editReply(steamNotLinkedView());
            return;
        }
        services.log.log(`${interaction.user.username} (${interaction.user.id}) unlinked their Steam account`);
        await interaction.editReply(steamUnlinkedView());
    },
};

export default unlink;
