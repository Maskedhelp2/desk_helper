import hid
import time
import sys

# =============================================================
#  DEVICE CONFIG
# =============================================================
VID = 0xFEED
PID = 0x0001

# =============================================================
#  COMMAND CODES  (must match firmware exactly)
# =============================================================
CMD_GET_VERSION         = 0x01
CMD_GET_LAYOUT          = 0x02
CMD_SET_KEY             = 0x03
CMD_SAVE                = 0x04
CMD_GET_ENCODER         = 0x05
CMD_SET_ENCODER         = 0x06
CMD_GET_MACRO           = 0x07
CMD_SET_MACRO           = 0x08
CMD_SET_OLED_MODE       = 0x09
CMD_SET_OLED_FRAME      = 0x0A
CMD_GET_PROFILE_NAME    = 0x0B
CMD_SET_PROFILE_NAME    = 0x0C
CMD_FACTORY_RESET       = 0x0D
CMD_RESET_TO_BOOTLOADER = 0x0E
CMD_GET_PROFILE         = 0x0F
CMD_SET_PROFILE         = 0x10

# =============================================================
#  KEYMAP
# =============================================================
KEYMAP = {
    "A": 0x04, "B": 0x05, "C": 0x06, "D": 0x07,
    "E": 0x08, "F": 0x09, "G": 0x0A, "H": 0x0B,
    "I": 0x0C, "J": 0x0D, "K": 0x0E, "L": 0x0F,
    "M": 0x10, "N": 0x11, "O": 0x12, "P": 0x13,
    "Q": 0x14, "R": 0x15, "S": 0x16, "T": 0x17,
    "U": 0x18, "V": 0x19, "W": 0x1A, "X": 0x1B,
    "Y": 0x1C, "Z": 0x1D,
    "1": 0x1E, "2": 0x1F, "3": 0x20, "4": 0x21,
    "5": 0x22, "6": 0x23, "7": 0x24, "8": 0x25,
    "9": 0x26, "0": 0x27,
    "ENTER": 0x28, "ESC": 0x29, "BSPC": 0x2A,
    "TAB": 0x2B, "SPACE": 0x2C, "MINUS": 0x2D,
    "EQUAL": 0x2E, "LBRC": 0x2F, "RBRC": 0x30,
    "BSLS": 0x31, "SCLN": 0x33, "QUOT": 0x34,
    "GRAVE": 0x35, "COMM": 0x36, "DOT": 0x37, "SLSH": 0x38,
    "F1": 0x3A, "F2": 0x3B, "F3": 0x3C, "F4": 0x3D,
    "F5": 0x3E, "F6": 0x3F, "F7": 0x40, "F8": 0x41,
    "F9": 0x42, "F10": 0x43, "F11": 0x44, "F12": 0x45,
    "INS": 0x49, "HOME": 0x4A, "PGUP": 0x4B,
    "DEL": 0x4C, "END": 0x4D, "PGDN": 0x4E,
    "RIGHT": 0x4F, "LEFT": 0x50, "DOWN": 0x51, "UP": 0x52,
    "MUTE": 0x7F, "VOLU": 0x80, "VOLD": 0x81,
    "MPLY": 0xE8, "MSTP": 0xE9, "MPRV": 0xEA, "MNXT": 0xEB,
    "BRIU": 0xF1, "BRID": 0xF2,
    "NO": 0x00,
}

MODMAP = {
    "CTRL":  0x0100,
    "SHIFT": 0x0200,
    "ALT":   0x0400,
    "GUI":   0x0800,
}

# Common aliases so both "ESC" and "ESCAPE", "DEL" and "DELETE" etc. all work
KEY_ALIASES = {
    "ESCAPE": "ESC", "BACKSPACE": "BSPC", "DELETE": "DEL",
    "INSERT": "INS",  "RETURN": "ENTER",  "RET": "ENTER",
    "PAGEUP": "PGUP", "PAGEDOWN": "PGDN", "PU": "PGUP", "PD": "PGDN",
    "VOL+": "VOLU",   "VOL-": "VOLD",     "VOLUP": "VOLU", "VOLDOWN": "VOLD",
    "PLAY": "MPLY",   "STOP": "MSTP",     "PREV": "MPRV",  "NEXT": "MNXT",
    "BRIGHT+": "BRIU","BRIGHT-": "BRID",
    "SPC": "SPACE",   "NONE": "NO",       "KC_NO": "NO",
    "LCTRL": "CTRL",  "LSHIFT": "SHIFT",  "LALT": "ALT",
    "RCTRL": "CTRL",  "RSHIFT": "SHIFT",  "RALT": "ALT",
}

ENC_ACTIONS = {0: "CCW", 1: "CW", 2: "PRESS"}

# =============================================================
#  HELPERS
# =============================================================
def encode_key(k: str) -> int:
    k = k.upper()
    k = KEY_ALIASES.get(k, k)   # resolve aliases before anything else
    if "+" in k:
        parts = k.split("+")
        val = 0
        for p in parts:
            p = KEY_ALIASES.get(p, p)   # resolve aliases inside combos too
            if p in MODMAP:
                val |= MODMAP[p]
            elif p in KEYMAP:
                val |= KEYMAP[p]
            else:
                raise ValueError(f"Unknown key part: '{p}'")
        return val
    if k not in KEYMAP:
        raise ValueError(f"Unknown key: '{k}'")
    return KEYMAP[k]


def find_device():
    try:
        devices = hid.enumerate(VID, PID)
    except Exception:
        return None
    # Prefer exact match on both usage_page and usage
    for d in devices:
        if d['usage_page'] == 0xFF60 and d['usage'] == 0x61:
            return d['path']
    # Fallback: usage_page only
    for d in devices:
        if d['usage_page'] == 0xFF60:
            return d['path']
    return None


def connect(timeout_s: int = 10) -> hid.device:
    print(f"Waiting for device (VID={VID:#06x} PID={PID:#06x})...")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        path = find_device()
        if path:
            h = hid.device()
            h.open_path(path)
            print("Connected.")
            return h
        time.sleep(0.5)
    print("Device not found within timeout.")
    sys.exit(1)


def send(h: hid.device, data: list) -> list:
    packet = ([0] + data + [0] * 32)[:33]
    h.write(packet)
    resp = h.read(32, timeout_ms=1000)
    if not resp:
        raise TimeoutError("No response from device")
    resp = list(resp)
    # Some OS/HID implementations prepend a report-ID byte (0x00) to reads,
    # shifting the actual payload right by 1.  Strip it so callers always
    # see [cmd, status, data...] regardless of platform.
    if resp[0] == 0x00:
        resp = resp[1:]
    if len(resp) < 2:
        raise ValueError(f"Response too short: got {len(resp)} byte(s)")
    return resp


def assert_ok(resp: list, cmd: int):
    # resp[0] is normally the echoed cmd byte, but some platforms prepend a
    # 0x00 report-ID byte so the payload starts at resp[1].  Accept either.
    if resp[0] == cmd:
        if resp[1] == 0xFF:
            raise ValueError(f"Device returned error for cmd {cmd:#04x}")
    elif len(resp) > 2 and resp[1] == cmd:
        if len(resp) > 2 and resp[2] == 0xFF:
            raise ValueError(f"Device returned error for cmd {cmd:#04x}")
    else:
        raise ValueError(f"Response cmd mismatch: got {resp[0]:#04x}, expected {cmd:#04x}")


# =============================================================
#  COMMANDS
# =============================================================
def cmd_get_version(h):
    r = send(h, [CMD_GET_VERSION] + [0] * 31)
    print(f"Firmware version: {r[1]}.{r[2]}")


def cmd_get_profile(h):
    r = send(h, [CMD_GET_PROFILE] + [0] * 31)
    print(f"Active profile: {r[1]}  (total: {r[2]})")
    return r[1]


def cmd_set_profile(h, profile: int):
    if not (0 <= profile <= 4):
        print("Error: profile must be 0–4"); return
    r = send(h, [CMD_SET_PROFILE, profile] + [0] * 30)
    assert_ok(r, CMD_SET_PROFILE)
    print(f"Profile → {profile}  ✓")


def cmd_set_key(h, row: int, col: int, key: str):
    if not (0 <= row <= 3):
        print("Error: row must be 0–3"); return
    if not (0 <= col <= 4):
        print("Error: col must be 0–4"); return
    val = encode_key(key)
    r = send(h, [CMD_SET_KEY, row, col, 0, val & 0xFF, (val >> 8) & 0xFF] + [0] * 26)
    assert_ok(r, CMD_SET_KEY)
    print(f"Key [{row}][{col}] = {key} ({val:#06x})  ✓")


def cmd_get_encoder(h, profile: int):
    if not (0 <= profile <= 4):
        print("Error: profile must be 0–4"); return
    r = send(h, [CMD_GET_ENCODER, profile] + [0] * 30)
    ccw   = (r[3] << 8) | r[2]
    cw    = (r[5] << 8) | r[4]
    press = (r[7] << 8) | r[6]
    print(f"Encoder P{r[1]}:  CCW={ccw:#06x}  CW={cw:#06x}  PRESS={press:#06x}")


def cmd_set_encoder(h, profile: int, action: int, key: str):
    if not (0 <= profile <= 4):
        print("Error: profile must be 0–4"); return
    if action not in (0, 1, 2):
        print("Error: action must be 0 (CCW), 1 (CW), or 2 (PRESS)"); return
    val = encode_key(key)
    r = send(h, [CMD_SET_ENCODER, profile, action, val & 0xFF, (val >> 8) & 0xFF] + [0] * 27)
    assert_ok(r, CMD_SET_ENCODER)
    print(f"Encoder P{profile} {ENC_ACTIONS[action]} = {key} ({val:#06x})  ✓")


def cmd_get_macro(h, macro_id: int):
    if not (0 <= macro_id <= 9):
        print("Error: macro_id must be 0–9"); return
    r = send(h, [CMD_GET_MACRO, macro_id] + [0] * 30)
    if r[1] == 0xFF:
        print("Error: firmware returned error"); return
    length = r[2]
    keys = [(r[3 + i*2 + 1] << 8) | r[3 + i*2] for i in range(length)]
    print(f"Macro {macro_id}: len={length}  keycodes={[hex(k) for k in keys]}")


def cmd_set_macro(h, macro_id: int, keys: list):
    if not (0 <= macro_id <= 9):
        print("Error: macro_id must be 0–9"); return
    if len(keys) > 5:
        print("Error: max 5 keys per macro"); return
    encoded = [encode_key(k) for k in keys]
    pkt = [CMD_SET_MACRO, macro_id, len(encoded)]
    for v in encoded:
        pkt += [v & 0xFF, (v >> 8) & 0xFF]
    pkt += [0] * (32 - len(pkt))
    r = send(h, pkt)
    assert_ok(r, CMD_SET_MACRO)
    print(f"Macro {macro_id} = {keys}  ✓")


def cmd_get_profile_name(h, profile: int):
    if not (0 <= profile <= 4):
        print("Error: profile must be 0–4"); return
    r = send(h, [CMD_GET_PROFILE_NAME, profile] + [0] * 30)
    if r[1] == 0xFF:
        print("Error: firmware returned error"); return
    name = bytes(r[2:18]).rstrip(b'\x00').decode('ascii', errors='replace')
    print(f"Profile {profile} name: '{name}'")


def cmd_set_profile_name(h, profile: int, name: str):
    if not (0 <= profile <= 4):
        print("Error: profile must be 0–4"); return
    if len(name) > 15:
        print("Error: name max 15 chars"); return
    nb = name.encode('ascii', errors='replace')[:15]
    pkt = [CMD_SET_PROFILE_NAME, profile] + list(nb)
    pkt += [0] * (32 - len(pkt))
    r = send(h, pkt)
    assert_ok(r, CMD_SET_PROFILE_NAME)
    print(f"Profile {profile} name = '{name}'  ✓")


def cmd_save(h):
    r = send(h, [CMD_SAVE] + [0] * 31)
    assert_ok(r, CMD_SAVE)
    print("Saved to EEPROM  ✓")


def cmd_factory_reset(h):
    if input("Factory reset wipes ALL settings. Type YES: ").strip() != "YES":
        print("Cancelled."); return
    r = send(h, [CMD_FACTORY_RESET] + [0] * 31)
    assert_ok(r, CMD_FACTORY_RESET)
    print("Factory reset done  ✓")


def cmd_bootloader(h):
    if input("Jump to bootloader? Type YES: ").strip() != "YES":
        print("Cancelled."); return
    try:
        send(h, [CMD_RESET_TO_BOOTLOADER] + [0] * 31)
    except Exception:
        pass
    print("Bootloader jump sent. Device will appear as RPI-RP2.")


# =============================================================
#  HELP
# =============================================================
HELP = """
Commands:
  version                            firmware version
  getprofile                         show active profile
  setprofile <0-4>                   switch profile
  setkey <row> <col> <key>           e.g.  setkey 0 0 A
  getencoder <profile>               show encoder keycodes for a profile
  setencoder <profile> <0/1/2> <k>   0=CCW 1=CW 2=PRESS  e.g. setencoder 2 0 LEFT
  getmacro <id>                      show macro keycodes
  setmacro <id> <k1> [k2..k5]       e.g.  setmacro 0 CTRL+C
  getname <profile>                  get profile name
  setname <profile> <name>           e.g.  setname 0 Numpad
  save                               flush to EEPROM
  reset                              factory reset (asks YES)
  bootloader                         jump to UF2 bootloader (asks YES)
  help                               this message
  exit                               quit

Key examples: A  ENTER  SPACE  F1  CTRL+C  SHIFT+A  VOLU  MPLY  LEFT
Profiles 0-4: Numpad | Navigation | Media | Gaming | Macros
"""

# =============================================================
#  MAIN
# =============================================================
def main():
    h = connect()
    print(HELP)

    while True:
        try:
            raw = input(">> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not raw:
            continue

        parts = raw.split()
        cmd   = parts[0].lower()

        try:
            if cmd == "exit":
                break
            elif cmd == "help":
                print(HELP)
            elif cmd == "version":
                cmd_get_version(h)
            elif cmd == "getprofile":
                cmd_get_profile(h)
            elif cmd == "setprofile":
                if len(parts) < 2: print("Usage: setprofile <0-4>"); continue
                cmd_set_profile(h, int(parts[1]))
            elif cmd == "setkey":
                if len(parts) < 4: print("Usage: setkey <row> <col> <key>"); continue
                cmd_set_key(h, int(parts[1]), int(parts[2]), parts[3])
            elif cmd == "getencoder":
                if len(parts) < 2: print("Usage: getencoder <profile>"); continue
                cmd_get_encoder(h, int(parts[1]))
            elif cmd == "setencoder":
                if len(parts) < 4: print("Usage: setencoder <profile> <0/1/2> <key>"); continue
                cmd_set_encoder(h, int(parts[1]), int(parts[2]), parts[3])
            elif cmd == "getmacro":
                if len(parts) < 2: print("Usage: getmacro <id>"); continue
                cmd_get_macro(h, int(parts[1]))
            elif cmd == "setmacro":
                if len(parts) < 3: print("Usage: setmacro <id> <key1> [key2...]"); continue
                cmd_set_macro(h, int(parts[1]), parts[2:])
            elif cmd == "getname":
                if len(parts) < 2: print("Usage: getname <profile>"); continue
                cmd_get_profile_name(h, int(parts[1]))
            elif cmd == "setname":
                if len(parts) < 3: print("Usage: setname <profile> <name>"); continue
                cmd_set_profile_name(h, int(parts[1]), parts[2])
            elif cmd == "save":
                cmd_save(h)
            elif cmd == "reset":
                cmd_factory_reset(h)
            elif cmd == "bootloader":
                cmd_bootloader(h)
            else:
                print(f"Unknown command '{cmd}'. Type 'help'.")

        except TimeoutError:
            print("Device did not respond. Reconnecting...")
            h.close()
            h = connect()
        except ValueError as e:
            print(f"Error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}. Reconnecting...")
            try: h.close()
            except Exception: pass
            h = connect()

    h.close()


if __name__ == "__main__":
    main()