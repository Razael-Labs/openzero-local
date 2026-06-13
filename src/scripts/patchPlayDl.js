import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path of the project (assuming this script is in src/scripts/)
const projectRoot = path.resolve(__dirname, '../../');
const basePath = path.join(projectRoot, 'node_modules/play-dl/dist');
const files = ['index.js', 'index.mjs'];

const modernUserAgents =
  '["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"]';

logger.info('[Patch Play-DL] Starting patching process...');

files.forEach((file) => {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Replace te array (User-Agents) in index.js
    const teRegex = /var te=\[.*?\];/;
    if (teRegex.test(content)) {
      content = content.replace(teRegex, `var te=${modernUserAgents};`);
      logger.info(`[Patch Play-DL] Patched te (User-Agents) in ${file}`);
      modified = true;
    }

    // 2. Replace Android clientVersion "16.49" with "20.10.38"
    if (content.includes('clientVersion:"16.49"')) {
      content = content.replaceAll('clientVersion:"16.49"', 'clientVersion:"20.10.38"');
      logger.info(`[Patch Play-DL] Patched Android clientVersion in ${file}`);
      modified = true;
    } else if (content.includes('clientVersion:"19.11.38"')) {
      content = content.replaceAll('clientVersion:"19.11.38"', 'clientVersion:"20.10.38"');
      logger.info(`[Patch Play-DL] Updated Android clientVersion to 20.10.38 in ${file}`);
      modified = true;
    }

    // 3. Safety check for streamingData.formats in getAndroidFormats (ut)
    const targetSafety = 'JSON.parse(s).streamingData.formats';
    const replacementSafety = 'JSON.parse(s).streamingData?.formats||[]';
    if (content.includes(targetSafety)) {
      content = content.replaceAll(targetSafety, replacementSafety);
      logger.info(`[Patch Play-DL] Patched safety check in ${file}`);
      modified = true;
    }

    // 4. Patch parseAudioFormats (O) to filter out formats without urls and fallback to itag 18 with url
    const targetO =
      'function O(i){let e=[];return i.forEach(t=>{let r=t.mimeType;r.startsWith("audio")&&(t.codec=r.split(\'codecs="\')[1].split(\'"\')[0],t.container=r.split("audio/")[1].split(";")[0],e.push(t))}),e}a(O,"parseAudioFormats");';
    const replacementO =
      'function O(i){let e=[];i.forEach(t=>{let r=t.mimeType;r.startsWith("audio")&&t.url&&(t.codec=r.split(\'codecs="\')[1].split(\'"\')[0],t.container=r.split("audio/")[1].split(";")[0],e.push(t))});if(e.length===0){let t=i.find(f=>f.itag===18&&f.url);if(t){let r=t.mimeType;t.codec=r.includes(\'codecs="\')?r.split(\'codecs="\')[1].split(\'"\')[0]:"mp4a.40.2";t.container="mp4";e.push(t)}}return e}a(O,"parseAudioFormats");';
    if (content.includes(targetO)) {
      content = content.replaceAll(targetO, replacementO);
      logger.info(`[Patch Play-DL] Patched parseAudioFormats in ${file}`);
      modified = true;
    }

    // 5. Patch retry url access in stream logic to be safe
    const targetRetry = 'this.url=t[this.quality].url';
    const replacementRetry = 'this.url=t[this.quality]?.url||t[0]?.url||""';
    if (content.includes(targetRetry)) {
      content = content.replaceAll(targetRetry, replacementRetry);
      logger.info(`[Patch Play-DL] Patched retry url access in ${file}`);
      modified = true;
    }

    // 6. Patch h header merge logic to support User-Agent overrides
    const targetHMerge =
      'e.headers&&(e.headers={...e.headers,"accept-encoding":"gzip, deflate, br","user-agent":Ge()})';
    const replacementHMerge =
      'e.headers&&(e.headers={"user-agent":Ge(),"accept-encoding":"gzip, deflate, br",...e.headers})';
    if (content.includes(targetHMerge)) {
      content = content.replaceAll(targetHMerge, replacementHMerge);
      logger.info(`[Patch Play-DL] Patched header override support in h for ${file}`);
      modified = true;
    }

    // 7. Patch Android client request to include proper YouTube app User-Agent header
    const targetAndroidCall = 'contentCheckOk:!0,racyCheckOk:!0}),cookies:!0,cookieJar:e})';
    const replacementAndroidCall =
      'contentCheckOk:!0,racyCheckOk:!0}),headers:{"User-Agent":"com.google.android.youtube/20.10.38 (Linux; U; Android 11; Scale/2.00; Sylph/1.0.0; Build/RQ3A.210605.005)"},cookies:!0,cookieJar:e})';
    if (content.includes(targetAndroidCall)) {
      content = content.replaceAll(targetAndroidCall, replacementAndroidCall);
      logger.info(`[Patch Play-DL] Patched Android API call headers in ${file}`);
      modified = true;
    }

    // 8. Patch getAndroidFormats to return combined formats and adaptiveFormats
    const targetAndroidReturn = 'return JSON.parse(s).streamingData?.formats||[]}';
    const replacementAndroidReturn =
      'const sd=JSON.parse(s).streamingData;const formats=[];if(sd){if(sd.formats)formats.push(...sd.formats);if(sd.adaptiveFormats)formats.push(...sd.adaptiveFormats)}return formats;}';
    if (content.includes(targetAndroidReturn)) {
      content = content.replaceAll(targetAndroidReturn, replacementAndroidReturn);
      logger.info(
        `[Patch Play-DL] Patched getAndroidFormats to return combined formats in ${file}`
      );
      modified = true;
    }

    // 9. Fix discordPlayerCompatibility: force mp4/aac (arbitrary) format instead of webm/opus
    //    This prevents SeekStream (WebmSeeker) from being used which causes 403 on byte-range requests
    const targetDPC =
      '="webm"?"webm/opus":"arbitrary";if(await _(`https://${new dt.URL(t[0].url).host}/generate_204`),s==="webm/opus")if(e.discordPlayerCompatibility){if(e.seek)throw new Error("Can not seek with discordPlayerCompatibility set to true.")}else{if(e.seek??=0,e.seek>=i.video_details.durationInSec||e.seek<0)throw new Error(`Seeking beyond limit. [ 0 - ${i.video_details.durationInSec-1}]`);return new fe(t[0].url,i.video_details.durationInSec,t[0].indexRange.end,Number(t[0].contentLength),Number(t[0].bitrate),i.video_details.url,e)}';
    const replacementDPC =
      '="webm"?"webm/opus":"arbitrary";if(e.discordPlayerCompatibility&&s==="webm/opus"){const mp4fmt=t.find(f=>f.container==="mp4")||t[t.length-1];s="arbitrary";t[0]=mp4fmt;}if(await _(`https://${new dt.URL(t[0].url).host}/generate_204`),s==="webm/opus")if(e.discordPlayerCompatibility){if(e.seek)throw new Error("Can not seek with discordPlayerCompatibility set to true.")}else{if(e.seek??=0,e.seek>=i.video_details.durationInSec||e.seek<0)throw new Error(`Seeking beyond limit. [ 0 - ${i.video_details.durationInSec-1}]`);return new fe(t[0].url,i.video_details.durationInSec,t[0].indexRange.end,Number(t[0].contentLength),Number(t[0].bitrate),i.video_details.url,e)}';
    if (content.includes(targetDPC)) {
      content = content.replaceAll(targetDPC, replacementDPC);
      logger.info(
        `[Patch Play-DL] Patched discordPlayerCompatibility to force mp4/arbitrary format in ${file}`
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      logger.info(`[Patch Play-DL] Successfully updated ${file}`);
    }
  } else {
    logger.warn(`[Patch Play-DL] ${file} does not exist at ${filePath}`);
  }
});
