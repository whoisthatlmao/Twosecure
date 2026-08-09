use serde::{Deserialize, Serialize};

pub const DEFAULT_BOT_TOKEN: &str = "";
pub const DEFAULT_CHAT_ID: &str = "";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TelegramConfig {
    pub enabled: bool,
    pub bot_token: String,
    pub chat_id: String,
    /// Whether this PC has been linked to Telegram via the setup code
    #[serde(default)]
    pub linked: bool,
}

impl Default for TelegramConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            bot_token: String::new(),
            chat_id: String::new(),
            linked: false,
        }
    }
}

/// Send a plain text confirmation message to Telegram
pub async fn send_telegram_message(
    bot_token: &str,
    chat_id: &str,
    text: &str,
) -> Result<(), String> {
    if bot_token.trim().is_empty() || chat_id.trim().is_empty() {
        return Err("Token ou Chat ID non renseigné.".to_string());
    }

    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token.trim());
    let payload = serde_json::json!({
        "chat_id": chat_id.trim(),
        "text": text,
        "parse_mode": "HTML",
    });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erreur réseau Telegram: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("API Telegram Erreur: {}", err_body));
    }
    Ok(())
}

/// Send the linking code to the user's Telegram so they can enter it on PC
pub async fn send_linking_code(
    bot_token: &str,
    chat_id: &str,
    link_code: &str,
) -> Result<(), String> {
    let text = format!(
        "🔐 <b>2Secure — Code de liaison</b>\n\n\
        Votre application 2Secure sur PC souhaite lier ce compte Telegram.\n\n\
        Voici votre code de confirmation :\n\
        <code><b>{}</b></code>\n\n\
        ⚠️ <i>Entrez ce code dans 2Secure sur votre PC.\n\
        Ce code expire dans 5 minutes.</i>",
        link_code
    );
    send_telegram_message(bot_token, chat_id, &text).await
}

/// Send a message with Inline Keyboards (Approuver / Refuser)
pub async fn send_telegram_auth_prompt(
    bot_token: &str,
    chat_id: &str,
    auth_code: &str,
) -> Result<(), String> {
    if bot_token.trim().is_empty() || chat_id.trim().is_empty() {
        return Err("Token Telegram ou Chat ID non configuré.".to_string());
    }

    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token.trim());

    let text = format!(
        "🛡️ <b>2Secure — Demande de Déverrouillage</b>\n\n\
        Une tentative de déverrouillage de votre coffre-fort a été initiée.\n\n\
        <i>Code de session : <code>{}</code></i>\n\n\
        Cliquez sur un bouton ci-dessous pour répondre :",
        auth_code
    );

    let payload = serde_json::json!({
        "chat_id": chat_id.trim(),
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": [
                [
                    {
                        "text": "✅ Approuver le déverrouillage",
                        "callback_data": format!("approve_{}", auth_code)
                    }
                ],
                [
                    {
                        "text": "❌ Refuser (Bloquer)",
                        "callback_data": format!("deny_{}", auth_code)
                    }
                ]
            ]
        }
    });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erreur réseau Telegram: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("API Telegram Erreur: {}", err_body));
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TelegramAuthStatus {
    Pending,
    Approved,
    Denied,
}

/// Poll getUpdates from Telegram API to check if user tapped Approve or Deny
pub async fn poll_telegram_approval(
    bot_token: &str,
    auth_code: &str,
) -> Result<TelegramAuthStatus, String> {
    if bot_token.trim().is_empty() {
        return Ok(TelegramAuthStatus::Pending);
    }

    let url = format!(
        "https://api.telegram.org/bot{}/getUpdates?allowed_updates=[\"callback_query\"]",
        bot_token.trim()
    );

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Erreur lecture Telegram: {}", e))?;

    if !res.status().is_success() {
        return Ok(TelegramAuthStatus::Pending);
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Erreur format JSON Telegram: {}", e))?;

    if let Some(results) = json.get("result").and_then(|r| r.as_array()) {
        let approve_target = format!("approve_{}", auth_code);
        let deny_target = format!("deny_{}", auth_code);

        for item in results.iter().rev() {
            if let Some(cb) = item.get("callback_query") {
                if let Some(data) = cb.get("data").and_then(|d| d.as_str()) {
                    if data == approve_target {
                        if let Some(cb_id) = cb.get("id").and_then(|i| i.as_str()) {
                            let answer_url = format!(
                                "https://api.telegram.org/bot{}/answerCallbackQuery",
                                bot_token.trim()
                            );
                            let _ = client
                                .post(&answer_url)
                                .json(&serde_json::json!({
                                    "callback_query_id": cb_id,
                                    "text": "✅ Déverrouillage 2Secure approuvé !"
                                }))
                                .send()
                                .await;
                        }
                        return Ok(TelegramAuthStatus::Approved);
                    } else if data == deny_target {
                        if let Some(cb_id) = cb.get("id").and_then(|i| i.as_str()) {
                            let answer_url = format!(
                                "https://api.telegram.org/bot{}/answerCallbackQuery",
                                bot_token.trim()
                            );
                            let _ = client
                                .post(&answer_url)
                                .json(&serde_json::json!({
                                    "callback_query_id": cb_id,
                                    "text": "❌ Déverrouillage refusé !"
                                }))
                                .send()
                                .await;
                        }
                        return Ok(TelegramAuthStatus::Denied);
                    }
                }
            }
        }
    }

    Ok(TelegramAuthStatus::Pending)
}
