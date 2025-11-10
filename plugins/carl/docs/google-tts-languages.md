# Google-TTS-API Supported Languages

This document lists all the languages supported by the google-tts-api (Google Text-to-Speech) provider in CARL.

## Overview

Google-TTS-API supports **43 languages** using Google's Text-to-Speech API. Unlike the `say` provider which uses platform-specific voice names, google-tts-api uses standardized language codes that work across all platforms.

## Supported Languages

| Language Code | Language Name | Example Configuration |
|--------------|---------------|----------------------|
| `en` | English | `"tts_voice": "en"` |
| `es` | Spanish | `"tts_voice": "es"` |
| `fr` | French | `"tts_voice": "fr"` |
| `de` | German | `"tts_voice": "de"` |
| `it` | Italian | `"tts_voice": "it"` |
| `pt` | Portuguese | `"tts_voice": "pt"` |
| `ru` | Russian | `"tts_voice": "ru"` |
| `ja` | Japanese | `"tts_voice": "ja"` |
| `ko` | Korean | `"tts_voice": "ko"` |
| `zh` | Chinese (Simplified) | `"tts_voice": "zh"` |
| `zh-CN` | Chinese (Simplified - China) | `"tts_voice": "zh-CN"` |
| `zh-TW` | Chinese (Traditional - Taiwan) | `"tts_voice": "zh-TW"` |
| `ar` | Arabic | `"tts_voice": "ar"` |
| `hi` | Hindi | `"tts_voice": "hi"` |
| `ta` | Tamil | `"tts_voice": "ta"` |
| `tr` | Turkish | `"tts_voice": "tr"` |
| `vi` | Vietnamese | `"tts_voice": "vi"` |
| `pl` | Polish | `"tts_voice": "pl"` |
| `nl` | Dutch | `"tts_voice": "nl"` |
| `el` | Greek | `"tts_voice": "el"` |
| `cs` | Czech | `"tts_voice": "cs"` |
| `sv` | Swedish | `"tts_voice": "sv"` |
| `ro` | Romanian | `"tts_voice": "ro"` |
| `hu` | Hungarian | `"tts_voice": "hu"` |
| `da` | Danish | `"tts_voice": "da"` |
| `fi` | Finnish | `"tts_voice": "fi"` |
| `no` | Norwegian | `"tts_voice": "no"` |
| `id` | Indonesian | `"tts_voice": "id"` |
| `th` | Thai | `"tts_voice": "th"` |
| `sw` | Swahili | `"tts_voice": "sw"` |
| `af` | Afrikaans | `"tts_voice": "af"` |
| `sq` | Albanian | `"tts_voice": "sq"` |
| `hy` | Armenian | `"tts_voice": "hy"` |
| `ca` | Catalan | `"tts_voice": "ca"` |
| `hr` | Croatian | `"tts_voice": "hr"` |
| `eo` | Esperanto | `"tts_voice": "eo"` |
| `ht` | Haitian Creole | `"tts_voice": "ht"` |
| `is` | Icelandic | `"tts_voice": "is"` |
| `la` | Latin | `"tts_voice": "la"` |
| `lv` | Latvian | `"tts_voice": "lv"` |
| `mk` | Macedonian | `"tts_voice": "mk"` |
| `sk` | Slovak | `"tts_voice": "sk"` |
| `cy` | Welsh | `"tts_voice": "cy"` |

## Usage Examples

### English Notification
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "en"
  }
}
```

### Spanish Notification
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "es"
  }
}
```

### Japanese Notification
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "ja"
  }
}
```

### Chinese (Simplified) Notification
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "zh-CN"
  }
}
```

## Testing Languages

You can test any language using the command line:

```bash
cd plugins/carl
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-tts-api CARL_CARL_CONFIGURATION_TTS_VOICE=es node lib/notify.cjs "Hola mundo" "tts"
```

### Test Examples by Language

#### English
```bash
node lib/notify.cjs "Hello world" "tts"
```

#### Spanish
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=es node lib/notify.cjs "Hola mundo" "tts"
```

#### French
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=fr node lib/notify.cjs "Bonjour le monde" "tts"
```

#### German
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=de node lib/notify.cjs "Hallo Welt" "tts"
```

#### Japanese
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=ja node lib/notify.cjs "こんにちは世界" "tts"
```

#### Chinese (Simplified)
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=zh-CN node lib/notify.cjs "你好世界" "tts"
```

#### Korean
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=ko node lib/notify.cjs "안녕하세요 세계" "tts"
```

#### Russian
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=ru node lib/notify.cjs "Привет мир" "tts"
```

#### Arabic
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=ar node lib/notify.cjs "مرحبا بالعالم" "tts"
```

#### Hindi
```bash
CARL_CARL_CONFIGURATION_TTS_VOICE=hi node lib/notify.cjs "नमस्ते दुनिया" "tts"
```

## Popular Language Groupings

### European Languages
- English (`en`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)
- Italian (`it`)
- Portuguese (`pt`)
- Russian (`ru`)
- Polish (`pl`)
- Dutch (`nl`)
- Greek (`el`)
- Czech (`cs`)
- Swedish (`sv`)
- Romanian (`ro`)
- Hungarian (`hu`)
- Danish (`da`)
- Finnish (`fi`)
- Norwegian (`no`)

### Asian Languages
- Japanese (`ja`)
- Korean (`ko`)
- Chinese Simplified (`zh`, `zh-CN`)
- Chinese Traditional (`zh-TW`)
- Hindi (`hi`)
- Tamil (`ta`)
- Turkish (`tr`)
- Vietnamese (`vi`)
- Indonesian (`id`)
- Thai (`th`)

### Other Languages
- Arabic (`ar`)
- Swahili (`sw`)
- Afrikaans (`af`)
- Albanian (`sq`)
- Armenian (`hy`)
- Catalan (`ca`)
- Croatian (`hr`)
- Esperanto (`eo`)
- Haitian Creole (`ht`)
- Icelandic (`is`)
- Latin (`la`)
- Latvian (`lv`)
- Macedonian (`mk`)
- Slovak (`sk`)
- Welsh (`cy`)

## Notes

1. **Internet Connection Required**: google-tts-api requires an active internet connection to download audio from Google's servers
2. **Language Codes**: Use standard ISO 639-1 language codes (2-letter codes)
3. **Regional Variants**: Some languages have regional variants (e.g., `zh-CN` vs `zh-TW`)
4. **Quality**: All languages use Google's high-quality neural TTS voices
5. **Speed Setting**: The `tts_speed` setting does not affect google-tts-api (only works with the `say` provider)

## Limitations

Languages that are **NOT** supported by google-tts-api (tested and failed):
- Bengali (`bn`)
- Punjabi (`pa`)
- Telugu (`te`)
- Marathi (`mr`)
- Ukrainian (`uk`)
- And approximately 60 other languages from the extended Google Translate list

## See Also

- [Main Notifications Documentation](../NOTIFICATIONS.md)
- [CARL Settings Schema](../schema/settings-schema.json)
- [google-tts-api npm package](https://www.npmjs.com/package/google-tts-api)
