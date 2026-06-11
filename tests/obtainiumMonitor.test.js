import { jest } from '@jest/globals';

// Mock logger to avoid console spam
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock database to avoid writing to disk
jest.unstable_mockModule('../src/utils/database.js', () => {
  let mockMsgId = '1234567890';
  return {
    getObtainiumMessageId: jest.fn(() => mockMsgId),
    setObtainiumMessageId: jest.fn((id) => {
      mockMsgId = id;
    })
  };
});

// Import modules
const { default: messageDeleteEvent } = await import('../src/events/messageDelete.js');
const { updateObtainiumMessage } = await import('../src/utils/obtainiumHelper.js');
const { getObtainiumMessageId, setObtainiumMessageId } = await import('../src/utils/database.js');

describe('Obtainium Message Monitor & Persistent Recreate Test Suite', () => {
  let mockClient;
  let mockChannel;
  let mockMessage;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessage = {
      id: '1234567890',
      edit: jest.fn().mockResolvedValue(true)
    };

    mockChannel = {
      name: 'obtainium-channel',
      isTextBased: () => true,
      messages: {
        fetch: jest.fn().mockImplementation((id) => {
          if (id === '1234567890') {
            return Promise.resolve(mockMessage);
          }
          return Promise.reject(new Error('Unknown Message'));
        })
      },
      send: jest.fn().mockResolvedValue({
        id: '9999999999',
        url: 'https://discord.com/channels/123/456/9999999999'
      })
    };

    mockClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      }
    };
  });

  test('should edit existing message if it is found', async () => {
    getObtainiumMessageId.mockReturnValueOnce('https://discord.com/channels/123/456/1234567890');

    await updateObtainiumMessage(mockClient);

    expect(mockChannel.messages.fetch).toHaveBeenCalledWith('1234567890');
    expect(mockMessage.edit).toHaveBeenCalled();
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should create new message and update database if message is not found/deleted', async () => {
    // Mock fetch to reject (meaning message does not exist or was deleted)
    mockChannel.messages.fetch.mockRejectedValueOnce(new Error('Unknown Message'));
    getObtainiumMessageId.mockReturnValueOnce('https://discord.com/channels/123/456/1234567890');

    await updateObtainiumMessage(mockClient);

    expect(mockChannel.messages.fetch).toHaveBeenCalledWith('1234567890');
    expect(mockChannel.send).toHaveBeenCalled();
    expect(setObtainiumMessageId).toHaveBeenCalledWith(
      'https://discord.com/channels/123/456/9999999999'
    );
  });

  test('should trigger recreation when monitored message is deleted', async () => {
    // Mock the deleted message
    const deletedMessage = { id: '1234567890' };

    // Mock message fetch to reject during recreation to force a new send
    mockChannel.messages.fetch.mockRejectedValueOnce(new Error('Unknown Message'));
    getObtainiumMessageId.mockReturnValue('https://discord.com/channels/123/456/1234567890');

    await messageDeleteEvent.execute(deletedMessage, mockClient);

    expect(mockChannel.send).toHaveBeenCalled();
    expect(setObtainiumMessageId).toHaveBeenCalledWith(
      'https://discord.com/channels/123/456/9999999999'
    );
  });

  test('should not trigger recreation if a different message is deleted', async () => {
    const deletedMessage = { id: '5555555555' };
    getObtainiumMessageId.mockReturnValue('https://discord.com/channels/123/456/1234567890');

    await messageDeleteEvent.execute(deletedMessage, mockClient);

    expect(mockClient.channels.fetch).not.toHaveBeenCalled();
    expect(mockChannel.send).not.toHaveBeenCalled();
  });
});
