import type React from 'react';
import { Text, type TextProps } from 'ink';
import Gradient from 'ink-gradient';

const THEME_COLOR = '#229ac3';

export const ThemedGradient: React.FC<TextProps> = ({ children, ...props }) => {
  return (
    <Gradient colors={[THEME_COLOR, THEME_COLOR]}>
      <Text {...props}>{children}</Text>
    </Gradient>
  );
};
