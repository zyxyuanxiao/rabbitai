

import React, { useEffect, useRef, useState } from 'react';
import AntdIcon from '@ant-design/icons';
import { styled } from '@rabbitai-ui/core';
import { ReactComponent as TransparentIcon } from 'images/icons/transparent.svg';
import IconType from './IconType';

const AntdIconComponent = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  iconColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  iconSize,
  viewBox,
  ...rest
}: Omit<IconType, 'ref' | 'css'>) => (
  <AntdIcon viewBox={viewBox || '0 0 24 24'} {...rest} />
);

export const StyledIcon = styled(AntdIconComponent)<IconType>`
  ${({ iconColor }) => iconColor && `color: ${iconColor};`};
  font-size: ${({ iconSize, theme }) =>
    iconSize
      ? `${theme.typography.sizes[iconSize] || theme.typography.sizes.m}px`
      : '24px'};
`;

interface IconProps extends IconType {
  fileName: string;
}

export const Icon = (props: IconProps) => {
  const { fileName, ...iconProps } = props;
  const [, setLoaded] = useState(false);
  const ImportedSVG = useRef<React.FC<React.SVGProps<SVGSVGElement>>>();
  const name = fileName.replace('_', '-');

  useEffect(() => {
    async function importIcon(): Promise<void> {
      ImportedSVG.current = (
        await import(
          `!!@svgr/webpack?-svgo,+titleProp,+ref!images/icons/${fileName}.svg`
        )
      ).default;
      setLoaded(true);
    }
    importIcon();
  }, [fileName, ImportedSVG]);

  return (
    <StyledIcon
      component={ImportedSVG.current || TransparentIcon}
      aria-label={name}
      {...iconProps}
    />
  );
};

export default Icon;
