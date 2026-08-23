declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    EVA_AUTH_BASE_URL?: string;
    EVA_OTP_APPLICATION?: string;
    EVA_WXD_PHONE_SHA256?: string;
    EVA_LYN_PHONE_SHA256?: string;
  }
}
