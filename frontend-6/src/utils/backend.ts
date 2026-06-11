import { invoke } from "@tauri-apps/api/core";

export async function getVersion() {
  return await invoke("get_version");
}

export async function getProfile(profile: number) {
  return await invoke("get_profile", {
    profile,
  });
}

export async function setProfile(profile: number) {
  return await invoke("set_profile", {
    profile,
  });
}

export async function setKey(
  profile: number,
  row: number,
  col: number,
  keycode: number
) {
  return await invoke("set_key", {
    profile,
    row,
    col,
    keycode,
  });
}

export async function saveToDevice() {
  return await invoke("save_to_device");
}

export async function rebootToBootloader() {
  return await invoke("reboot_to_bootloader");
}

export async function flashFirmware(path: string) {
  return await invoke("flash_firmware", {
    path,
  });
}

export async function rebootAndFlash(path: string) {
  return await invoke("reboot_and_flash", {
    path,
  });
}
