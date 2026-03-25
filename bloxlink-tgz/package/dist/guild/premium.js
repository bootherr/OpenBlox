// src/guild/premium.ts
import axios, { HttpStatusCode } from "axios";

// src/apiInformation.ts
var apiBaseUrl = "https://api.blox.link";
var apiVersion = "v4";

// src/apikey.ts
var guildApiKey = "";

// src/guild/premium.ts
var UpdateUser = async (discordGuildId, discordUserId, apiKey) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${apiBaseUrl}/${apiVersion}/public/guilds/${discordGuildId}/update-user/${discordUserId}`,
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
export {
  UpdateUser
};
//# sourceMappingURL=premium.js.map