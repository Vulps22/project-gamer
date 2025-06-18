// messages/index.js

const { choosePlayersMessage } = require('./choosePlayersMessage.js');
const { chooseStoresMessage } = require('./chooseStoresMessage.js');
const { LFGMessage } = require('./lfgMessage.js');
const { GlobalMessages } = require('./globalMessages.js')

module.exports = {
    choosePlayersMessage,
    chooseStoresMessage,
    LFGMessage,
    GlobalMessages
}

