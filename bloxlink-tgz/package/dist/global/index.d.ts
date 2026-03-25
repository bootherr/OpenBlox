import { GlobalDiscordToRobloxResponse, GlobalRobloxToDiscordResponse } from '../types.js';
import 'axios';
import 'discord-api-types/v10';

declare const _default: {
    setGlobalApiKey: (newKey: string) => string;
    DiscordToRoblox: <Premium extends boolean = boolean>(discordUserId: string, premiumResponse?: Premium, apiKey?: string) => Promise<GlobalDiscordToRobloxResponse>;
    RobloxToDiscord: (robloxUserId: string, apiKey?: string) => Promise<GlobalRobloxToDiscordResponse>;
};

export { _default as default };
