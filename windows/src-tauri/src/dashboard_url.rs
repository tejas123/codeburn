/// Only accept the loopback URL announced by our dashboard process.
pub fn from_ready_line(line: &str) -> Option<String> {
    let url = line.trim().strip_prefix("CodeBurn dashboard at ")?;
    let port = url.strip_prefix("http://127.0.0.1:")?.parse::<u16>().ok()?;
    (port != 0).then(|| format!("http://127.0.0.1:{port}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_the_actual_port_including_fallback_ports() {
        assert_eq!(from_ready_line("  CodeBurn dashboard at http://127.0.0.1:49152"), Some("http://127.0.0.1:49152".into()));
    }

    #[test]
    fn rejects_non_ready_output_and_non_loopback_urls() {
        for line in ["loading", "CodeBurn dashboard at https://example.com", "CodeBurn dashboard at http://127.0.0.1:0", "CodeBurn dashboard at http://127.0.0.1:4747/evil", "CodeBurn dashboard at http://127.0.0.1:65536"] {
            assert_eq!(from_ready_line(line), None);
        }
    }
}
