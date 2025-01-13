const Logger = require("@ptkdev/logger");
const { Client, GatewayIntentBits, ActivityType, PresenceUpdateStatus } = require('discord.js');
const { status } = require('minecraft-server-util');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Promise-based question function
const question = (query) => new Promise((resolve) => {
    logger.info(`Prompting: ${query}`);
    rl.question(query, (answer) => { logger.warning(`Received input for: ${query}`); resolve(answer);});
});

async function setupConfig() {
    try {
        logger.docs("Welcome to Minecraft Server Status Bot Setup!", "Powered By @PPekKunGzDev");
        
        const token = await question("#Enter your Discord bot token > ");
        const ip = await question("#Enter your Minecraft server IP > ");
        const port = await question("#Enter your Minecraft server port (default: 25565) > ");

        const config = {
            TOKEN: token,
            IP: ip,
            PORT: parseInt(port) || 25565
        };
        
        await fs.writeFile(
            path.join(__dirname, 'config.json'), 
            JSON.stringify(config, null, 2)
        );
        
        logger.docs("Configuration saved successfully!", "Powered By @PPekKunGzDev");
        return config;
    } catch (error) {
        logger.error("Error during setup:", error);
        throw error;
    } finally {
        rl.close();
    }
}

async function loadConfig() {
    try {
        const configData = await fs.readFile(path.join(__dirname, 'config.json'), 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        logger.info("No config file found. Starting setup...");
        return await setupConfig();
    }
}

async function startBot(config) {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });

    client.once('ready', () => {
        logger.info("This bot is ready to go! | @PPekKunGzDev");
        logger.info(`Logged in as ${client.user.tag}`);
        checkServerStatus(client, config);
        setInterval(() => checkServerStatus(client, config), 60000);
    });

    async function checkServerStatus(client, config) {
        try {
            const serverStatus = await status(config.IP, config.PORT);
            
            client.user.setPresence({
                status: PresenceUpdateStatus.Online,
                activities: [{
                    name: `${serverStatus.players.online}/${serverStatus.players.max} players online`,
                    type: ActivityType.Watching
                }],
            });
            logger.info(`Server is online: ${serverStatus.players.online}/${serverStatus.players.max} players`);
        } catch (error) {
            logger.error("Server is Offline | @PPekKunGzDev");
            client.user.setPresence({
                status: PresenceUpdateStatus.Idle,
                activities: [{
                    url: 'https://dimension-studio.net',
                    name: 'Server is Offline',
                    type: ActivityType.Streaming
                }],
            });
        }
    }

    client.login(config.TOKEN);
}

async function main() {
    try {
        const config = await loadConfig();
        await startBot(config);
    } catch (error) {
        logger.error("Failed to start bot:", error);
        process.exit(1);
    }
}

main();