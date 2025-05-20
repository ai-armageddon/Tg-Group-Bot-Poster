const request = require('supertest');
const app = require('../server'); // Assuming server.js exports the app
const Bot = require('../models/Bot');
const axios = require('axios');

// Mock the Bot model
jest.mock('../models/Bot');
// Mock axios
jest.mock('axios');

describe('/api/messages/send', () => {
  const defaultBot = { _id: 'defaultBotId', token: 'default_token', name: 'Default Bot', isDefault: true };
  const specificBot = { _id: 'specificBotId', token: 'specific_token', name: 'Specific Bot' };

  beforeEach(() => {
    // Reset mocks before each test
    Bot.findById.mockReset();
    Bot.findOne.mockReset();
    axios.post.mockReset();
  });

  // Scenario 1: Empty string botId provided
  test('should return 400 if botId is an empty string', async () => {
    // No need to mock findById or findOne for this specific path,
    // as the validation should catch it earlier.
    // However, to be safe and explicit for the assertion:
    Bot.findOne.mockResolvedValue(defaultBot); // Just in case it tries to find a default

    const response = await request(app)
      .post('/api/messages/send')
      .send({ botId: '', text: 'test message', chatId: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid Bot ID provided. Cannot be empty or non-string.');
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(Bot.findOne).not.toHaveBeenCalledWith({ isDefault: true });
  });

  // Scenario 2: botId is omitted entirely
  test('should use default bot if botId is omitted and send message', async () => {
    Bot.findOne.mockResolvedValue(defaultBot);
    axios.post.mockResolvedValue({ data: { ok: true, result: { message_id: 1 } } });

    const response = await request(app)
      .post('/api/messages/send')
      .send({ text: 'test message to default', chatId: '123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Bot.findOne).toHaveBeenCalledWith({ isDefault: true });
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${defaultBot.token}/sendMessage`,
      expect.objectContaining({ chat_id: '123', text: 'test message to default' })
    );
  });

  test('should return 400 if botId is omitted and no default bot is found', async () => {
    Bot.findOne.mockResolvedValue(null); // No default bot found

    const response = await request(app)
      .post('/api/messages/send')
      .send({ text: 'test message', chatId: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('No bot specified and no default bot found.');
    expect(Bot.findOne).toHaveBeenCalledWith({ isDefault: true });
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });


  // Scenario 3: Valid but non-existent botId provided
  test('should return 400 if botId is valid but non-existent', async () => {
    const nonExistentId = 'nonExistentId123';
    Bot.findById.mockResolvedValue(null);
    // Mock findOne as well to ensure it's not called as a fallback
    Bot.findOne.mockResolvedValue(defaultBot);


    const response = await request(app)
      .post('/api/messages/send')
      .send({ botId: nonExistentId, text: 'test message', chatId: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(`Bot with ID '${nonExistentId}' not found.`);
    expect(Bot.findById).toHaveBeenCalledWith(nonExistentId);
    expect(Bot.findOne).not.toHaveBeenCalledWith({ isDefault: true });
    expect(axios.post).not.toHaveBeenCalled();
  });

  // Scenario 4: Valid and existing botId provided
  test('should use specific bot if botId is valid and exists, and send message', async () => {
    Bot.findById.mockResolvedValue(specificBot);
    axios.post.mockResolvedValue({ data: { ok: true, result: { message_id: 2 } } });

    const response = await request(app)
      .post('/api/messages/send')
      .send({ botId: specificBot._id, text: 'test message to specific', chatId: '456' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Bot.findById).toHaveBeenCalledWith(specificBot._id);
    expect(Bot.findOne).not.toHaveBeenCalledWith({ isDefault: true });
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${specificBot.token}/sendMessage`,
      expect.objectContaining({ chat_id: '456', text: 'test message to specific' })
    );
  });

  // Additional test: Non-string botId
  test('should return 400 if botId is not a string (e.g., a number)', async () => {
    const response = await request(app)
      .post('/api/messages/send')
      .send({ botId: 12345, text: 'test message', chatId: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid Bot ID provided. Cannot be empty or non-string.');
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(Bot.findOne).not.toHaveBeenCalled();
  });

  // Additional test: botId is null
  test('should use default bot if botId is null and send message', async () => {
    Bot.findOne.mockResolvedValue(defaultBot);
    axios.post.mockResolvedValue({ data: { ok: true, result: { message_id: 3 } } });

    const response = await request(app)
      .post('/api/messages/send')
      .send({ botId: null, text: 'test message with null botId', chatId: '789' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Bot.findOne).toHaveBeenCalledWith({ isDefault: true });
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${defaultBot.token}/sendMessage`,
      expect.objectContaining({ chat_id: '789', text: 'test message with null botId' })
    );
  });

  // Test for media message handling (basic check, focusing on bot selection)
  test('should use specific bot for media message if botId is valid and exists', async () => {
    Bot.findById.mockResolvedValue(specificBot);
    // Mock fs and os for media handling part, or ensure it doesn't fail for this test's focus
    // For simplicity, we'll mock axios.post which is the final step for sending.
    axios.post.mockResolvedValue({ data: { ok: true, result: { message_id: 4 } } });

    // Minimal media data
    const mediaBase64 = 'data:image/jpeg;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='; // 1x1 red pixel
    const tempFilePath = '/tmp/telegram_media_mock.jpg';

    // Mock fs operations if they are directly called within the route
    // For this test, we assume the base64 processing and file creation are correct
    // and focus on the bot selection and axios call.
    // If fs operations were complex, they would need jest.mock('fs');
    // and specific mock implementations for fs.writeFileSync, fs.createReadStream, fs.unlinkSync.

    const response = await request(app)
      .post('/api/messages/send')
      .send({
        botId: specificBot._id,
        chatId: '101',
        mediaType: 'photo',
        mediaBase64: mediaBase64
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Bot.findById).toHaveBeenCalledWith(specificBot._id);
    expect(Bot.findOne).not.toHaveBeenCalledWith({ isDefault: true });
    // Check that axios.post was called with the correct bot token in the URL for sendPhoto
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`https://api.telegram.org/bot${specificBot.token}/sendPhoto`),
      expect.any(Object), // FormData object
      expect.any(Object)  // Headers
    );
  });


  // Test for media message handling when botId is omitted (uses default bot)
  test('should use default bot for media message if botId is omitted', async () => {
    Bot.findOne.mockResolvedValue(defaultBot);
    axios.post.mockResolvedValue({ data: { ok: true, result: { message_id: 5 } } });

    const mediaBase64 = 'data:image/jpeg;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

    const response = await request(app)
      .post('/api/messages/send')
      .send({
        chatId: '102',
        mediaType: 'photo',
        mediaBase64: mediaBase64,
        text: "caption for default bot media" // Optional caption
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Bot.findOne).toHaveBeenCalledWith({ isDefault: true });
    expect(Bot.findById).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`https://api.telegram.org/bot${defaultBot.token}/sendPhoto`),
      expect.any(Object), // FormData
      expect.any(Object)  // Headers
    );
    // To check caption, you'd need to inspect the FormData contents, which is more complex.
    // For now, confirming the correct endpoint and bot is the main goal.
  });

});
