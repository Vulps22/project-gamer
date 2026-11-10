import { HandlerRegistry } from '../events/HandlerRegistry';
import { lfgInterested, lfgNotInterested, lfgOpenInvite } from './buttons/lfgButtons';
import { libraryHaveGame } from './buttons/libraryHaveGame';
import { libraryPostGame } from './buttons/libraryPostGame';
import { submissionApprove, submissionReject } from './buttons/submissionButtons';
import { config } from './commands/config';
import { help } from './commands/help';
import { lfg } from './commands/lfg';
import { library } from './commands/library';
import { sharing } from './commands/sharing';
import { steam } from './commands/steam';
import { submissionApproveModal } from './modals/submissionApproveModal';
import { lfgPlayerSelect } from './selects/lfgPlayerSelect';

export const commands = [config, help, lfg, library, sharing, steam];

export function createHandlerRegistry(): HandlerRegistry {
    return new HandlerRegistry({
        commands,
        buttons: [lfgOpenInvite, lfgInterested, lfgNotInterested, libraryPostGame, libraryHaveGame, submissionApprove, submissionReject],
        selects: [lfgPlayerSelect],
        modals: [submissionApproveModal],
    });
}
