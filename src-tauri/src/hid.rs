use hidapi::{HidApi, HidDevice};

pub const VID: u16 = 0xFEED;
pub const PID: u16 = 0x0001;

pub fn find_device() -> Option<HidDevice> {
    let api = HidApi::new().ok()?;

    for dev in api.device_list() {
        if dev.vendor_id() == VID
           && dev.product_id() == PID
           && dev.usage_page() == 0xFF60
        {
                return dev.open_device(&api).ok();
         }
    }

    None
}

// =====================================
// Command IDs (match firmware exactly)
// =====================================

pub const CMD_GET_VERSION: u8 = 0x01;
pub const CMD_GET_LAYOUT: u8 = 0x02;
pub const CMD_SET_KEY: u8 = 0x03;
pub const CMD_SAVE: u8 = 0x04;

pub const CMD_GET_ENCODER: u8 = 0x05;
pub const CMD_SET_ENCODER: u8 = 0x06;

pub const CMD_GET_MACRO: u8 = 0x07;
pub const CMD_SET_MACRO: u8 = 0x08;

pub const CMD_GET_PROFILE_NAME: u8 = 0x0B;
pub const CMD_SET_PROFILE_NAME: u8 = 0x0C;

pub const CMD_FACTORY_RESET: u8 = 0x0D;
pub const CMD_BOOTLOADER: u8 = 0x0E;

pub const CMD_GET_PROFILE: u8 = 0x0F;
pub const CMD_SET_PROFILE: u8 = 0x10;

// =====================================
// Helpers
// =====================================

pub fn build_packet(cmd: u8, payload: &[u8]) -> [u8; 32] {
    let mut packet = [0u8; 32];

    packet[0] = cmd;

    for (i, &b) in payload.iter().enumerate() {
        if i + 1 < 32 {
            packet[i + 1] = b;
        }
    }

    packet
}

pub fn send_command(
    device: &HidDevice,
    packet: [u8; 32],
) -> Result<[u8; 32], String> {

    device.write(&packet)
        .map_err(|e| format!("Write failed: {}", e))?;

    let mut response = [0u8; 32];

    let size = device.read_timeout(&mut response, 1000)
        .map_err(|e| format!("Read failed: {}", e))?;

    if size == 0 {
        return Err("No response from device".into());
    }

    // 🔥 IMPORTANT CHECK
    if response[1] == 0xFF {
        return Err("Device returned error (invalid command or args)".into());
    }

    Ok(response)
}

fn device() -> Result<HidDevice, String> {
    find_device().ok_or("No device connected".to_string())
}

// =====================================
// Version
// =====================================

pub fn get_version() -> Result<String, String> {
    let dev = device()?;

    let payload = [0u8; 31]; // IMPORTANT
    let packet = build_packet(CMD_GET_VERSION, &payload);

    let response = send_command(&dev, packet)?;

    let major = response[1];
    let minor = response[2];

    Ok(format!("{}.{}", major, minor))
}

// =====================================
// Profile
// =====================================

pub fn get_profile() -> Result<u8, String> {
    let dev = device()?;

    let payload = [0u8; 31]; // IMPORTANT
    let packet = build_packet(CMD_GET_PROFILE, &payload);

    let response = send_command(&dev, packet)?;

    Ok(response[1])
}

pub fn set_profile(profile: u8) -> Result<(), String> {
    let dev = device()?;
    let packet = build_packet(CMD_SET_PROFILE, &[profile]);
    send_command(&dev, packet)?;
    Ok(())
}

// =====================================
// Profile Names
// =====================================

pub fn get_profile_name(profile: u8) -> Result<String, String> {
    let dev = device()?;

    let packet = build_packet(
        CMD_GET_PROFILE_NAME,
        &[profile]
    );

    let res = send_command(&dev, packet)?;

    let name = String::from_utf8_lossy(&res[2..])  // skip cmd + profile
        .trim_matches(char::from(0))
        .to_string();

    Ok(name)
}

pub fn set_profile_name(
    profile: u8,
    name: String
) -> Result<(), String> {

    let dev = device()?;

    let mut payload = vec![profile];

    // Firmware limit: max 15 characters (16th is null)
    let name_bytes = name.as_bytes();
    let trimmed = &name_bytes[..name_bytes.len().min(15)];

    payload.extend(trimmed);

    let packet = build_packet(
        CMD_SET_PROFILE_NAME,
        &payload
    );

    send_command(&dev, packet)?;
    Ok(())
}
 

// =====================================
// Layout (20 keys)
// =====================================

pub fn get_layout(profile: u8) -> Result<Vec<u16>, String> {

    let dev = device()?;

    let mut layout = Vec::new();

    let mut chunk: u8 = 0;

    loop {

        let packet = build_packet(
            CMD_GET_LAYOUT,
            &[profile, chunk]
        );

        let response = send_command(&dev, packet)?;

        let total_chunks = response[3];

        // firmware sends 7 keys per chunk
        for i in 0..7 {

            let idx = 4 + i * 2;

            if idx + 1 >= 32 {
                break;
            }

            let key =
                (response[idx] as u16) |
                ((response[idx + 1] as u16) << 8);

            layout.push(key);

            // stop after exactly 20 keys
            if layout.len() >= 20 {
                return Ok(layout);
            }
        }

        chunk += 1;

        if chunk >= total_chunks {
            break;
        }
    }

    Ok(layout)
}

// =====================================
// Set Key
// =====================================

pub fn set_key(
    profile: u8,
    row: u8,
    col: u8,
    keycode: u16
) -> Result<(), String> {

    let dev = device()?;

    println!(
    "SET_KEY -> profile={} row={} col={} keycode={}",
    profile,
    row,
    col,
    keycode
);

    let payload = [
    row,
    col,
    profile,   // 👈 moved here (correct position)
    (keycode & 0xFF) as u8,
    (keycode >> 8) as u8,
    ];

    let packet = build_packet(
        CMD_SET_KEY,
        &payload
    );

    send_command(&dev, packet)?;
    Ok(())
}

// =====================================
// Encoder (FIXED)
// =====================================

pub fn get_encoder(profile: u8) -> Result<Vec<u16>, String> {

    let dev = device()?;

    let packet = build_packet(
        CMD_GET_ENCODER,
        &[profile]
    );

    let res = send_command(&dev, packet)?;

    // Correct offsets:
    // [cmd, profile, ccw_lo, ccw_hi, cw_lo, cw_hi, press_lo, press_hi]

    let ccw =
        res[2] as u16 |
        ((res[3] as u16) << 8);

    let cw =
        res[4] as u16 |
        ((res[5] as u16) << 8);

    let press =
        res[6] as u16 |
        ((res[7] as u16) << 8);

    Ok(vec![ccw, cw, press])
}

pub fn set_encoder(
    profile: u8,
    action: u8,
    keycode: u16
) -> Result<(), String> {

    let dev = device()?;

    let payload = [
        profile,
        action,
        (keycode & 0xFF) as u8,
        (keycode >> 8) as u8
    ];

    let packet = build_packet(
        CMD_SET_ENCODER,
        &payload
    );

    send_command(&dev, packet)?;
    Ok(())
}

// =====================================
// Macros (FIXED)
// =====================================

pub fn get_macro(slot: u8) -> Result<Vec<u16>, String> {

    let dev = device()?;

    let packet = build_packet(
        CMD_GET_MACRO,
        &[slot]
    );

    let res = send_command(&dev, packet)?;

    // [cmd, macro_id, length, ...]
    let count = res[2] as usize;

    let mut out = Vec::new();

    for i in 0..count {

        let base = 3 + i * 2;

        let lo = res[base] as u16;
        let hi = res[base + 1] as u16;

        out.push(lo | (hi << 8));
    }

    Ok(out)
}

pub fn set_macro(
    slot: u8,
    keycodes: Vec<u16>
) -> Result<(), String> {

    let dev = device()?;

    // Firmware supports max 5 keys
    let count = keycodes.len().min(5);

    let mut payload = vec![
        slot,
        count as u8
    ];

    // Only send up to 5 keycodes
    for key in keycodes.into_iter().take(5) {
        payload.push((key & 0xFF) as u8);
        payload.push((key >> 8) as u8);
    }

    let packet = build_packet(
        CMD_SET_MACRO,
        &payload
    );

    send_command(&dev, packet)?;
    Ok(())
}
  

// =====================================
// Save / Reset
// =====================================

pub fn save_to_device() -> Result<(), String> {
    let dev = device()?;

    let payload = [0u8; 31]; // IMPORTANT
    let packet = build_packet(CMD_SAVE, &payload);

    send_command(&dev, packet)?;
    Ok(())
}

pub fn factory_reset() -> Result<(), String> {

    let dev = device()?;

    let packet = build_packet(
        CMD_FACTORY_RESET,
        &[]
    );

    send_command(&dev, packet)?;
    Ok(())
}