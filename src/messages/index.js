// messages/index.js

const { chooseGameMessage } = require('./chooseGameMessage.js');
const { choosePlayersMessage } = require('./choosePlayersMessage.js');
const { chooseStoresMessage } = require('./chooseStoresMessage.js');
const { LFGMessage } = require('./lfgMessage.js');
const { steamLinkMessage } = require('./steamLinkMessage.js');
const { successMessage } = require('./gameRemoveMessage.js');

module.exports = {
    chooseGameMessage,
    choosePlayersMessage,
    chooseStoresMessage,
    LFGMessage,
    steamLinkMessage,
    successMessage
};

