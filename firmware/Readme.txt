# desk_helper — Custom Numpad Firmware & Config Tool

A fully custom mechanical numpad built on the Raspberry Pi Pico (RP2040), running QMK firmware with a companion Python configuration tool. Supports 5 switchable profiles, per-profile encoder mapping, up to 10 macros, a 128×64 OLED display, and full persistent storage — all configurable over USB without reflashing.

---

## Table of Contents

- [Features](#features)
- [Hardware](#hardware)
- [Pin Wiring](#pin-wiring)
- [Firmware](#firmware)
  - [Requirements](#firmware-requirements)
  - [Building](#building)
  - [Flashing](#flashing)
  - [EEPROM Layout](#eeprom-layout)
- [HID Protocol](#hid-protocol)
  - [Packet Format](#packet-format)
  - [Command Reference](#command-reference)
- [Python Config Tool](#python-config-tool)
  - [Requirements](#tool-requirements)
  - [Usage](#usage)
  - [Key Names](#key-names)
- [Profiles](#profiles)
- [Macros](#macros)
- [OLED Display](#oled-display)
- [Default Layouts](#default-layouts)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Features

- **17 fully remappable keys** — every key on every profile is independently assignable
- **5 profiles** — Numpad, Navigation, Media, Gaming, Macros — switchable live via HID command
- **Rotary encoder** with per-profile CCW / CW / Press actions
- **10 macro slots** — up to 5 keycodes per macro, assigned to any key
- **0.96" SSD1306 OLED** — shows profile name, firmware version, and profile index; or renders a full custom 128×64 bitmap frame uploaded from the host
- **Full EEPROM persistence** — all settings survive power loss; debounced 3-second write delay protects flash lifespan
- **Raw HID protocol** — 16 commands over a custom USB HID channel; no driver installation needed on Windows 10+ or macOS
- **Python CLI tool** — interactive shell for remapping keys, setting macros, uploading OLED frames, switching profiles, and triggering firmware updates

---

## Hardware

| Part | Spec | Notes |
|---|---|---|
| Raspberry Pi Pico | RP2040, 264KB RAM, 2MB flash | The standard non-W version works fine |
| Mechanical switches | MX-compatible × 17 | Cherry, Gateron, Akko — any MX switch |
| Numpad keycaps | MX-compatible numpad set | Standard layout: 4×4 + extras |
| EC11 Rotary Encoder | With push button | Common 5-pin through-hole type |
| Encoder knob | 6mm D-shaft | Any knob that fits |
| SSD1306 OLED | 0.96", 128×64, I2C | 3.3V version — do not use 5V |
| 1N4148 diodes | × 20 | One per switch, a few spares |
| PCB or perfboard | — | Perfboard fine for prototyping |

Total hardware cost (excluding Pico and OLED): approximately £25–£35 depending on switch choice.

---

## Pin Wiring

```
Component          Pico GPIO     Notes
─────────────────────────────────────────────────────
Matrix Row 0       GP10          Scanned output
Matrix Row 1       GP11          Scanned output
Matrix Row 2       GP12          Scanned output
Matrix Row 3       GP13          Scanned output
Matrix Col 0       GP6           Read input
Matrix Col 1       GP7           Read input
Matrix Col 2       GP8           Read input
Matrix Col 3       GP9           Read input
Matrix Col 4       GP14          Read input
Encoder A          GP2           Rotation signal A
Encoder B          GP3           Rotation signal B
Encoder Click      GP15          Treated as regular key
OLED SDA           GP4  (pin 6)  I2C data
OLED SCL           GP5  (pin 7)  I2C clock
OLED VCC           3V3  (pin 36) 3.3V only
OLED GND           Any GND       Ground
```

The matrix uses a standard row-scanning approach with one 1N4148 diode per switch (cathode toward column) to prevent ghosting when multiple keys are pressed simultaneously.

---

## Firmware

### Firmware Requirements

- [QMK CLI](https://docs.qmk.fm/#/newbs_getting_started) installed and set up
- QMK MSYS (Windows) or Homebrew QMK (macOS)
- Git

Verify your environment is working by doing a test build of any QMK keyboard before touching this project:

```bash
qmk compile -kb clueboard/66/rev3 -km default
```

### Building

```bash
# Clone QMK and set it up if you haven't already
qmk setup

# Copy the keyboard folder into QMK
cp -r my_numpad/ ~/qmk_firmware/keyboards/

# Compile
qmk compile -kb my_numpad -km default
```

The compiled `.uf2` file will appear at:

```
~/qmk_firmware/.build/my_numpad_default.uf2
```

### Flashing

1. Hold the **BOOTSEL** button on the Pico while plugging in USB
2. It will appear as a drive called **RPI-RP2**
3. Copy the `.uf2` file onto that drive
4. The Pico reboots automatically and the drive disappears — it is now running the firmware

You can also trigger a reboot into bootloader mode from the Python tool without physically unplugging anything:

```
>> bootloader
```

### EEPROM Layout

The firmware uses 430 of the Pico's 512 bytes of emulated EEPROM. Layout:

```
Address   Size    Contents
────────────────────────────────────────────────────
0         1       Magic byte (0x45) — detects first boot
1         1       Current profile index (0–4)
2–31      30      Encoder map: 5 profiles × 3 actions × 2 bytes
32–39     8       Reserved
40–239    200     Dynamic key map: 5 profiles × 4 rows × 5 cols × 2 bytes
240–249   10      Macro lengths: 10 × 1 byte
250–349   100     Macro keycodes: 10 macros × 5 keys × 2 bytes
350–429   80      Profile names: 5 × 16 bytes (null-terminated ASCII)
────────────────────────────────────────────────────
Total:    430 / 512 bytes used
```

On first boot (magic byte missing or wrong), the firmware loads all defaults and writes them to EEPROM before continuing. On subsequent boots it reads from EEPROM directly.

EEPROM writes are debounced — the firmware sets a dirty flag when any setting changes and only flushes to EEPROM after 3 seconds of no further changes. This prevents rapid commands (like uploading a full profile) from causing excessive flash wear. The CMD_SAVE command bypasses the delay and flushes immediately.

---

## HID Protocol

The firmware exposes a Raw HID interface alongside the standard keyboard HID device. No custom driver is needed — Raw HID is natively supported on Windows 10+ and all modern macOS versions.

- **USB VID:** `0xFEED`
- **USB PID:** `0x0001`
- **Usage Page:** `0xFF60`
- **Usage ID:** `0x61`

### Packet Format

All communication uses fixed 32-byte packets in both directions.

**Host → Device:**
```
Byte 0:     Command code
Byte 1–31:  Command arguments (zero-padded)
```

**Device → Host:**
```
Byte 0:     Echo of command code
Byte 1:     0x00 = success, 0xFF = error
Byte 2+:    Response data (command-specific)
```

If the device receives a command with fewer bytes than required, it responds with `[cmd, 0xFF]` and ignores the command. If it receives an unknown command code, it responds with `[cmd, 0xFF]`.

### Command Reference

#### `0x01` GET_VERSION

Returns the firmware version.

```
Request:   [0x01, 0×00 × 31]
Response:  [0x01, major, minor]
```

Example response for v2.1: `[0x01, 0x02, 0x01]`

---

#### `0x02` GET_LAYOUT

Returns the keymap for one profile, one chunk at a time. Each chunk contains 7 keycodes (14 bytes). A 4×5 grid = 20 keys = 3 chunks (last chunk has 6 keys).

```
Request:   [0x02, profile(0–4), chunk(0–2)]
Response:  [0x02, profile, chunk, total_chunks, k0_lo, k0_hi, k1_lo, k1_hi, ...]
```

Keys are returned in row-major order: row 0 col 0 → row 0 col 4 → row 1 col 0 → ... Keycodes are 16-bit little-endian.

---

#### `0x03` SET_KEY

Sets one key on the current profile.

```
Request:   [0x03, row(0–3), col(0–4), 0x00, key_lo, key_hi]
Response:  [0x03, 0x00] on success
           [0x03, 0xFF] if row/col out of range
```

Changes the key in RAM immediately. Call `CMD_SAVE` (0x04) to persist, or wait for the 3-second auto-flush.

---

#### `0x04` SAVE

Forces an immediate EEPROM flush regardless of the dirty timer.

```
Request:   [0x04, 0×00 × 31]
Response:  [0x04, 0x00]
```

---

#### `0x05` GET_ENCODER

Returns the three encoder actions (CCW, CW, Press) for one profile.

```
Request:   [0x05, profile(0–4)]
Response:  [0x05, profile, ccw_lo, ccw_hi, cw_lo, cw_hi, press_lo, press_hi]
```

---

#### `0x06` SET_ENCODER

Sets one encoder action for one profile.

```
Request:   [0x06, profile(0–4), action(0=CCW/1=CW/2=Press), key_lo, key_hi]
Response:  [0x06, 0x00] on success
           [0x06, 0xFF] if profile or action out of range
```

---

#### `0x07` GET_MACRO

Returns the keycodes stored in one macro slot.

```
Request:   [0x07, macro_id(0–9)]
Response:  [0x07, macro_id, length, k0_lo, k0_hi, k1_lo, k1_hi, ...]
```

If the macro slot is empty, `length` will be 0 and no key bytes follow.

---

#### `0x08` SET_MACRO

Writes up to 5 keycodes into a macro slot.

```
Request:   [0x08, macro_id(0–9), length(0–5), k0_lo, k0_hi, ...]
Response:  [0x08, 0x00] on success
           [0x08, 0xFF] if id or length out of range
```

---

#### `0x09` SET_OLED_MODE

Switches the OLED between info mode and custom frame mode.

```
Request:   [0x09, mode(0=info / 1=custom frame)]
Response:  [0x09, 0x00]
```

In mode 0 the OLED shows firmware version, current profile name, encoder hint, and profile index. In mode 1 it renders the last frame uploaded via `CMD_SET_OLED_FRAME`.

---

#### `0x0A` SET_OLED_FRAME

Uploads one 30-byte chunk of a 1024-byte (128×64 / 8) raw 1-bit bitmap. Send 35 chunks (chunk 0–33, last chunk has 4 bytes of actual data) to fill the full frame. The OLED automatically switches to frame mode (mode 1) once the final chunk is received.

```
Request:   [0x0A, chunk_index(0–33), byte0, byte1, ..., byte29]
Response:  [0x0A, 0x00] on success
           [0x0A, 0xFF] if chunk_index would write past end of buffer
```

Bitmap format: 1 bit per pixel, row-major, MSB first. Pixel at (x, y) is at bit `(7 - x%8)` of byte `(y * 16 + x / 8)`.

---

#### `0x0B` GET_PROFILE_NAME

Returns the 16-byte null-terminated name string of one profile.

```
Request:   [0x0B, profile(0–4)]
Response:  [0x0B, profile, char0, char1, ..., char15]
```

---

#### `0x0C` SET_PROFILE_NAME

Sets the name of one profile (max 15 printable ASCII characters; byte 15 is always forced to null).

```
Request:   [0x0C, profile(0–4), char0, char1, ..., char14]
Response:  [0x0C, 0x00] on success
           [0x0C, 0xFF] if profile out of range
```

---

#### `0x0D` FACTORY_RESET

Wipes EEPROM and reloads all defaults. This is immediate and irreversible.

```
Request:   [0x0D, 0×00 × 31]
Response:  [0x0D, 0x00]
```

---

#### `0x0E` RESET_TO_BOOTLOADER

Sends an acknowledgement then jumps to the UF2 bootloader. The device will appear as the RPI-RP2 drive within a few seconds.

```
Request:   [0x0E, 0×00 × 31]
Response:  [0x0E, 0x00]  (sent before jumping)
```

---

#### `0x0F` GET_PROFILE

Returns the current active profile index and the total number of profiles.

```
Request:   [0x0F, 0×00 × 31]
Response:  [0x0F, current_profile, num_profiles]
```

---

#### `0x10` SET_PROFILE

Switches the active profile.

```
Request:   [0x10, profile(0–4)]
Response:  [0x10, 0x00] on success
           [0x10, 0xFF] if profile out of range
```

---

## Python Config Tool

### Tool Requirements

```bash
pip install hid
```

The `hid` package wraps `hidapi`. On Linux you may also need:

```bash
sudo apt install libhidapi-hidraw0
# and add a udev rule so non-root users can access the device:
echo 'SUBSYSTEM=="hidraw", ATTRS{idVendor}=="feed", ATTRS{idProduct}=="0001", MODE="0666"' \
  | sudo tee /etc/udev/rules.d/99-numpad.rules
sudo udevadm control --reload-rules
```

On Windows and macOS no extra setup is needed.

### Usage

```bash
python numpad_tool.py
```

The tool will wait up to 10 seconds for the device to connect, then drop into an interactive shell:

```
>> version
Firmware version: 2.1

>> getprofile
Active profile: 0  (total: 5)

>> setprofile 2
Profile → 2  ✓

>> setkey 0 0 CTRL+C
Key [0][0] = CTRL+C (0x0106)  ✓

>> setencoder 0 1 VOLU
Encoder P0 CW = VOLU (0x0080)  ✓

>> setmacro 3 CTRL+ALT+T
Macro 3 = ['CTRL+ALT+T']  ✓

>> setname 0 MyNumpad
Profile 0 name = 'MyNumpad'  ✓

>> save
Saved to EEPROM  ✓

>> exit
```

If the device disconnects mid-session, the tool automatically attempts to reconnect before retrying the failed command.

### Full Command List

```
version                          — firmware version
getprofile                       — show active profile index
setprofile <0–4>                 — switch active profile
setkey <row> <col> <key>         — remap one key on current profile
getencoder <profile>             — show encoder keycodes for a profile
setencoder <profile> <0/1/2> <k> — set encoder action (0=CCW 1=CW 2=Press)
getmacro <id>                    — show macro keycodes for slot 0–9
setmacro <id> <k1> [k2..k5]     — write up to 5 keys into a macro slot
getname <profile>                — read profile name
setname <profile> <name>         — set profile name (max 15 chars)
save                             — flush all settings to EEPROM immediately
reset                            — factory reset (prompts for YES)
bootloader                       — jump to UF2 bootloader (prompts for YES)
help                             — show command reference
exit                             — quit
```

### Key Names

Standard keys:

```
A–Z          Letter keys
1–0          Number row
F1–F12       Function keys
ENTER        Return / Enter
ESC          Escape
BSPC         Backspace
TAB          Tab
SPACE        Space
DEL          Delete
INS          Insert
HOME END     Home / End
PGUP PGDN    Page Up / Page Down
UP DOWN      Arrow keys
LEFT RIGHT   Arrow keys
```

Media keys:

```
MUTE         Mute
VOLU VOLD    Volume Up / Down
MPLY         Play/Pause
MSTP         Stop
MNXT MPRV    Next / Previous track
BRIU BRID    Brightness Up / Down
```

Modifier combos use `+` as separator:

```
CTRL+C
SHIFT+A
ALT+F4
CTRL+SHIFT+ESC
GUI+L
```

Aliases — these alternative names all resolve correctly:

```
ESCAPE → ESC        BACKSPACE → BSPC     DELETE → DEL
INSERT → INS        RETURN → ENTER       PAGEUP → PGUP
PAGEDOWN → PGDN     VOL+ → VOLU          VOL- → VOLD
VOLUP → VOLU        VOLDOWN → VOLD       PLAY → MPLY
STOP → MSTP         PREV → MPRV          NEXT → MNXT
BRIGHT+ → BRIU      BRIGHT- → BRID       SPC → SPACE
LCTRL → CTRL        LSHIFT → SHIFT       LALT → ALT
RCTRL → CTRL        RSHIFT → SHIFT       RALT → ALT
NONE → NO           KC_NO → NO
```

---

## Profiles

Five profiles are built in. Profiles are stored entirely in EEPROM and can be renamed and reconfigured via the tool without reflashing.

| Index | Default Name | Default Purpose |
|---|---|---|
| 0 | Numpad | Standard calculator layout (7–9, 4–6, 1–3, 0) |
| 1 | Navigation | Arrow keys, Home/End, PgUp/PgDn, Insert/Delete |
| 2 | Media | Playback, volume, brightness, browser back/forward |
| 3 | Gaming | WASD + QERF + ZXC + Shift/Ctrl/Space |
| 4 | Macros | All 10 macro slots mapped to keys |

Switching profiles with `setprofile` takes effect immediately — the OLED updates to show the new profile name within one render cycle.

---

## Macros

Each macro slot (0–9) can hold up to 5 keycodes. When a macro key is pressed, the firmware executes each keycode in sequence with a 100ms delay between presses using `tap_code16()`.

Macros are assigned to keys using keycodes in the range `0xF000–0xF009`. In the Python tool you assign a macro to a key by setting the key to the macro's keycode directly, or by placing the key in profile 4 where slots 0–9 are pre-wired to the first 10 key positions.

```bash
# Write a macro: Ctrl+Alt+Del
>> setmacro 0 CTRL+ALT+DEL

# Write a multi-step macro: open terminal shortcut then type something
>> setmacro 1 CTRL+ALT+T
```

Macros support any keycode the firmware supports, including modifier combos. Maximum 5 steps per macro. Macro data is persisted in EEPROM alongside the keymap.

---

## OLED Display

The 0.96" SSD1306 OLED operates in one of two modes, switchable via `CMD_SET_OLED_MODE`:

**Mode 0 — Info (default):**
```
Line 0:  desk_helper v2.1
Line 1:  Profile: <name>
Line 2:  Knob: per-profile
Line 3:  P<n>/P4
```

**Mode 1 — Custom Frame:**
Renders a raw 1-bit 128×64 bitmap uploaded chunk-by-chunk using `CMD_SET_OLED_FRAME`. The bitmap is stored in a 1024-byte RAM buffer and is NOT persisted to EEPROM (it would consume too much of the 512-byte EEPROM space). It must be re-uploaded after each power cycle if needed.

The OLED automatically switches to mode 1 when the final frame chunk is received.

---

## Default Layouts

**Profile 0 — Numpad**
```
7      8      9      -      .
4      5      6      +      .
1      2      3    ENTER    .
0      .     MUTE    .      .
```

**Profile 1 — Navigation**
```
HOME    UP    END   PGUP    .
LEFT   DOWN  RIGHT  PGDN    .
INS    DEL   BSPC  ENTER    .
TAB    ESC    .      .      .
```

**Profile 2 — Media**
```
PLAY   STOP   PREV   NEXT    .
VOLD   VOLU   MUTE    .      .
BRID   BRIU    .      .      .
WBAK   WFWD   WREF    .      .
```

**Profile 3 — Gaming**
```
Q    W    E    R    .
A    S    D    F    .
Z    X    C    V    .
LSFT LCTL SPC   .   .
```

**Profile 4 — Macros**
```
M0   M1   M2   M3   .
M4   M5   M6   M7   .
M8   M9    .    .   .
 .    .    .    .   .
```

---

## Project Structure

```
my_numpad/
├── config.h              — GPIO pins, encoder pins, I2C pins, Raw HID IDs
├── info.json             — QMK keyboard definition (layout, USB IDs, matrix)
├── rules.mk              — Feature flags (ENCODER_ENABLE, OLED_ENABLE, RAW_ENABLE)
└── keymaps/
    └── default/
        └── keymap.c      — All firmware logic (this file)

numpad_tool.py            — Python CLI configuration tool
README.md                 — This file
```

---

## Known Limitations

- **OLED frame not persisted** — Custom bitmap frames are stored in RAM only and must be re-uploaded after each power cycle. EEPROM space is insufficient to store 1024 bytes alongside all other settings.
- **Macro delay is fixed** — The 100ms inter-key delay in macro execution is hardcoded. Some applications may need slower or faster timing.
- **Single encoder** — The firmware is written for one encoder. Adding a second would require changes to `encoder_update_user()` and the encoder map storage.
- **No per-key RGB** — The firmware has no LED support beyond the OLED.
- **Profile 4 macro slots 10+** — The macro profile layout only exposes 10 slots. The `0xF000–0xF009` range is the only supported macro keycode range; values above `0xF009` in the keymap are treated as ordinary (invalid) keycodes and do nothing.

---

## Roadmap

- [ ] Configurable macro inter-key delay (stored per macro in EEPROM)
- [ ] OLED frame persistence using external flash or a reduced-resolution bitmap
- [ ] Multi-step macro recording via the Python tool (record mode)
- [ ] Per-key LED support (requires hardware revision)
- [ ] GUI config tool (P1 + P3 integration per the team roadmap)
- [ ] Auto-updater for firmware via the GUI app
- [ ] Second encoder support

---

## License

MIT License — do whatever you want with this, just don't hold anyone liable if your keyboard does something unexpected.