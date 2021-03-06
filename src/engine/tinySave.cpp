#include <string.h>
#include <stdint.h>
#include <stdio.h>

#define ZSTD_STATIC_LINKING_ONLY
#include <zstd.h>

#include "tinySave.h"

// Compression level is a CPU and memory vs space tradeoff.
// This can be changed without breaking format compatibility.
static const int compress_level = 18;

// Versioning the save files, so we can change the compression
// or otherwise break compatibility later.
enum SaveVersion {
    CURRENT_SAVE_VERSION = 0x11,
    // Currently we only generate or support one version.
};

TinySave::TinySave()
    : size(0)
{
    initDictionary();
    cctx = ZSTD_createCCtx();
    dctx = ZSTD_createDCtx();
    cdict = ZSTD_createCDict(&dict[0], dict.size(), compress_level);
    ddict = ZSTD_createDDict(&dict[0], dict.size());
}

TinySave::~TinySave()
{
    ZSTD_freeCDict(cdict);
    ZSTD_freeDDict(ddict);
    ZSTD_freeCCtx(cctx);
    ZSTD_freeDCtx(dctx);
}

void TinySave::compress(const FileInfo& src)
{
    ZSTD_frameParameters fParams = {};
    fParams.contentSizeFlag = 0;
    fParams.checksumFlag = 1;
    fParams.noDictIDFlag = 1;

    buffer[0] = CURRENT_SAVE_VERSION;
    size_t result = ZSTD_compress_usingCDict_advanced(
            cctx, buffer + 1, sizeof buffer - 1,
            src.data, src.size, cdict, fParams);

    size = ZSTD_isError(result) ? 0 : 1 + result;
}

bool TinySave::decompress(FileInfo& dest)
{
    if (size < 1) {
        // No version header
        return false;
    }
    if (buffer[0] != CURRENT_SAVE_VERSION) {
        // No other versions supported
        return false;
    }

    size_t result = ZSTD_decompress_usingDDict(dctx, (uint8_t*) dest.data,
        DOSFilesystem::MAX_FILESIZE, buffer + 1, size - 1, ddict);

    dest.size = ZSTD_isError(result) ? 0 : result;
    return !ZSTD_isError(result);
}

const std::vector<uint8_t>& TinySave::getCompressionDictionary()
{
    return dict;
}

static void addFileToDict(std::vector<uint8_t> &dict, const FileInfo &file)
{
    // Trim trailing zeroes
    uint32_t size = file.size;
    while (size && file.data[size - 1] == 0) size--;

    // Append to dict
    dict.insert(dict.end(), file.data, file.data + size);
}

void TinySave::initDictionary()
{
    // The contents of the dictionary must not change at all,
    // or we break savegame compatibility completely!

    assert(dict.empty());

    // Built-in loadable chips
    extern FileInfo file_4bitcntr_csv;  addFileToDict(dict, file_4bitcntr_csv);
    extern FileInfo file_stereo_csv;    addFileToDict(dict, file_stereo_csv);
    extern FileInfo file_rsflop_csv;    addFileToDict(dict, file_rsflop_csv);
    extern FileInfo file_oneshot_csv;   addFileToDict(dict, file_oneshot_csv);
    extern FileInfo file_countton_csv;  addFileToDict(dict, file_countton_csv);
    extern FileInfo file_adder_csv;     addFileToDict(dict, file_adder_csv);
    extern FileInfo file_clock_csv;     addFileToDict(dict, file_clock_csv);
    extern FileInfo file_delay_csv;     addFileToDict(dict, file_delay_csv);
    extern FileInfo file_bus_csv;       addFileToDict(dict, file_bus_csv);
    extern FileInfo file_wallhug_csv;   addFileToDict(dict, file_wallhug_csv);

    // World overlays for the game
    extern FileInfo file_street_wld;    addFileToDict(dict, file_street_wld);
    extern FileInfo file_subway_wld;    addFileToDict(dict, file_subway_wld);
    extern FileInfo file_town_wld;      addFileToDict(dict, file_town_wld);
    extern FileInfo file_comp_wld;      addFileToDict(dict, file_comp_wld);

    // Chips used in initial game world
    extern FileInfo file_countton_chp;  addFileToDict(dict, file_countton_chp);
    extern FileInfo file_wallhug_chp;   addFileToDict(dict, file_wallhug_chp);
    extern FileInfo file_countton_pin;  addFileToDict(dict, file_countton_pin);
    extern FileInfo file_wallhug_pin;   addFileToDict(dict, file_wallhug_pin);

    // Initial world for the lab
    extern FileInfo file_lab_wor;       addFileToDict(dict, file_lab_wor);

    // Initial world for the game
    extern FileInfo file_sewer_wor;     addFileToDict(dict, file_sewer_wor);
    extern FileInfo file_sewer_cir;     addFileToDict(dict, file_sewer_cir);

    assert(dict.size() == 57791);
}
