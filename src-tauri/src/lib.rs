#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub mod hid;
pub mod protocol;
pub mod profiles;
pub mod flash;
pub mod commands;

 // 👈 allows access to commands if defined in lib.rs or re-exported

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(
      tauri::generate_handler![
        commands::get_version,
        commands::get_profile,
        commands::set_profile,
        commands::get_macro,
        commands::set_macro,
        commands::set_key,
        commands::save_to_device,
        commands::reboot_to_bootloader,
        commands::flash_firmware,
        commands::reboot_and_flash
      ]
    )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}