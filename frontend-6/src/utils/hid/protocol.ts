import { sendMock } from "./mock"

export const CMD = {
  SET_KEY: 0x03,
  SAVE: 0x04,
  SET_PROFILE: 0x10
}

function buildPacket(data: number[]): Uint8Array {
  const arr = new Uint8Array(32)
  arr.set(data.slice(0, 32))
  return arr
}

// 🔑 SET KEY
export async function setKey(row: number, col: number, keycode: number) {
  const lo = keycode & 0xFF
  const hi = (keycode >> 8) & 0xFF

  const packet = buildPacket([
    CMD.SET_KEY,
    row,
    col,
    0,
    lo,
    hi
  ])

  return sendMock(packet)
}

// 💾 SAVE
export async function saveKeyboard() {
  return sendMock(buildPacket([CMD.SAVE]))
}

// 🔄 SWITCH PROFILE
export async function setProfile(profile: number) {
  return sendMock(buildPacket([
    CMD.SET_PROFILE,
    profile
  ]))
}