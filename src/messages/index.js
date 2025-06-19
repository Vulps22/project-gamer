// messages/index.js

const { choosePlayersMessage } = require('./choosePlayersMessage.js');
const { chooseStoresMessage } = require('./chooseStoresMessage.js');
const { LFGMessage } = require('./lfgMessage.js');
const { successMessage } = require('./gameRemoveMessage.js')

module.exports = {
    choosePlayersMessage,
    chooseStoresMessage,
    LFGMessage,
    successMessage
}

