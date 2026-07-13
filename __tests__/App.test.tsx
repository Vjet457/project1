/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/navigation/AppNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockAppNavigator() {
    return React.createElement(Text, null, 'MockNavigator');
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
