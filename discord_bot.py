import discord
from discord.ext import tasks
from mcstatus import MinecraftServer
from rich.console import Console
from rich.prompt import Prompt
from rich.text import Text
from rich.panel import Panel
import json
import asyncio
import os

# Initialize rich console
console = Console()

async def setup_config():
    """Setup configuration for the bot with a fancy CLI."""
    try:
        console.print(Panel("Welcome to [bold green]Minecraft Server Status Bot Setup![/bold green]", title="Setup"))
        
        token = Prompt.ask("[cyan]Enter your Discord bot token[/cyan]")
        ip = Prompt.ask("[cyan]Enter your Minecraft server IP[/cyan]")
        port = Prompt.ask("[cyan]Enter your Minecraft server port (default: 25565)[/cyan]", default="25565")

        config = {
            "TOKEN": token.strip(),
            "IP": ip.strip(),
            "PORT": int(port.strip())
        }

        with open("config.json", "w") as config_file:
            json.dump(config, config_file, indent=2)
        
        console.print(Panel("[bold green]Configuration saved successfully![/bold green]", title="Success"))
        return config
    except Exception as e:
        console.print(Panel(f"[bold red]Error during setup: {e}[/bold red]", title="Error"))
        raise

async def load_config():
    """Load configuration from the file."""
    if not os.path.exists("config.json"):
        console.print(Panel("[yellow]No config file found. Starting setup...[/yellow]", title="Info"))
        return await setup_config()
    
    with open("config.json", "r") as config_file:
        return json.load(config_file)

class MinecraftStatusBot(discord.Client):
    def __init__(self, config, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config = config
        self.server = MinecraftServer.lookup(f"{config['IP']}:{config['PORT']}")
        self.check_server_status.start()

    async def on_ready(self):
        console.print(Panel(f"Bot is ready! Logged in as [bold cyan]{self.user}[/bold cyan]", title="Bot Status"))

    @tasks.loop(minutes=1)
    async def check_server_status(self):
        try:
            status = self.server.status()
            activity = discord.Game(f"{status.players.online}/{status.players.max} players online")
            await self.change_presence(status=discord.Status.online, activity=activity)
            console.print(f"[green]Server is online:[/green] {status.players.online}/{status.players.max} players")
        except Exception as e:
            console.print("[red]Server is Offline[/red]")
            activity = discord.Streaming(name="Server is Offline", url="https://dimension-studio.net")
            await self.change_presence(status=discord.Status.idle, activity=activity)

    @check_server_status.before_loop
    async def before_check_server_status(self):
        await self.wait_until_ready()

async def main():
    try:
        config = await load_config()
        intents = discord.Intents.default()
        bot = MinecraftStatusBot(config, intents=intents)
        await bot.start(config["TOKEN"])
    except Exception as e:
        console.print(Panel(f"[bold red]Failed to start bot: {e}[/bold red]", title="Error"))
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
