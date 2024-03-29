
import React, { useEffect } from 'react';
import { styled, logging } from '@rabbitai-ui/core';

export type BackgroundPosition = 'top' | 'bottom';
interface ImageContainerProps {
  src: string;
  position: BackgroundPosition;
}

const ImageContainer = styled.div<ImageContainerProps>`
  background-image: url(${({ src }) => src});
  background-size: cover;
  background-position: center ${({ position }) => position};
  display: inline-block;
  height: calc(100% - 1px);
  width: calc(100% - 2px);
  margin: 1px 1px 0 1px;
`;
interface ImageLoaderProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  fallback: string;
  src: string;
  isLoading?: boolean;
  position: BackgroundPosition;
}

export default function ImageLoader({
  src,
  fallback,
  isLoading,
  position,
  ...rest
}: ImageLoaderProps) {
  const [imgSrc, setImgSrc] = React.useState<string>(fallback);

  useEffect(() => {
    if (src) {
      fetch(src)
        .then(response => response.blob())
        .then(blob => {
          if (/image/.test(blob.type)) {
            const imgURL = URL.createObjectURL(blob);
            setImgSrc(imgURL);
          }
        })
        .catch(errMsg => {
          logging.error(errMsg);
          setImgSrc(fallback);
        });
    }

    return () => {
      // theres a very brief period where isLoading is false and this component is about to unmount
      // where the stale imgSrc is briefly rendered. Setting imgSrc to fallback smoothes the transition.
      setImgSrc(fallback);
    };
  }, [src, fallback]);

  return (
    <ImageContainer
      src={isLoading ? fallback : imgSrc}
      {...rest}
      position={position}
    />
  );
}
