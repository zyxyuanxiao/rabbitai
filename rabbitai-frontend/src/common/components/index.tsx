import React from 'react';
import { styled } from '@rabbitai-ui/core';
import {
  Dropdown,
  Menu as AntdMenu,
  Input as AntdInput,
  InputNumber as AntdInputNumber,
  Skeleton,
} from 'antd';
import { DropDownProps } from 'antd/lib/dropdown';
/*
  Antd is re-exported from here so we can override components with Emotion as needed.

  For documentation, see https://ant.design/components/overview/
 */
export {
  AutoComplete,
  Avatar,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Empty,
  Modal,
  Typography,
  Tree,
  Popover,
  Slider,
  Row,
  Space,
  Skeleton,
  Switch,
  Tag,
  Tabs,
  Tooltip,
  Input as AntdInput,
} from 'antd';
export { Card as AntdCard } from 'antd';
export { FormInstance } from 'antd/lib/form';
export { RadioChangeEvent } from 'antd/lib/radio';
export { TreeProps } from 'antd/lib/tree';
export { default as Alert, AlertProps } from 'antd/lib/alert';
export { default as Select, SelectProps } from 'antd/lib/select';
export { default as List, ListItemProps } from 'antd/lib/list';

export { default as Collapse } from 'src/components/Collapse';
export { default as Badge } from 'src/components/Badge';
export { default as Card } from 'src/components/Card';
export { default as Progress } from 'src/components/ProgressBar';

export const MenuItem = styled(AntdMenu.Item)`
  > a {
    text-decoration: none;
  }

  &.ant-menu-item {
    height: ${({ theme }) => theme.gridUnit * 7}px;
    line-height: ${({ theme }) => theme.gridUnit * 7}px;
    a {
      border-bottom: none;
      transition: background-color ${({ theme }) => theme.transitionTiming}s;
      &:after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 50%;
        width: 0;
        height: 3px;
        opacity: 0;
        transform: translateX(-50%);
        transition: all ${({ theme }) => theme.transitionTiming}s;
        background-color: ${({ theme }) => theme.colors.primary.base};
      }
      &:focus {
        border-bottom: none;
        background-color: transparent;
        @media (max-width: 767px) {
          background-color: ${({ theme }) => theme.colors.primary.light5};
        }
      }
    }
  }

  &.ant-menu-item,
  &.ant-dropdown-menu-item {
    span[role='button'] {
      display: inline-block;
      width: 100%;
    }
    transition-duration: 0s;
  }
`;

export const StyledNav = styled(AntdMenu)`
  line-height: 51px;
  border: none;

  & > .ant-menu-item,
  & > .ant-menu-submenu {
    vertical-align: inherit;
    &:hover {
      color: ${({ theme }) => theme.colors.grayscale.dark1};
    }
  }

  &:not(.ant-menu-dark) > .ant-menu-submenu,
  &:not(.ant-menu-dark) > .ant-menu-item {
    &:hover {
      border-bottom: none;
    }
  }

  &:not(.ant-menu-dark) > .ant-menu-submenu,
  &:not(.ant-menu-dark) > .ant-menu-item {
    margin: 0px;
  }

  & > .ant-menu-item > a {
    padding: ${({ theme }) => theme.gridUnit * 4}px;
  }
`;

export const StyledSubMenu = styled(AntdMenu.SubMenu)`
  color: ${({ theme }) => theme.colors.grayscale.dark1};
  border-bottom: none;
  .ant-menu-submenu-open,
  .ant-menu-submenu-active {
    background-color: ${({ theme }) => theme.colors.primary.light5};
    .ant-menu-submenu-title {
      color: ${({ theme }) => theme.colors.grayscale.dark1};
      background-color: ${({ theme }) => theme.colors.primary.light5};
      border-bottom: none;
      margin: 0;
      &:after {
        opacity: 1;
        width: calc(100% - 1);
      }
    }
  }
  .ant-menu-submenu-title {
    position: relative;
    top: ${({ theme }) => -theme.gridUnit - 3}px;
    &:after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 50%;
      width: 0;
      height: 3px;
      opacity: 0;
      transform: translateX(-50%);
      transition: all ${({ theme }) => theme.transitionTiming}s;
      background-color: ${({ theme }) => theme.colors.primary.base};
    }
  }
  .ant-menu-submenu-arrow {
    top: 67%;
  }
  & > .ant-menu-submenu-title {
    padding: 0 ${({ theme }) => theme.gridUnit * 6}px 0
      ${({ theme }) => theme.gridUnit * 3}px !important;
    svg {
      position: absolute;
      top: ${({ theme }) => theme.gridUnit * 4 + 7}px;
      right: ${({ theme }) => theme.gridUnit}px;
      width: ${({ theme }) => theme.gridUnit * 6}px;
    }
    & > span {
      position: relative;
      top: 7px;
    }
    &:hover {
      color: ${({ theme }) => theme.colors.primary.base};
    }
  }
`;

export declare type MenuMode =
  | 'vertical'
  | 'vertical-left'
  | 'vertical-right'
  | 'horizontal'
  | 'inline';
export const Menu = Object.assign(AntdMenu, {
  Item: MenuItem,
});

export const MainNav = Object.assign(StyledNav, {
  Item: MenuItem,
  SubMenu: StyledSubMenu,
  Divider: AntdMenu.Divider,
  ItemGroup: AntdMenu.ItemGroup,
});

export const Input = styled(AntdInput)`
  border: 1px solid ${({ theme }) => theme.colors.secondary.light3};
  border-radius: ${({ theme }) => theme.borderRadius}px;
`;

export const InputNumber = styled(AntdInputNumber)`
  border: 1px solid ${({ theme }) => theme.colors.secondary.light3};
  border-radius: ${({ theme }) => theme.borderRadius}px;
`;

export const TextArea = styled(AntdInput.TextArea)`
  border: 1px solid ${({ theme }) => theme.colors.secondary.light3};
  border-radius: ${({ theme }) => theme.borderRadius}px;
`;

export const NoAnimationDropdown = (props: DropDownProps) => (
  <Dropdown
    overlayStyle={{ zIndex: 4000, animationDuration: '0s' }}
    {...props}
  />
);

export const ThinSkeleton = styled(Skeleton)`
  h3 {
    margin: ${({ theme }) => theme.gridUnit}px 0;
  }

  ul {
    margin-bottom: 0;
  }
`;

export { default as Icon } from '@ant-design/icons';
