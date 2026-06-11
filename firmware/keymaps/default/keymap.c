#include QMK_KEYBOARD_H
#include "eeprom.h"
#include "raw_hid.h"

// =============================================================
//  FIRMWARE VERSION
// =============================================================
#define FW_VERSION_MAJOR 2
#define FW_VERSION_MINOR 1

// =============================================================
//  LAYOUT CONFIG
// =============================================================
#define NUM_PROFILES     5
#define ROWS             4
#define COLS             5
#define MAX_MACROS       10
#define MACRO_LEN        5
#define PROFILE_NAME_LEN 16

// =============================================================
//  HID COMMAND CODES
// =============================================================
#define CMD_GET_VERSION         0x01
#define CMD_GET_LAYOUT          0x02
#define CMD_SET_KEY             0x03
#define CMD_SAVE                0x04
#define CMD_GET_ENCODER         0x05
#define CMD_SET_ENCODER         0x06
#define CMD_GET_MACRO           0x07
#define CMD_SET_MACRO           0x08
#define CMD_SET_OLED_MODE       0x09
#define CMD_SET_OLED_FRAME      0x0A
#define CMD_GET_PROFILE_NAME    0x0B
#define CMD_SET_PROFILE_NAME    0x0C
#define CMD_FACTORY_RESET       0x0D
#define CMD_RESET_TO_BOOTLOADER 0x0E
#define CMD_GET_PROFILE         0x0F
#define CMD_SET_PROFILE         0x10

// =============================================================
//  EEPROM ADDRESS MAP
// =============================================================
//   0          magic byte
//   1          current_profile
//   2-31       encoder_map   (5 profiles x 3 actions x 2 bytes = 30 bytes)
//   32-39      reserved
//   40-239     dynamic keys  (5 x 4 x 5 x 2 = 200 bytes)
//   240-249    macro lengths (10 x 1 = 10 bytes)
//   250-349    macro keys    (10 x 5 x 2 = 100 bytes)
//   350-429    profile names (5 x 16 = 80 bytes)
//   Total: 430 / 512

#define EEPROM_MAGIC              0x45
#define EEPROM_ADDR_MAGIC         0
#define EEPROM_ADDR_PROFILE       1
#define EEPROM_ADDR_ENCODER_MAP   2
#define EEPROM_ADDR_KEYS          40
#define EEPROM_ADDR_MACRO_LENS    240
#define EEPROM_ADDR_MACRO_KEYS    250
#define EEPROM_ADDR_PROFILE_NAMES 350

// =============================================================
//  GLOBAL STATE
// =============================================================
uint8_t  current_profile = 0;
uint8_t  oled_mode       = 0;   // 0=info  1=custom frame

uint16_t encoder_map[NUM_PROFILES][3];  // [profile][0=CCW 1=CW 2=press]
uint16_t dynamic_keys[NUM_PROFILES][ROWS][COLS];
uint16_t macros[MAX_MACROS][MACRO_LEN];
uint8_t  macro_len[MAX_MACROS];
char     profile_names[NUM_PROFILES][PROFILE_NAME_LEN];

uint8_t oled_frame[1024];  // 128x64 / 8 bytes



// =============================================================
//  DEFAULT LAYOUTS  (5 profiles)
// =============================================================
static const uint16_t profiles[NUM_PROFILES][ROWS][COLS] = {

    // 0 - Numpad
    {
        {KC_7,   KC_8,   KC_9,    KC_PMNS, KC_NO},
        {KC_4,   KC_5,   KC_6,    KC_PPLS, KC_NO},
        {KC_1,   KC_2,   KC_3,    KC_ENT,  KC_NO},
        {KC_0,   KC_DOT, KC_MUTE, KC_NO,   KC_NO}
    },

    // 1 - Navigation
    {
        {KC_HOME, KC_UP,   KC_END,  KC_PGUP, KC_NO},
        {KC_LEFT, KC_DOWN, KC_RGHT, KC_PGDN, KC_NO},
        {KC_INS,  KC_DEL,  KC_BSPC, KC_ENT,  KC_NO},
        {KC_TAB,  KC_ESC,  KC_NO,   KC_NO,   KC_NO}
    },

    // 2 - Media
    {
        {KC_MPLY, KC_MSTP, KC_MPRV, KC_MNXT, KC_NO},
        {KC_VOLD, KC_VOLU, KC_MUTE, KC_NO,   KC_NO},
        {KC_BRID, KC_BRIU, KC_NO,   KC_NO,   KC_NO},
        {KC_WBAK, KC_WFWD, KC_WREF, KC_NO,   KC_NO}
    },

    // 3 - Gaming
    {
        {KC_Q,    KC_W,    KC_E,   KC_R,  KC_NO},
        {KC_A,    KC_S,    KC_D,   KC_F,  KC_NO},
        {KC_Z,    KC_X,    KC_C,   KC_V,  KC_NO},
        {KC_LSFT, KC_LCTL, KC_SPC, KC_NO, KC_NO}
    },

    // 4 - Macros (keys 0xF000-0xF009 trigger macro slots 0-9)
    {
        {0xF000, 0xF001, 0xF002, 0xF003, KC_NO},
        {0xF004, 0xF005, 0xF006, 0xF007, KC_NO},
        {0xF008, 0xF009, KC_NO,  KC_NO,  KC_NO},
        {KC_NO,  KC_NO,  KC_NO,  KC_NO,  KC_NO}
    }
};

// =============================================================
//  DEFAULT PROFILE NAMES
// =============================================================
static const char default_profile_names[NUM_PROFILES][PROFILE_NAME_LEN] = {
    "Numpad",
    "Navigation",
    "Media",
    "Gaming",
    "Macros"
};

// =============================================================
//  DEFAULT ENCODER MAP
//  [profile][0=CCW  1=CW  2=press]
// =============================================================
static const uint16_t default_encoder_map[NUM_PROFILES][3] = {
    {KC_VOLD, KC_VOLU, KC_MUTE},
    {KC_LEFT, KC_RGHT, KC_ENT},
    {KC_MPRV, KC_MNXT, KC_MPLY},
    {KC_PGDN, KC_PGUP, KC_ESC},
    {KC_BRID, KC_BRIU, KC_NO}
};

// =============================================================
//  EEPROM  -  SAVE
// =============================================================
void save_to_eeprom(void) {
    eeprom_update_byte((uint8_t*)EEPROM_ADDR_MAGIC,   EEPROM_MAGIC);
    eeprom_update_byte((uint8_t*)EEPROM_ADDR_PROFILE, current_profile);

    int enc_idx = EEPROM_ADDR_ENCODER_MAP;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int a = 0; a < 3; a++) {
            eeprom_update_byte((uint8_t*)enc_idx,       encoder_map[p][a] & 0xFF);
            eeprom_update_byte((uint8_t*)(enc_idx + 1), encoder_map[p][a] >> 8);
            enc_idx += 2;
        }
    }

    int idx = EEPROM_ADDR_KEYS;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int r = 0; r < ROWS; r++) {
            for (int c = 0; c < COLS; c++) {
                uint16_t k = dynamic_keys[p][r][c];
                eeprom_update_byte((uint8_t*)idx,       k & 0xFF);
                eeprom_update_byte((uint8_t*)(idx + 1), k >> 8);
                idx += 2;
            }
        }
    }

    for (int i = 0; i < MAX_MACROS; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_ADDR_MACRO_LENS + i), macro_len[i]);
    }

    idx = EEPROM_ADDR_MACRO_KEYS;
    for (int i = 0; i < MAX_MACROS; i++) {
        for (int j = 0; j < MACRO_LEN; j++) {
            uint16_t k = macros[i][j];
            eeprom_update_byte((uint8_t*)idx,       k & 0xFF);
            eeprom_update_byte((uint8_t*)(idx + 1), k >> 8);
            idx += 2;
        }
    }

    idx = EEPROM_ADDR_PROFILE_NAMES;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int i = 0; i < PROFILE_NAME_LEN; i++) {
            eeprom_update_byte((uint8_t*)(idx + i), (uint8_t)profile_names[p][i]);
        }
        idx += PROFILE_NAME_LEN;
    }
}

// =============================================================
//  EEPROM  -  LOAD DEFAULTS
// =============================================================
void load_defaults(void) {
    current_profile = 0;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int a = 0; a < 3; a++)
            encoder_map[p][a] = default_encoder_map[p][a];
        for (int r = 0; r < ROWS; r++)
            for (int c = 0; c < COLS; c++)
                dynamic_keys[p][r][c] = profiles[p][r][c];
        for (int i = 0; i < PROFILE_NAME_LEN; i++)
            profile_names[p][i] = default_profile_names[p][i];
    }
    for (int i = 0; i < MAX_MACROS; i++) {
        macro_len[i] = 0;
        for (int j = 0; j < MACRO_LEN; j++)
            macros[i][j] = KC_NO;
    }
}

// =============================================================
//  EEPROM  -  LOAD
// =============================================================
void load_from_eeprom(void) {
    if (eeprom_read_byte((uint8_t*)EEPROM_ADDR_MAGIC) != EEPROM_MAGIC) {
        load_defaults();
        save_to_eeprom();  // safe here: called from keyboard_post_init_user, not USB callback
        return;
    }

    current_profile = eeprom_read_byte((uint8_t*)EEPROM_ADDR_PROFILE);
    if (current_profile >= NUM_PROFILES) current_profile = 0;

    int enc_idx = EEPROM_ADDR_ENCODER_MAP;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int a = 0; a < 3; a++) {
            uint8_t lo = eeprom_read_byte((uint8_t*)enc_idx);
            uint8_t hi = eeprom_read_byte((uint8_t*)(enc_idx + 1));
            encoder_map[p][a] = ((uint16_t)hi << 8) | lo;
            enc_idx += 2;
        }
    }

    int idx = EEPROM_ADDR_KEYS;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int r = 0; r < ROWS; r++) {
            for (int c = 0; c < COLS; c++) {
                uint8_t lo = eeprom_read_byte((uint8_t*)idx);
                uint8_t hi = eeprom_read_byte((uint8_t*)(idx + 1));
                dynamic_keys[p][r][c] = ((uint16_t)hi << 8) | lo;
                idx += 2;
            }
        }
    }

    for (int i = 0; i < MAX_MACROS; i++) {
        macro_len[i] = eeprom_read_byte((uint8_t*)(EEPROM_ADDR_MACRO_LENS + i));
        if (macro_len[i] > MACRO_LEN) macro_len[i] = 0;
    }

    idx = EEPROM_ADDR_MACRO_KEYS;
    for (int i = 0; i < MAX_MACROS; i++) {
        for (int j = 0; j < MACRO_LEN; j++) {
            uint8_t lo = eeprom_read_byte((uint8_t*)idx);
            uint8_t hi = eeprom_read_byte((uint8_t*)(idx + 1));
            macros[i][j] = ((uint16_t)hi << 8) | lo;
            idx += 2;
        }
    }

    idx = EEPROM_ADDR_PROFILE_NAMES;
    for (int p = 0; p < NUM_PROFILES; p++) {
        for (int i = 0; i < PROFILE_NAME_LEN; i++)
            profile_names[p][i] = (char)eeprom_read_byte((uint8_t*)(idx + i));
        profile_names[p][PROFILE_NAME_LEN - 1] = '\0';
        idx += PROFILE_NAME_LEN;
    }
}

// =============================================================
//  MACRO  -  EXECUTE
// =============================================================
void run_macro(uint8_t id) {
    if (id >= MAX_MACROS) return;
    for (uint8_t i = 0; i < macro_len[id]; i++) {
        tap_code16(macros[id][i]);
        wait_ms(100);
    }
}

// =============================================================
//  OLED
// =============================================================
#ifdef OLED_ENABLE

oled_rotation_t oled_init_user(oled_rotation_t rotation) {
    return OLED_ROTATION_0;
}

bool oled_task_user(void) {
    oled_clear();
    if (oled_mode == 1) {
        oled_write_raw((const char*)oled_frame, sizeof(oled_frame));
    } else {
        oled_set_cursor(0, 0);
        oled_write_P(PSTR("desk_helper v2.1"), false);
        oled_set_cursor(0, 1);
        oled_write_P(PSTR("Profile: "), false);
        oled_write(profile_names[current_profile], false);
        oled_set_cursor(0, 2);
        oled_write_P(PSTR("Knob: per-profile"), false);
        oled_set_cursor(0, 3);
        char buf[6];
        buf[0] = 'P';
        buf[1] = '0' + current_profile;
        buf[2] = '/';
        buf[3] = '0' + (NUM_PROFILES - 1);
        buf[4] = '\0';
        oled_write(buf, false);
    }
    return false;
}

#endif

// =============================================================
//  INIT
// =============================================================
void keyboard_post_init_user(void) {
    load_from_eeprom();
}

// =============================================================
//  STATIC KEYMAP  (placeholder - dynamic_keys overrides these)
// =============================================================
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT(
        KC_1, KC_2, KC_3, KC_4, KC_5,
        KC_6, KC_7, KC_8, KC_9, KC_0,
        KC_Q, KC_W, KC_E, KC_R, KC_T,
        KC_A, KC_S, KC_D, KC_F, KC_G
    )
};

// =============================================================
//  ENCODER
// =============================================================
bool encoder_update_user(uint8_t index, bool clockwise) {
    uint16_t key = clockwise ? encoder_map[current_profile][1]
                             : encoder_map[current_profile][0];
    if (key != KC_NO) tap_code16(key);
    return false;
}

// =============================================================
//  KEY HANDLER
// =============================================================
bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    if (record->event.pressed) {
        uint8_t  r       = record->event.key.row;
        uint8_t  c       = record->event.key.col;
        uint16_t dyn_key = dynamic_keys[current_profile][r][c];

        if (dyn_key >= 0xF000) {
            run_macro(dyn_key - 0xF000);
        } else if (dyn_key != KC_NO) {
            tap_code16(dyn_key);
        }
    }
    return false;
}

// =============================================================
//  RAW HID
//  IMPORTANT: Never call save_to_eeprom() here directly.
//  Always call save_to_eeprom() instead - see deferred save comment above.
// =============================================================
void raw_hid_receive(uint8_t *data, uint8_t length) {

    if (length < 1) return;

    uint8_t cmd = data[0];
    uint8_t response[32];
    memset(response, 0, sizeof(response));
    response[0] = cmd;

#define HID_NEED(n) do { \
    if (length < (n)) { \
        response[1] = 0xFF; \
        raw_hid_send(response, sizeof(response)); \
        return; \
    } \
} while(0)

    switch (cmd) {

        // 0x01  GET_VERSION -> [cmd, major, minor]
        case CMD_GET_VERSION:
            response[1] = FW_VERSION_MAJOR;
            response[2] = FW_VERSION_MINOR;
            raw_hid_send(response, sizeof(response));
            break;

        // 0x02  GET_LAYOUT
        //   req:  [cmd, profile, chunk]
        //   resp: [cmd, profile, chunk, total_chunks, k0_lo, k0_hi ... x7]
        case CMD_GET_LAYOUT: {
            HID_NEED(3);
            uint8_t p              = (data[1] < NUM_PROFILES) ? data[1] : current_profile;
            uint8_t chunk          = data[2];
            uint8_t total_keys     = ROWS * COLS;
            uint8_t keys_per_chunk = 7;
            uint8_t total_chunks   = (total_keys + keys_per_chunk - 1) / keys_per_chunk;

            if (chunk >= total_chunks) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            response[1] = p;
            response[2] = chunk;
            response[3] = total_chunks;

            uint8_t start = chunk * keys_per_chunk;
            uint8_t end   = start + keys_per_chunk;
            if (end > total_keys) end = total_keys;

            int idx = 4;
            for (uint8_t ki = start; ki < end; ki++) {
                uint16_t k = dynamic_keys[p][ki / COLS][ki % COLS];
                response[idx++] = k & 0xFF;
                response[idx++] = k >> 8;
            }
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x03  SET_KEY -> [cmd, row, col, 0, key_lo, key_hi]
        case CMD_SET_KEY:
            HID_NEED(6);
            if (data[1] < ROWS && data[2] < COLS) {
                dynamic_keys[current_profile][data[1]][data[2]] =
                    ((uint16_t)data[5] << 8) | data[4];
                save_to_eeprom();
                response[1] = 0x00;
            } else {
                response[1] = 0xFF;
            }
            raw_hid_send(response, sizeof(response));
            break;

        // 0x04  SAVE  (explicit flush requested from Python tool)
        case CMD_SAVE:
            save_to_eeprom();
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;

        // 0x05  GET_ENCODER
        //   req:  [cmd, profile]
        //   resp: [cmd, profile, ccw_lo, ccw_hi, cw_lo, cw_hi, press_lo, press_hi]
        case CMD_GET_ENCODER: {
            HID_NEED(2);
            uint8_t p = (data[1] < NUM_PROFILES) ? data[1] : current_profile;
            response[1] = p;
            response[2] = encoder_map[p][0] & 0xFF;
            response[3] = encoder_map[p][0] >> 8;
            response[4] = encoder_map[p][1] & 0xFF;
            response[5] = encoder_map[p][1] >> 8;
            response[6] = encoder_map[p][2] & 0xFF;
            response[7] = encoder_map[p][2] >> 8;
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x06  SET_ENCODER -> [cmd, profile, action(0/1/2), key_lo, key_hi]
        case CMD_SET_ENCODER: {
            HID_NEED(5);
            uint8_t p      = data[1];
            uint8_t action = data[2];
            if (p >= NUM_PROFILES || action > 2) {
                response[1] = 0xFF;
            } else {
                encoder_map[p][action] = ((uint16_t)data[4] << 8) | data[3];
                save_to_eeprom();
                response[1] = 0x00;
            }
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x07  GET_MACRO -> [cmd, id] -> [cmd, id, len, k0_lo, k0_hi ...]
        case CMD_GET_MACRO: {
            HID_NEED(2);
            uint8_t id = data[1];
            if (id >= MAX_MACROS) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            response[1] = id;
            response[2] = macro_len[id];
            int idx = 3;
            for (uint8_t i = 0; i < macro_len[id]; i++) {
                response[idx++] = macros[id][i] & 0xFF;
                response[idx++] = macros[id][i] >> 8;
            }
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x08  SET_MACRO -> [cmd, id, len, k0_lo, k0_hi ...]
        case CMD_SET_MACRO: {
            HID_NEED(3);
            uint8_t id  = data[1];
            uint8_t len = data[2];
            if (id >= MAX_MACROS || len > MACRO_LEN) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            HID_NEED(3 + len * 2);
            macro_len[id] = len;
            int idx = 3;
            for (uint8_t i = 0; i < len; i++) {
                macros[id][i] = ((uint16_t)data[idx + 1] << 8) | data[idx];
                idx += 2;
            }
            save_to_eeprom();
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x09  SET_OLED_MODE -> [cmd, mode]
        case CMD_SET_OLED_MODE:
            oled_mode = data[1];
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;

        // 0x0A  SET_OLED_FRAME -> [cmd, chunk(0-33), data x30]
        case CMD_SET_OLED_FRAME: {
            HID_NEED(2);
            uint16_t offset = (uint16_t)data[1] * 30;
            if (offset >= sizeof(oled_frame)) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            uint16_t to_copy = sizeof(oled_frame) - offset;
            if (to_copy > 30) to_copy = 30;
            memcpy(oled_frame + offset, data + 2, to_copy);
            if (offset + to_copy >= sizeof(oled_frame)) oled_mode = 1;
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x0B  GET_PROFILE_NAME -> [cmd, profile] -> [cmd, profile, name x16]
        case CMD_GET_PROFILE_NAME: {
            HID_NEED(2);
            uint8_t p = data[1];
            if (p >= NUM_PROFILES) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            response[1] = p;
            memcpy(response + 2, profile_names[p], PROFILE_NAME_LEN);
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x0C  SET_PROFILE_NAME -> [cmd, profile, name x15]
        case CMD_SET_PROFILE_NAME: {
            HID_NEED(3);
            uint8_t p = data[1];
            if (p >= NUM_PROFILES) {
                response[1] = 0xFF;
                raw_hid_send(response, sizeof(response));
                break;
            }
            memcpy(profile_names[p], data + 2, PROFILE_NAME_LEN - 1);
            profile_names[p][PROFILE_NAME_LEN - 1] = '\0';
            save_to_eeprom();
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;
        }

        // 0x0D  FACTORY_RESET
        case CMD_FACTORY_RESET:
            load_defaults();
            save_to_eeprom();
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            break;

        // 0x0E  RESET_TO_BOOTLOADER
        case CMD_RESET_TO_BOOTLOADER:
            response[1] = 0x00;
            raw_hid_send(response, sizeof(response));
            wait_ms(100);
            bootloader_jump();
            break;

        // 0x0F  GET_PROFILE -> [cmd, current_profile, num_profiles]
        case CMD_GET_PROFILE:
            response[1] = current_profile;
            response[2] = NUM_PROFILES;
            raw_hid_send(response, sizeof(response));
            break;

        // 0x10  SET_PROFILE -> [cmd, profile]
        case CMD_SET_PROFILE:
            HID_NEED(2);
            if (data[1] < NUM_PROFILES) {
                current_profile = data[1];
                save_to_eeprom();
                response[1] = 0x00;
            } else {
                response[1] = 0xFF;
            }
            raw_hid_send(response, sizeof(response));
            break;

        default:
            response[1] = 0xFF;
            raw_hid_send(response, sizeof(response));
            break;
    }

#undef HID_NEED
}