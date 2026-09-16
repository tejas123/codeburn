use anyhow::{anyhow, Context, Result};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

struct Dashboard {
    child: Child,
    url: String,
}

// Serialize clicks so a double-click cannot start two servers. Reuse the actual
// announced port, since the CLI chooses another port when 4747 is occupied.
static DASHBOARD: Mutex<Option<Dashboard>> = Mutex::const_new(None);

pub async fn open() -> Result<()> {
    let mut state = DASHBOARD.lock().await;
    if let Some(dashboard) = state.as_mut() {
        if dashboard.child.try_wait()?.is_none() {
            return tauri_plugin_opener::open_url(&dashboard.url, None::<&str>)
                .context("could not open the browser");
        }
    }
    *state = None;
    let argv = crate::cli::CodeburnCli::resolve().argv();
    let mut command = Command::new(&argv[0]);
    command.args(&argv[1..]).args(["web", "--no-open"])
        .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW, including .cmd launchers.
    let mut child = command.spawn().context("could not start the web dashboard")?;
    let stdout = child.stdout.take().context("dashboard stdout was unavailable")?;
    let mut lines = BufReader::new(stdout).lines();
    let url = timeout(Duration::from_secs(30), async {
        while let Some(line) = lines.next_line().await? {
            if let Some(url) = crate::dashboard_url::from_ready_line(&line) {
                return Ok::<_, anyhow::Error>(url);
            }
        }
        Err(anyhow!("web dashboard exited before it was ready"))
    }).await.context("web dashboard did not become ready within 30 seconds")??;
    // Continue draining output so a long-running server cannot fill its pipe.
    tauri::async_runtime::spawn(async move {
        while let Ok(Some(_)) = lines.next_line().await {}
    });
    *state = Some(Dashboard { child, url: url.clone() });
    tauri_plugin_opener::open_url(&url, None::<&str>).context("could not open the browser")
}
