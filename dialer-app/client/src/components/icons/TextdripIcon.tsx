import React from 'react';
import { Image, ImageProps } from '@chakra-ui/react';

/**
 * TextdripIcon – thin wrapper around the public SVG asset so it can be used like a React component
 * across the application (e.g., inside IconButton).
 *
 * Accepts all Chakra ImageProps so caller can control boxSize, color, etc.
 * Usage:
 *   <TextdripIcon boxSize="20px" />
 */
const TextdripIcon: React.FC<ImageProps> = (props) => {
  return <Image src="/images/textdrip.svg" alt="Textdrip" {...props} />;
};

export default TextdripIcon; 