import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Cards: undefined;
  Templates: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Editor: { projectId: string };
  Export: { projectId: string };
};
