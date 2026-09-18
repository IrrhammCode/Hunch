import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import type { ReactNode } from "react";

/**
 * Full-width list shell for tab screens.
 * Forces stretch so cards reach left/right evenly (no float / no clipped gutters).
 */
export function AppScroll({
  children,
  bottomPad = 36,
  contentStyle,
  ...rest
}: {
  children: ReactNode;
  bottomPad?: number;
  contentStyle?: ScrollViewProps["contentContainerStyle"];
} & Omit<ScrollViewProps, "contentContainerStyle" | "children">) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  content: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 12,
  },
});
