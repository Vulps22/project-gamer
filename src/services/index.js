// services/index.js

const { gameManagerService, gameStatus } = require('./gameManagerService.js');
const serverManagerService = require('./serverManagerService.js');
const storeManagerService = require('./storeManagerService.js');
const userManagerService = require('./userManagerService.js');
const steamManagerService = require('./steamManagerService.js');
const { userLibraryManagerService } = require('./userLibraryManagerService.js');

module.exports = {
    gameManagerService,
    gameStatus,
    serverManagerService,
    storeManagerService,
    userManagerService,
    steamManagerService,
    userLibraryManagerService,

};