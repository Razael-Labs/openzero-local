import { jest } from '@jest/globals';
import { V2Embed } from '../src/utils/v2Embed.js';
import { Symbols, resolveEmoji } from '../src/utils/symbols.js';
import { TextDisplayBuilder } from 'discord.js';

describe('V2Embed Symbols Auto-Formatting Test Suite', () => {
  let setContentSpy;

  beforeEach(() => {
    setContentSpy = jest.spyOn(TextDisplayBuilder.prototype, 'setContent');
  });

  afterEach(() => {
    setContentSpy.mockRestore();
  });

  test('should automatically replace emojis and layout symbols in title', () => {
    new V2Embed().setTitle('Action Failed ❌ and Success ✅! 🏓 ⏱️').build();

    expect(setContentSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Action Failed ${Symbols.FAILURE} and Success ${Symbols.SUCCESS}! ${Symbols.PING} ${Symbols.COOLDOWN}`
      )
    );
  });

  test('should automatically replace layout symbols in description', () => {
    new V2Embed().setDescription('↳ Step 1: 🎵 Play music 🎤 Sing along').build();

    expect(setContentSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `${Symbols.ENTER} Step 1: ${Symbols.MUSIC} Play music ${Symbols.MICROPHONE} Sing along`
      )
    );
  });

  test('should replace standard emojis with custom guild emojis if they exist in guild cache', () => {
    const mockGuild = {
      emojis: {
        cache: [
          { name: 'oz_success', toString: () => '<:oz_success:1122334455>' },
          { name: 'oz_failure', toString: () => '<:oz_failure:6677889900>' }
        ]
      }
    };

    new V2Embed(mockGuild).setTitle('Status: ✅ and ❌').build();

    expect(setContentSpy).toHaveBeenCalledWith(
      expect.stringContaining('Status: <:oz_success:1122334455> and <:oz_failure:6677889900>')
    );
  });
});

describe('resolveEmoji Unit Tests', () => {
  test('should return fallback or symbolOrName if guild is null/undefined', () => {
    const result = resolveEmoji(null, '⬅️');
    expect(result).toBe('⬅️');

    const resultWithFallback = resolveEmoji(null, 'non_existent', 'fallback_val');
    expect(resultWithFallback).toBe('fallback_val');
  });

  test('should return a simplified object containing only id, name, and animated properties when custom emoji is found', () => {
    const mockCustomEmoji = {
      id: '9876543210',
      name: 'oz_arrow_left',
      animated: true,
      extraProperty1: 'ignored',
      extraProperty2: 'ignored'
    };

    const mockGuild = {
      emojis: {
        cache: {
          find: jest.fn().mockReturnValue(mockCustomEmoji)
        }
      }
    };

    const result = resolveEmoji(mockGuild, '⬅️');
    expect(result).toEqual({
      id: '9876543210',
      name: 'oz_arrow_left',
      animated: true
    });
  });

  test('should fallback to symbolOrName if custom emoji is not found in cache', () => {
    const mockGuild = {
      emojis: {
        cache: {
          find: jest.fn().mockReturnValue(null)
        }
      }
    };

    const result = resolveEmoji(mockGuild, '⬅️');
    expect(result).toBe('⬅️');
  });
});
