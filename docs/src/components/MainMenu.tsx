
import React from 'react';
import { Drawer, Layout, Menu } from 'antd';
import { Link } from 'gatsby';
import { MenuOutlined, GithubOutlined } from '@ant-design/icons';
import { css } from '@emotion/core';
import { getCurrentPath, mq } from '../utils';
import logoSvg from '../images/rabbitai-logo-horiz.svg';

const menuResponsiveIndex = 1;

const headerStyle = css`
  background-color: rgb(255,255,255, 0.9);
  padding-left: 0px;
  padding-right: 0px;
  position: fixed;
  top: 0;
  width: 100%;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.12);
  z-index: 1;
  .ant-menu {
    background: transparent;
  }
  .menu-icon {
    vertical-align: middle;
    font-size: 24px;
    padding-left: 0px;
    padding-right: 0px;
  }
  .ant-menu-horizontal {
    border-bottom: none;
  }
  .menu-sm {
    display: none;
  }
  .ant-menu-horizontal:not(.ant-menu-dark)>.ant-menu-item-selected {
    border-bottom: 2px solid #20A7C9;
  }
  ${[mq[menuResponsiveIndex]]} {
    .menu-sm {
      display: block;
    }
    .menu-lg {
      display: none;
    }
  }
`;
const logoStyle = css`
  float: left;
  margin-top: 6px;
  height: 50px;
`;

interface menuProps {
  mode: string;
  toggleDrawer: () => null;
}

const MenuItems = ({ mode, toggleDrawer }: menuProps) => {
  let leftStyle = { float: 'left' };
  let rightStyle = { float: 'right' };
  if (mode === 'vertical') {
    leftStyle = null;
    rightStyle = null;
  }
  return (
    <Menu mode={mode} selectedKeys={getCurrentPath()}>
      <Menu.Item key="docsintro" style={leftStyle} className="menu-lg">
        <Link to="/docs/intro">Documentation</Link>
      </Menu.Item>
      <Menu.Item key="gallery" style={leftStyle} className="menu-lg">
        <Link to="/gallery">Gallery</Link>
      </Menu.Item>
      <Menu.Item key="community" style={leftStyle} className="menu-lg">
        <Link to="/community">Community</Link>
      </Menu.Item>
      <Menu.Item key="resources" style={leftStyle} className="menu-lg">
        <Link to="/resources"> Resources</Link>
      </Menu.Item>
      {toggleDrawer && (
      <Menu.Item style={rightStyle} className="menu-sm">
        <MenuOutlined onClick={toggleDrawer} className="menu-icon" />
      </Menu.Item>
      )}
      {mode === 'horizontal'
      && (
      <Menu.Item key="github" style={rightStyle}>
        <a href="https://github.com/apache/rabbitai" target="_blank" rel="noreferrer">
          <GithubOutlined className="menu-icon" />
        </a>
      </Menu.Item>
      )}
    </Menu>
  );
};

export default class MainMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
    };
    this.toggleDrawer = this.toggleDrawer.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  onClose() {
    this.setState({
      visible: false,
    });
  }

  toggleDrawer() {
    this.setState((prevState) => ({
      visible: !prevState.visible,
    }));
  }

  render() {
    const { visible } = this.state;
    return (
      <Layout.Header css={headerStyle}>
        <a href="/">
          <img height="50" css={logoStyle} src={logoSvg} alt="logo" />
        </a>
        <MenuItems toggleDrawer={this.toggleDrawer} mode="horizontal" />
        <Drawer
          title="Menu"
          placement="right"
          closable={false}
          onClose={this.onClose}
          visible={visible}
        >
          <MenuItems mode="vertical" />
        </Drawer>
      </Layout.Header>
    );
  }
}
