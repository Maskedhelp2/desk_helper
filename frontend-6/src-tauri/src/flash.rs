use std::fs;
use std::path::{Path, PathBuf};
use std::thread::sleep;
use std::time::{Duration, Instant};

// =====================================
// Reboot Device Into Bootloader
// =====================================

pub fn reboot_to_bootloader()
-> Result<(), String> {

    let device =
        crate::hid::find_device()
        .ok_or("No device connected")?;

    let packet =
    crate::hid::build_packet(
        crate::hid::CMD_BOOTLOADER,
        &[]
    );

crate::hid::send_command(
    &device,
    packet
)?;

    Ok(())
}

// =====================================
// Candidate mount paths by OS
// =====================================

fn bootloader_paths() -> Vec<PathBuf> {

    let mut paths = Vec::new();

    // macOS
    paths.push(
        PathBuf::from("/Volumes/RPI-RP2")
    );

    // Linux common locations
    paths.push(
        PathBuf::from("/media/RPI-RP2")
    );

    paths.push(
        PathBuf::from("/mnt/RPI-RP2")
    );

    // Windows common drive letters
    for letter in b'D'..=b'Z' {
        let drive =
            format!("{}:\\", letter as char);

        paths.push(
            PathBuf::from(drive)
        );
    }

    paths
}

// =====================================
// Detect mounted RPI-RP2 drive
// =====================================

pub fn detect_bootloader_drive()
-> Option<PathBuf> {

    for path in bootloader_paths() {

        if path.exists() {

            let name = path
                .file_name()
                .map(|n| n.to_string_lossy()
                .to_string());

            // macOS/Linux mounted folder
            if let Some(folder) = name {
                if folder == "RPI-RP2" {
                    return Some(path);
                }
            }

            // Windows root drive:
            // accept existing drive
            if let Ok(entries) = fs::read_dir(&path) {
                for entry in entries.flatten() {
                    if entry.file_name() == "INFO_UF2.TXT" {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

// =====================================
// Public status check
// =====================================

pub fn is_bootloader_present() -> bool {
    detect_bootloader_drive().is_some()
}

// =====================================
// Wait for bootloader mount
// =====================================

pub fn wait_for_bootloader(
    timeout_secs: u64
) -> Result<PathBuf, String> {

    let start = Instant::now();

    while start.elapsed()
        < Duration::from_secs(timeout_secs)
    {
        if let Some(path) =
            detect_bootloader_drive()
        {
            return Ok(path);
        }

        sleep(Duration::from_millis(300));
    }

    Err(
        "Bootloader drive not detected"
        .to_string()
    )
}

// =====================================
// Flash UF2 Firmware
// =====================================

pub fn flash_firmware(
    source_path: String
) -> Result<(), String> {

    let source =
        Path::new(&source_path);

    if !source.exists() {
        return Err(
            "Firmware file not found"
            .to_string()
        );
    }

    let extension =
        source.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    if extension.to_lowercase() != "uf2" {
        return Err(
            "File must be .uf2"
            .to_string()
        );
    }

    // wait for device to appear
    let mount =
        wait_for_bootloader(5)?;

    // preserve original filename
    let filename =
        source.file_name()
        .ok_or("Invalid filename")?;

    let target =
        mount.join(filename);

    fs::copy(source, &target)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// =====================================
// One-click full update flow
// =====================================

pub fn reboot_and_flash(
    source_path: String
) -> Result<(), String> {

    reboot_to_bootloader()?;

    // allow reboot to begin
    sleep(Duration::from_secs(2));

    // ensure device actually appears
    wait_for_bootloader(5)?;

    flash_firmware(source_path)
}