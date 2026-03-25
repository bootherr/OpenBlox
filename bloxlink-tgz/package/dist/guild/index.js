// src/apikey.ts
var guildApiKey = "";
var setGuildApiKey = (newKey) => guildApiKey = newKey;

// src/guild/search.ts
import axios, { HttpStatusCode } from "axios";

// src/apiInformation.ts
var apiBaseUrl = "https://api.blox.link";
var apiVersion = "v4";

// src/guild/search.ts
var DiscordToRoblox = async (discordGuildId, discordUserId, premiumResponse, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/discord-to-roblox/${discordUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === HttpStatusCode.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};
var RobloxToDiscord = async (discordGuildId, robloxUserId, premiumResponse, apiKey) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/roblox-to-discord/${robloxUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === HttpStatusCode.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};

// src/guild/premium.ts
import axios2, { HttpStatusCode as HttpStatusCode2 } from "axios";
var UpdateUser = async (discordGuildId, discordUserId, apiKey) => {
  try {
    const response = await axios2({
      method: "POST",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/update-user/${discordUserId}`,
      headers: {
        Authorization: apiKey || guildApiKey
      },
      validateStatus: (status) => status === HttpStatusCode2.Ok
    });
    return {
      ...response.data,
      statusCode: response.status
    };
  } catch (error) {
    throw new Error(`[BLOXLINK API] ${error.response.data.error}`);
  }
};

// src/guild/index.ts
var guild_default = {
  setGuildApiKey,
  DiscordToRoblox,
  RobloxToDiscord,
  UpdateUser
};
export {
  guild_default as default
};
//# sourceMappingURL=index.js.map