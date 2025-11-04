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

// Get environment variables
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;

/**
 * Send TTS notification using configured provider
 */
function sendTTS(message) {
  try {
    // Get TTS provider from environment
    const ttsProvider = process.env.CARL_CARL_CONFIGURATION_TTS_PROVIDER || 'none';

    if (ttsProvider === 'none') {
      console.error('[CARL Notify] TTS provider is set to "none", skipping TTS notification');
      return false;
    }

    // Platform-specific TTS commands
    const platform = os.platform();

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

    return false;
  } catch (error) {
    console.error('[CARL Notify] TTS error:', error.message);
    return false;
  }
}

/**
 * Send desktop notification using platform-specific tools
 */
function sendDesktopNotification(title, message) {
  try {
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
function notify(message, deliveryMethods = ['desktop'], title = 'CARL') {
  const methods = Array.isArray(deliveryMethods) ? deliveryMethods : deliveryMethods.split(',');
  const results = [];

  for (const method of methods) {
    const normalizedMethod = method.trim().toLowerCase();

    if (normalizedMethod === 'tts') {
      results.push({ method: 'tts', success: sendTTS(message) });
    } else if (normalizedMethod === 'desktop') {
      results.push({ method: 'desktop', success: sendDesktopNotification(title, message) });
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

  const results = notify(message, deliveryMethods, title);

  // Exit with success if at least one method succeeded
  const anySuccess = results.some(r => r.success);
  process.exit(anySuccess ? 0 : 1);
}

// Export for use in other modules
module.exports = { notify, sendTTS, sendDesktopNotification };
