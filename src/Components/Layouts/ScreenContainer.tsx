import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { groceryTheme } from "@src/Utils/groceryTheme";

type Props = {
  children: React.ReactNode;
};

const ScreenContainer: React.FC<Props> = ({ children }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: groceryTheme.colors.background,
  },
  content: {
    flex: 1,
  },
});

export default ScreenContainer;
