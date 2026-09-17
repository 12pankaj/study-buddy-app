import { Tabs } from 'react-native-expo-router'; // Wait, it's expo-router
import { Tabs as ExpoTabs } from 'expo-router'; 
// Actually just import Tabs from expo-router
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <ExpoTabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      <ExpoTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => <Feather name="book-open" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="exams"
        options={{
          title: 'Exams',
          tabBarIcon: ({ color }) => <Feather name="edit-3" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <Feather name="briefcase" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </ExpoTabs>
  );
}
