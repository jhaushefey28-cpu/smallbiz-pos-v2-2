export type MarketplaceProvider = "shopee" | "lazada" | "tiktok_shop";

export type MarketplaceProviderConfig = {
  provider: MarketplaceProvider;
  authorizeUrlEnv: string;
  appIdEnv: string;
  redirectUriEnv: string;
  stateParam: string;
  clientIdParam: string;
  extraAuthorizeParams?: Record<string, string>;
};

const configs: Record<MarketplaceProvider, MarketplaceProviderConfig> = {
  shopee: {
    provider: "shopee",
    authorizeUrlEnv: "SHOPEE_OAUTH_AUTHORIZE_URL",
    appIdEnv: "SHOPEE_APP_ID",
    redirectUriEnv: "SHOPEE_OAUTH_REDIRECT_URI",
    stateParam: "state",
    clientIdParam: "client_id",
  },
  lazada: {
    provider: "lazada",
    authorizeUrlEnv: "LAZADA_OAUTH_AUTHORIZE_URL",
    appIdEnv: "LAZADA_APP_ID",
    redirectUriEnv: "LAZADA_OAUTH_REDIRECT_URI",
    stateParam: "state",
    clientIdParam: "client_id",
  },
  tiktok_shop: {
    provider: "tiktok_shop",
    authorizeUrlEnv: "TIKTOK_SHOP_OAUTH_AUTHORIZE_URL",
    appIdEnv: "TIKTOK_SHOP_APP_ID",
    redirectUriEnv: "TIKTOK_SHOP_OAUTH_REDIRECT_URI",
    stateParam: "state",
    clientIdParam: "client_id",
  },
};

export function normalizeMarketplaceProvider(value: string): MarketplaceProvider | null {
  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
  if (normalized === "shopee") return "shopee";
  if (normalized === "lazada") return "lazada";
  if (normalized === "tiktok" || normalized === "tiktok_shop") return "tiktok_shop";
  return null;
}

export function getMarketplaceProviderConfig(provider: MarketplaceProvider): MarketplaceProviderConfig {
  return configs[provider];
}

export function getConfiguredProviderEnvironment(provider: MarketplaceProvider) {
  const config = getMarketplaceProviderConfig(provider);
  const authorizeUrl = Deno.env.get(config.authorizeUrlEnv) ?? null;
  const appId = Deno.env.get(config.appIdEnv) ?? null;
  const redirectUri = Deno.env.get(config.redirectUriEnv) ?? null;

  return {
    ...config,
    authorizeUrl,
    appId,
    redirectUri,
    configured: Boolean(authorizeUrl && appId && redirectUri),
  };
}

export function buildMarketplaceAuthorizationUrl(
  provider: MarketplaceProvider,
  state: string,
): string | null {
  const env = getConfiguredProviderEnvironment(provider);
  if (!env.configured || !env.authorizeUrl || !env.appId || !env.redirectUri) return null;

  const url = new URL(env.authorizeUrl);
  url.searchParams.set(env.clientIdParam, env.appId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set(env.stateParam, state);

  for (const [key, value] of Object.entries(env.extraAuthorizeParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
