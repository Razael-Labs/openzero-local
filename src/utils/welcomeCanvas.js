import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Generate a beautiful custom welcome image buffer for a new member
 * @param {import('discord.js').GuildMember} member - The guild member who joined
 * @param {string} locale - The translation locale ('id' or 'en')
 * @returns {Promise<Buffer>} The generated image buffer (PNG)
 */
export async function createWelcomeImage(member, locale = 'en') {
  const width = 800;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Rounded Mask for the entire Canvas
  const borderRadius = 16;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, borderRadius);
  ctx.clip();

  // 2. Flat Minimalist Background (Discord dark style)
  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, width, height);

  // Draw a very subtle flat accent line on the left or top border
  ctx.strokeStyle = '#6e4cc1'; // Accent purple
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(3, height);
  ctx.stroke();

  // Thin outer border to define the card edge
  ctx.strokeStyle = '#2b2d31';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);

  // 3. Draw Circular Avatar with Flat Border
  const avatarX = 140;
  const avatarY = height / 2;
  const avatarRadius = 75;

  // Draw flat outer ring
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2d31';
  ctx.fill();
  ctx.strokeStyle = '#6e4cc1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Avatar Image
  let avatarImg;
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const res = await fetch(avatarUrl);
    if (!res.ok) throw new Error('Failed to fetch avatar');
    const arrayBuffer = await res.arrayBuffer();
    const avatarBuffer = Buffer.from(arrayBuffer);
    avatarImg = await loadImage(avatarBuffer);
  } catch (err) {
    avatarImg = null;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  if (avatarImg) {
    ctx.drawImage(
      avatarImg,
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } else {
    ctx.fillStyle = '#6e4cc1';
    ctx.fillRect(
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(member.user.username.slice(0, 2).toUpperCase(), avatarX, avatarY);
  }
  ctx.restore();

  // 4. Flat Minimalist Typography
  const textStartX = 260;

  // A. Welcome Title Text (Flat gray-purple text)
  const titleText = locale === 'id' ? 'SELAMAT DATANG' : 'WELCOME';
  ctx.fillStyle = '#949ba4'; // Minimalist Discord grey
  ctx.font = '600 16px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(titleText, textStartX, 75);

  // B. User Tag
  const userTag = member.user.tag;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Segoe UI", Roboto, Arial, sans-serif';

  let maxTagWidth = 480;
  let tagToDraw = userTag;
  if (ctx.measureText(tagToDraw).width > maxTagWidth) {
    while (ctx.measureText(tagToDraw + '...').width > maxTagWidth && tagToDraw.length > 5) {
      tagToDraw = tagToDraw.slice(0, -1);
    }
    tagToDraw += '...';
  }
  ctx.fillText(tagToDraw, textStartX, 105);

  // C. Server Info (Clean minimalist styling)
  const guildNameText =
    locale === 'id' ? `ke server ${member.guild.name}` : `to ${member.guild.name}`;
  ctx.fillStyle = '#dbdee1'; // Active text grey
  ctx.font = '500 20px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(guildNameText, textStartX, 155);

  // D. Member Counter Badge (Flat capsule pill)
  const memberCount = member.guild.memberCount;
  const countText = locale === 'id' ? `Member #${memberCount}` : `Member #${memberCount}`;

  const badgeY = 210;
  const badgeHeight = 36;
  ctx.font = 'bold 15px "Segoe UI", Roboto, Arial, sans-serif';
  const badgeTextWidth = ctx.measureText(countText).width;
  const badgeWidth = badgeTextWidth + 24;

  // Solid flat background for capsule
  ctx.fillStyle = '#2b2d31';
  ctx.beginPath();
  ctx.roundRect(textStartX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();

  // Draw subtle flat border on the capsule
  ctx.strokeStyle = '#35363c';
  ctx.lineWidth = 1;
  ctx.strokeRect(textStartX, badgeY, badgeWidth, badgeHeight);

  // Text inside capsule
  ctx.fillStyle = '#dbdee1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(countText, textStartX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // 5. Output Canvas to Buffer
  return canvas.toBuffer('image/png');
}
