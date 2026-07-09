const test = require('node:test');
const assert = require('node:assert/strict');
const { extractInteractiveResponseMetadata } = require('../lib/interactiveButtons');

test('extractInteractiveResponseMetadata returns url for single select rows', () => {
  const message = {
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({
            selected_row_id: 'docs',
            url: 'https://example.com/docs'
          })
        }
      }
    }
  };

  const result = extractInteractiveResponseMetadata(message);
  assert.deepEqual(result, {
    id: 'docs',
    url: 'https://example.com/docs',
    text: ''
  });
});
