export async function sendMock(packet: Uint8Array) {
  console.log("📤 SEND:", [...packet])

  // simulate small delay
  await new Promise(r => setTimeout(r, 100))

  return new Uint8Array([packet[0], 0x00])
}