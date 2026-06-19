use crate::hid;
use crate::flash;

// =====================================
// HID
// =====================================

#[tauri::command]
pub fn get_version() -> Result<String, String> {
    hid::get_version()
}

#[tauri::command]
pub fn get_profile() -> Result<u8, String> {
    hid::get_profile()
}

#[tauri::command]
pub fn set_profile(profile: u8) -> Result<(), String> {
    hid::set_profile(profile)
}

#[tauri::command]
pub fn set_key(
    profile: u8,
    row: u8,
    col: u8,
    keycode: u16,
) -> Result<(), String> {

    hid::set_key(profile, row, col, keycode)
}

#[tauri::command]
pub fn get_layout(
    profile: u8
) -> Result<Vec<u16>, String> {

    hid::get_layout(profile)
}

// =====================================
// Encoder
// =====================================

#[tauri::command]
pub fn get_encoder(
    profile: u8
) -> Result<Vec<u16>, String> {

    hid::get_encoder(profile)
}

#[tauri::command]
pub fn set_encoder(
    profile: u8,
    action: u8,
    keycode: u16,
) -> Result<(), String> {

    hid::set_encoder(profile, action, keycode)
}

// =====================================
// Macros
// =====================================

#[tauri::command]
pub fn get_macro(
    slot: u8
) -> Result<Vec<u16>, String> {

    hid::get_macro(slot)
}

#[tauri::command]
pub fn set_macro(
    slot: u8,
    keycodes: Vec<u16>
) -> Result<(), String> {

    hid::set_macro(slot, keycodes)
}

// =====================================
// Flashing
// =====================================

#[tauri::command]
pub fn reboot_to_bootloader()
-> Result<(), String> {

    flash::reboot_to_bootloader()
}

#[tauri::command]
pub fn flash_firmware(
    source_path: String
) -> Result<(), String> {

    flash::flash_firmware(source_path)
}

#[tauri::command]
pub fn reboot_and_flash(
    source_path: String
) -> Result<(), String> {

    flash::reboot_and_flash(source_path)
}

// =====================================
// Save
// =====================================

#[tauri::command]
pub fn save_to_device()
-> Result<(), String> {

    hid::save_to_device()
}