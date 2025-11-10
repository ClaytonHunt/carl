#!/usr/bin/env node

/**
 * CARL Notification System
 * Sends notifications via TTS and/or desktop notifications
 * Usage: notify.cjs <message> <delivery_methods>
 * Example: notify.cjs "Build completed" "tts,desktop"
 */

const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');
const { readSettings, getTTSConfig } = require('./read-settings.cjs');

// Try to load the 'say' library if available
let say = null;
try {
  say = require('say');
} catch (error) {
  // say library not available, will fall back to native commands
}

// Try to load google-tts-api for Google TTS
let googleTTS = null;
try {
  googleTTS = require('google-tts-api');
} catch (error) {
  // google-tts-api library not available
}

// Try to load Google Cloud Text-to-Speech
let googleCloudTTS = null;
try {
  const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
  googleCloudTTS = TextToSpeechClient;
} catch (error) {
  // @google-cloud/text-to-speech library not available
}

// Try to load node-notifier for desktop notifications
let notifier = null;
try {
  notifier = require('node-notifier');
} catch (error) {
  // node-notifier not available, will fall back to native commands
}

// Try to load sound-play for audio playback
let soundPlay = null;
try {
  soundPlay = require('sound-play');
} catch (error) {
  // sound-play not available, will fall back to platform-specific commands
}

// Get environment variables with fallbacks for direct execution
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

// For CLAUDE_PROJECT_DIR, check if we're in a plugin subdirectory and go up to the real project root
let CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
if (!CLAUDE_PROJECT_DIR) {
  const cwd = process.cwd();
  // If we're in plugins/carl, go up two levels to get to the project root
  if (cwd.endsWith('plugins/carl') || cwd.endsWith('plugins\\carl')) {
    CLAUDE_PROJECT_DIR = path.resolve(cwd, '../..');
  } else if (cwd.includes('plugins/carl') || cwd.includes('plugins\\carl')) {
    // Find the plugins/carl part and go up from there
    const parts = cwd.split(path.sep);
    const pluginIndex = parts.indexOf('plugins');
    if (pluginIndex >= 0) {
      CLAUDE_PROJECT_DIR = parts.slice(0, pluginIndex).join(path.sep);
    } else {
      CLAUDE_PROJECT_DIR = cwd;
    }
  } else {
    CLAUDE_PROJECT_DIR = cwd;
  }
}

/**
 * Get TTS configuration from settings or environment
 */
function getTTSConfiguration() {
  // Try to read from settings file first
  if (CLAUDE_PROJECT_DIR && CLAUDE_PLUGIN_ROOT) {
    const settings = readSettings(CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT);
    if (settings) {
      const ttsConfig = getTTSConfig(settings);
      return {
        provider: ttsConfig.provider,
        voice: ttsConfig.voice,
        speed: ttsConfig.speed,
      };
    }
  }

  // Fallback to environment variables (for testing/backwards compatibility)
  return {
    provider: process.env.CARL_CARL_CONFIGURATION_TTS_PROVIDER || 'none',
    voice: process.env.CARL_CARL_CONFIGURATION_TTS_VOICE || null,
    speed: parseFloat(process.env.CARL_CARL_CONFIGURATION_TTS_SPEED) || 1.0,
  };
}

/**
 * Send TTS notification using configured provider
 */
function sendTTS(message) {
  try {
    // Get TTS configuration
    const config = getTTSConfiguration();
    let ttsProvider = config.provider;
    const ttsVoice = config.voice;
    const ttsSpeed = config.speed;

    // Backward compatibility: map old node-gtts to new google-tts-api
    if (ttsProvider === 'node-gtts') {
      console.error('[CARL Notify] node-gtts is deprecated. Using google-tts-api instead. Please update your settings.');
      ttsProvider = 'google-tts-api';
    }

    if (ttsProvider === 'none') {
      console.error('[CARL Notify] TTS provider is set to "none", skipping TTS notification');
      return false;
    }

    // Handle provider-specific implementations
    if (ttsProvider === 'say') {
      return sendTTS_Say(message, ttsVoice, ttsSpeed);
    } else if (ttsProvider === 'google-tts-api') {
      return sendTTS_GoogleTTSAPI(message, ttsVoice, ttsSpeed);
    } else if (ttsProvider === 'google-cloud-tts') {
      return sendTTS_GoogleCloudTTS(message, ttsVoice, ttsSpeed);
    }

    // Unknown provider
    console.error(`[CARL Notify] Unknown TTS provider: ${ttsProvider}`);
    return false;
  } catch (error) {
    console.error('[CARL Notify] TTS error:', error.message);
    return false;
  }
}

/**
 * Send TTS using the 'say' library
 */
function sendTTS_Say(message, voice, speed) {
  // Try to use the 'say' npm library first (cross-platform)
  if (say) {
    return new Promise((resolve) => {
      say.speak(message, voice, speed, (error) => {
        if (error) {
          console.error('[CARL Notify] Say library error:', error.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Fallback to platform-specific TTS commands
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      // macOS: Use 'say' command
      execSync(`say "${message.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
      return true;
    } else if (platform === 'win32') {
      // Windows: Use PowerShell
      const psCommand = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${message.replace(/'/g, "''")}')`;
      execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
      return true;
    } else if (platform === 'linux') {
      // Linux: Try espeak or spd-say
      try {
        execSync(`espeak "${message.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
        return true;
      } catch {
        try {
          execSync(`spd-say "${message.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
          return true;
        } catch {
          console.error('[CARL Notify] No TTS system found (tried espeak, spd-say)');
          return false;
        }
      }
    }
  } catch (error) {
    console.error('[CARL Notify] Say TTS error:', error.message);
    return false;
  }

  return false;
}

/**
 * Send TTS using google-tts-api (Google Text-to-Speech - Unofficial)
 */
async function sendTTS_GoogleTTSAPI(message, voice, speed) {
  if (!googleTTS) {
    console.error('[CARL Notify] google-tts-api library not available. Install with: npm install google-tts-api');
    return false;
  }

  try {
    const fs = require('fs');
    const https = require('https');
    const http = require('http');
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `carl-tts-${Date.now()}.mp3`);

    // Language code (e.g., 'en', 'es', 'fr')
    const lang = voice || 'en';

    // Get audio URL from google-tts-api
    // Returns array of URLs if text is long, single URL if short
    const audioUrls = await googleTTS.getAllAudioUrls(message, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    // Get the first URL (for short messages, there will be only one)
    const audioUrl = Array.isArray(audioUrls) && audioUrls.length > 0 ? audioUrls[0].url : audioUrls.url;

    // Download the audio file
    await new Promise((resolve, reject) => {
      const protocol = audioUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(tmpFile);

      protocol.get(audioUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlinkSync(tmpFile);
        reject(err);
      });
    });

    // Play the audio file using sound-play
    if (!soundPlay) {
      console.error('[CARL Notify] sound-play library not available. Install with: npm install sound-play');
      return false;
    }

    await soundPlay.play(tmpFile);

    // Clean up temp file after playing
    try {
      fs.unlinkSync(tmpFile);
    } catch (cleanupError) {
      console.error('[CARL Notify] Failed to clean up temp file:', cleanupError.message);
    }

    return true;
  } catch (error) {
    console.error('[CARL Notify] google-tts-api error:', error.message);
    return false;
  }
}

/**
 * Send TTS using Google Cloud Text-to-Speech API (Official)
 */
async function sendTTS_GoogleCloudTTS(message, voice, speed) {
  if (!googleCloudTTS) {
    console.error('[CARL Notify] @google-cloud/text-to-speech library not available. Install with: npm install @google-cloud/text-to-speech');
    return false;
  }

  try {
    const fs = require('fs');
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `carl-tts-${Date.now()}.mp3`);

    // Create client
    const client = new googleCloudTTS();

    // Parse voice name if provided
    // Format: "en-US-Chirp-HD-D" or just "en-US"
    let languageCode = 'en-US';
    let voiceName = null;

    if (voice) {
      if (voice.includes('-')) {
        // Full voice name provided (e.g., "en-US-Chirp-HD-D")
        const parts = voice.split('-');
        languageCode = `${parts[0]}-${parts[1]}`; // e.g., "en-US"
        voiceName = voice; // Full voice name
      } else {
        // Just language code (e.g., "en")
        languageCode = voice;
      }
    }

    // Construct request
    const request = {
      input: { text: message },
      voice: {
        languageCode: languageCode,
        ...(voiceName && { name: voiceName }),
      },
      audioConfig: {
        audioEncoding: 'MP3',
        ...(speed && speed !== 1.0 && { speakingRate: speed }),
      },
    };

    // Perform TTS request
    const [response] = await client.synthesizeSpeech(request);

    // Write audio content to file
    fs.writeFileSync(tmpFile, response.audioContent, 'binary');

    // Play the audio file using sound-play
    if (!soundPlay) {
      console.error('[CARL Notify] sound-play library not available. Install with: npm install sound-play');
      return false;
    }

    await soundPlay.play(tmpFile);

    // Clean up temp file after playing
    try {
      fs.unlinkSync(tmpFile);
    } catch (cleanupError) {
      console.error('[CARL Notify] Failed to clean up temp file:', cleanupError.message);
    }

    return true;
  } catch (error) {
    console.error('[CARL Notify] Google Cloud TTS error:', error.message);
    if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      console.error('[CARL Notify] Google Cloud TTS requires authentication. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    }
    return false;
  }
}

/**
 * Send desktop notification using platform-specific tools
 */
function sendDesktopNotification(title, message) {
  try {
    // Try node-notifier first (cross-platform, more reliable)
    if (notifier) {
      return new Promise((resolve) => {
        notifier.notify(
          {
            title: title,
            message: message,
            sound: false, // Don't play sound
            wait: false, // Don't wait for user interaction
          },
          (error, response) => {
            if (error) {
              console.error('[CARL Notify] node-notifier error:', error.message);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    }

    // Fallback to platform-specific commands
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOS: Use osascript to show notification
      const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`;
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
      return true;
    } else if (platform === 'win32') {
      // Windows: Use PowerShell toast notification
      const psCommand = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $template = @"
        <toast>
          <visual>
            <binding template="ToastText02">
              <text id="1">${title.replace(/"/g, '""')}</text>
              <text id="2">${message.replace(/"/g, '""')}</text>
            </binding>
          </visual>
        </toast>
"@

        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CARL").Show($toast)
      `;
      execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
      return true;
    } else if (platform === 'linux') {
      // Linux: Use notify-send
      execSync(`notify-send "${title.replace(/"/g, '\\"')}" "${message.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CARL Notify] Desktop notification error:', error.message);
    return false;
  }
}

/**
 * Main notification handler
 */
async function notify(message, deliveryMethods = ['desktop'], title = 'CARL') {
  const methods = Array.isArray(deliveryMethods) ? deliveryMethods : deliveryMethods.split(',');
  const results = [];

  for (const method of methods) {
    const normalizedMethod = method.trim().toLowerCase();

    if (normalizedMethod === 'tts') {
      const result = sendTTS(message);
      // Handle both sync and async results
      const success = result instanceof Promise ? await result : result;
      results.push({ method: 'tts', success });
    } else if (normalizedMethod === 'desktop') {
      const result = sendDesktopNotification(title, message);
      // Handle both sync and async results
      const success = result instanceof Promise ? await result : result;
      results.push({ method: 'desktop', success });
    } else {
      console.error(`[CARL Notify] Unknown delivery method: ${method}`);
    }
  }

  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: notify.cjs <message> [delivery_methods] [title]');
    console.error('Example: notify.cjs "Build completed" "tts,desktop" "CARL"');
    process.exit(1);
  }

  const message = args[0];
  const deliveryMethods = args[1] ? args[1].split(',') : ['desktop'];
  const title = args[2] || 'CARL';

  // Use async IIFE to handle async notify function
  (async () => {
    try {
      const results = await notify(message, deliveryMethods, title);

      // Exit with success if at least one method succeeded
      const anySuccess = results.some(r => r.success);
      process.exit(anySuccess ? 0 : 1);
    } catch (error) {
      console.error('[CARL Notify] Error:', error.message);
      process.exit(1);
    }
  })();
}

// Export for use in other modules
module.exports = { notify, sendTTS, sendDesktopNotification };
