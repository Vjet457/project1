import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);

  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: insets },
        React.createElement(
          SafeAreaFrameContext.Provider,
          { value: frame },
          React.createElement(View, null, children)
        )
      ),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => React.useContext(SafeAreaInsetsContext),
    useSafeAreaFrame: () => React.useContext(SafeAreaFrameContext),
    initialWindowMetrics: {
      insets,
      frame,
    },
  };
});

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(async () => true),
  requestPermission: jest.fn(async () => ({ grantedPermissions: [] })),
  readRecords: jest.fn(async () => []),
  getSdkStatus: jest.fn(async () => 1),
  PermissionController: {
    openRequestPermissionsPage: jest.fn(),
  },
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    Directions: {},
    ScrollView: View,
  };
});
