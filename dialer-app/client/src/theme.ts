import { extendTheme } from "@chakra-ui/react";

// Brand highlight color – gold variant
const brandGold = "#EFBF04";

// Extend Chakra UI theme to globally override MenuItem hover / focus / active background colors
const theme = extendTheme({
  components: {
    Menu: {
      // Chakra Menu is composed of several parts; we target the `item` part
      // to change the background on interactive states.
      baseStyle: {
        item: {
          _hover: { bg: brandGold },
          _focus: { bg: brandGold },
          _active: { bg: brandGold },
        },
      },
    },
  },
});

export default theme; 