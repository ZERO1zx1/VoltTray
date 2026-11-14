use serde::{Deserialize, Serialize};
#[cfg(target_os = "linux")]
use std::process::Command;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareActionRequestDto {
    pub action: String,
    pub title: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareActionResultDto {
    pub ok: bool,
    pub applied_to_hardware: bool,
    pub backend: String,
    pub message_en: String,
    pub message_mn: String,
}

#[cfg(target_os = "linux")]
fn cmd_exists(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn execute_linux_action(req: HardwareActionRequestDto) -> HardwareActionResultDto {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = req;
        HardwareActionResultDto {
            ok: true,
            applied_to_hardware: false,
            backend: "local_profile".to_string(),
            message_en: "Saved locally".to_string(),
            message_mn: "Локалд хадгалагдлаа".to_string(),
        }
    }

    #[cfg(target_os = "linux")]
    {
        if req.action == "send_low_battery_alert" && cmd_exists("notify-send") {
            let title = req.title.unwrap_or_else(|| "Low Battery".to_string());
            let body = req
                .body
                .unwrap_or_else(|| "Please connect charger.".to_string());
            if Command::new("notify-send")
                .args(["-a", "VoltTray", "-u", "normal", &title, &body])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
            {
                return HardwareActionResultDto {
                    ok: true,
                    applied_to_hardware: true,
                    backend: "notify-send".to_string(),
                    message_en: "Sent native Linux notification".to_string(),
                    message_mn: "Linux системийн мэдэгдэл илгээлээ".to_string(),
                };
            }
        }

        HardwareActionResultDto {
            ok: true,
            applied_to_hardware: false,
            backend: "local_profile".to_string(),
            message_en: "Battery & charger state updated".to_string(),
            message_mn: "Батарей ба цэнэглэгчийн төлөв шинэчлэгдлээ".to_string(),
        }
    }
}
