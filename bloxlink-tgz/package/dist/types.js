// src/types.ts
var ResponseError = /* @__PURE__ */ ((ResponseError2) => {
  ResponseError2["NOT_FOUND"] = "User not found";
  ResponseError2["QUOTA_REACHED"] = "You have reached your API key limit for today. Email cm@blox.link for elevated rates.";
  ResponseError2["INVALID_KEY"] = "Invalid API Key";
  ResponseError2["GUILD_NOT_MATCHED"] = "Guild ID does not match API Key";
  ResponseError2["REQUIRES_API_PREMIUM"] = "This endpoint requires API Premium or Server Premium/Pro";
  return ResponseError2;
})(ResponseError || {});
export {
  ResponseError
};
//# sourceMappingURL=types.js.map