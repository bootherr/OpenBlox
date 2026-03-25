declare let globalApiKey: string;
/**
 * Set's the default API key for global API requests
 *
 * @param {string} newKey
 * @returns {void}
 */
declare const setGlobalApiKey: (newKey: string) => string;
declare let guildApiKey: string;
/**
 * Set's the default API key for guild API requests
 *
 * @param {string} newKey
 * @returns {void}
 */
declare const setGuildApiKey: (newKey: string) => string;

export { globalApiKey, guildApiKey, setGlobalApiKey, setGuildApiKey };
