import { isImageGenerationRequest } from './image-request.util';

describe('isImageGenerationRequest', () => {
  const imageRequests = [
    'Generate an image of a regenerative city.',
    'Please generate for me an image of a regenerative city.',
    'Could you please make me a picture showing a community garden?',
    'I would like an illustration of clean-energy jobs.',
    "I'd like you to create a poster for our climate workshop.",
    'Can I get a visual of the solution?',
    'Draw a solar-powered neighborhood at sunset.',
    'An image of a thriving coastal community, please.',
    'Pouvez-vous créer pour moi une image d’une ville durable ?',
    'Je voudrais une illustration de notre solution.',
  ];

  const textRequests = [
    'How do I generate an image?',
    'Explain image generation to me.',
    'Write me a prompt to generate an image of a city.',
    'Please do not generate an image.',
    'Describe the image of the city in this document.',
    'What makes a photograph compelling?',
  ];

  for (const prompt of imageRequests) {
    it(`recognizes: ${prompt}`, () => {
      expect(isImageGenerationRequest(prompt)).toBeTrue();
    });
  }

  for (const prompt of textRequests) {
    it(`keeps as text: ${prompt}`, () => {
      expect(isImageGenerationRequest(prompt)).toBeFalse();
    });
  }
});
