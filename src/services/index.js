// services/index.js

const { gameManager, gameStatus } = require('./GameManagerService.js');
const serverManagerServiceInstance = require('./ServerManagerService.js');
const storeManagerInstance = require('./StoreManagerService.js');
const userManagerServiceInstance = require('./UserManagerService.js');

module.exports = {
    gameManager,
    gameStatus,
    serverManagerServiceInstance,
    storeManagerInstance,
    userManagerServiceInstance,
}