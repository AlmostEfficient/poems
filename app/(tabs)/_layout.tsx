import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';

const tintColor =
  process.env.EXPO_OS === 'ios'
    ? DynamicColorIOS({ light: '#D85E4F', dark: '#F17A68' })
    : '#D85E4F';

const backgroundColor =
  process.env.EXPO_OS === 'ios'
    ? DynamicColorIOS({ light: '#F8F6F2', dark: '#171614' })
    : '#F8F6F2';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={tintColor}
      backgroundColor={backgroundColor}
      minimizeBehavior="onScrollDown"
      labelVisibilityMode="labeled"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="read" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book.pages', selected: 'book.pages.fill' }}
          md={{ default: 'auto_stories', selected: 'auto_stories' }}
        />
        <NativeTabs.Trigger.Label>Read</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }}
          md={{ default: 'bookmarks', selected: 'bookmarks' }}
        />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon
          sf="magnifyingglass"
          md={{ default: 'search', selected: 'search' }}
        />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
