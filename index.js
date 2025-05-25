const { AutoPoster } = require('topgg-autoposter');
const { ShardingManager } = require('discord.js');


async function main() {
    const db = new Database();
    try {
        const data = await db.get('config', process.env['ENVIRONMENT_KEY']);
        global.my = data;
        console.log(my);
    } catch (error) {
        console.error('Error loading config from database:', error);
        return;  // Exit if configuration loading fails
    }



    const manager = new ShardingManager('./bot.js', {
        token: my.secret,
        totalShards: my.environment === 'dev' ? 2 : 'auto' // Force 2 shards in dev, auto in prod
    });


    manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

    manager.spawn();

    
    setupVoteServer();
    scheduleDailyCleanup();
    syncGG(manager);
    scheduleTopGGUpdate(manager);
    uptimeKuma();
}

main().catch(error => {
    console.error('Failed to start the shard manager:', error);
});

async function uptimeKuma() {

    console.log('Pre-release version: UptimeKuma Disabled')
    return;

    //Uptime-kuma ping
        const axios = require('axios');
        const retry = require('async-retry'); // You might need to install async-retry via npm
    
        setInterval(async () => {
            try {
                await retry(async () => {
                    const response = await axios.get('');
                }, {
                    retries: 3, // Retry up to 3 times
                    minTimeout: 1000, // Wait 1 second between retries
                });
                console.log('Ping succeeded');
            } catch (error) {
                console.error('Ping failed after retries:', error.message);
            }
        }, 60000); // Ping every 60 seconds
}

/**
 * Function to sync the bot's stats with top.gg
 * @param {ShardingManager} manager 
 */
function syncGG(manager){
    console.log("Pre-release version: SyncGG disabled");
    try {
        const ap = AutoPoster(my.top_gg_token, manager);
        ap.on('posted', () => {
            console.log('Updated bot stats on top.gg');
        });
    } catch (error) {
        console.error('Error updating bot stats on top.gg:', error);
    }
}