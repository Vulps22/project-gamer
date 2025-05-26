# project-gamer

This project is a complete rebuild of LFGameSync-bot.

The original project was mostly written by AI as I learned how discord bots work. Over time, my understanding and practices has changed, And i have decided it is time to rebuild this bot from scratch.

The original project was written in 2 languages, 3 frameworks and is just a big patchwork mess. the description and scope of the new bot is described below.

----

LFGameSync is a discord bot designed to help communities find other members who play the same games.
It will do this by keeping a record of the games that each user owns, and searching those libraries when another user creates an `/lfg` post.

## Scope

The bot is considered "MVP" when the following features have been implemented:
- `/lfg <searchable:game>` - The user can use this command to see a multi-select dropdown of all the users in that discord community who have the same game. Upon choosing 1 or more users, the bot will post an `LFG Message`, tagging the chosen users
- - There must be an `open invitation` option
- `/register game <url>` - When used, The bot will scrape the chosen URL. If the URL is a `Registered Game Store`, the bot will use the metadata to determine the game's full name and add it to the database.
- - The bot will also register the game with the user's game library
  - If the URL is not a recognised game store, The bot will ask a team of approved bot administrators to verify the game submission
- `/add game <searchable:name>` - The bot will present the user with a searchable list of games in the library. The user can use this command to add a known game to their library
- `/forget game <searchable:game>` - The user will use this command to _remove_ a game from their library
- `/sharing On|Off` - The User will use these commands to enable and disable their game library in each server they are a member of. This setting is unique to each Discord Server
- `/set` - This serves as the base command for the bot's server-wide settings:
- - `/set open-role <role>` - The role used in an `Open Invitation` if no roles are set for the chosen game
  - `/set role-for-game <role> <searchable:game>` - The role used in an `Open Invitation` if this role is set, it will be used
  - `/set whitelist <true|false>` - If used, Filter searchable games to whitelisted games only
  - `/set add-whitelisted-game <searchable:game>` - Add a game to the whitelist. Do not enable the whitelist automatically
  - `/set blacklist <true|false>` - If used, Filter out any results included in the blacklist
  - `/set add-blacklisted-game <searchable:game>` - Add a game to the blacklist. Do not enable the blacklist automatically
- `LFG Message` - This message must contain the following:
- - The game's Name
  - A list of URLs to each store page the bot knows of for the chosen game
  - The names of anyone who was chosen for this message
  - If `Open Invitation` is used, and an LFG role is chosen, tag that role instead of a list of users
  - A button labelled "I have this game" which will register the game with the user's game library | When clicked, show the user an ephemeral message with a list of stores (multi-select) and register the game to the user for each store the user choses
  - A button labelled "Interested"
 
## Post release
The initial scope _removes_ the original steam API integration and any pre-existing web-interfaces. The following are planned features for implementation _after_ the initial release:
- `Steam API Integration`:
- - `/link` - present the user with a URL to log into their steam accounts. When _linked_ the bot will periodically sync their steam libraries with the bot's library, automatically adding any games it finds
- `/set channel-for-game <searchable:game> <channel>` - If set, when a player joins a community with the specified game, or adds the specified game to their library, automatically add the user to that channel.
- - This approach bypasses the limits to the number of roles a discord server can have
- `/set auto-role-management <true|false>` - If enabled, Automatically add and remove roles from users if they own a game with a registered role
