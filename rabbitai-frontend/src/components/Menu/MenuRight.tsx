
import React from 'react';
import { MainNav as Menu } from 'src/common/components';
import { t, styled, css, RabbitaiTheme } from '@rabbitai-ui/core';
import { Link } from 'react-router-dom';
import Icon from 'src/components/Icon';
import LanguagePicker from './LanguagePicker';
import { NavBarProps, MenuObjectProps } from './Menu';

export const dropdownItems = [
  {
    label: t('SQL query'),
    url: '/rabbitai/sqllab',
    icon: 'fa-fw fa-search',
  },
  {
    label: t('Chart'),
    url: '/chart/add',
    icon: 'fa-fw fa-bar-chart',
  },
  {
    label: t('Dashboard'),
    url: '/dashboard/new',
    icon: 'fa-fw fa-dashboard',
  },
];

const versionInfoStyles = (theme: RabbitaiTheme) => css`
  padding: ${theme.gridUnit * 1.5}px ${theme.gridUnit * 4}px
    ${theme.gridUnit * 4}px ${theme.gridUnit * 7}px;
  color: ${theme.colors.grayscale.base};
  font-size: ${theme.typography.sizes.xs}px;
  white-space: nowrap;
`;
const StyledI = styled.div`
  color: ${({ theme }) => theme.colors.primary.dark1};
`;

const StyledDiv = styled.div<{ align: string }>`
  display: flex;
  flex-direction: row;
  justify-content: ${({ align }) => align};
  align-items: center;
  margin-right: ${({ theme }) => theme.gridUnit}px;
`;

const StyledAnchor = styled.a`
  padding-right: ${({ theme }) => theme.gridUnit}px;
  padding-left: ${({ theme }) => theme.gridUnit}px;
`;

const { SubMenu } = Menu;

interface RightMenuProps {
  align: 'flex-start' | 'flex-end';
  settings: MenuObjectProps[];
  navbarRight: NavBarProps;
  isFrontendRoute: (path?: string) => boolean;
}

const RightMenu = ({
  align,
  settings,
  navbarRight,
  isFrontendRoute,
}: RightMenuProps) => (
  <StyledDiv align={align}>
    <Menu mode="horizontal">
      {!navbarRight.user_is_anonymous && (
        <SubMenu
          data-test="new-dropdown"
          title={
            <StyledI data-test="new-dropdown-icon" className="fa fa-plus" />
          }
          icon={<Icon name="triangle-down" />}
        >
          {dropdownItems.map(menu => (
            <Menu.Item key={menu.label}>
              <a href={menu.url}>
                <i
                  data-test={`menu-item-${menu.label}`}
                  className={`fa ${menu.icon}`}
                />{' '}
                {menu.label}
              </a>
            </Menu.Item>
          ))}
        </SubMenu>
      )}
      <SubMenu title="Settings" icon={<Icon name="triangle-down" />}>
        {settings.map((section, index) => [
          <Menu.ItemGroup key={`${section.label}`} title={section.label}>
            {section.childs?.map(child => {
              if (typeof child !== 'string') {
                return (
                  <Menu.Item key={`${child.label}`}>
                    {isFrontendRoute(child.url) ? (
                      <Link to={child.url || ''}>{child.label}</Link>
                    ) : (
                      <a href={child.url}>{child.label}</a>
                    )}
                  </Menu.Item>
                );
              }
              return null;
            })}
          </Menu.ItemGroup>,
          index < settings.length - 1 && <Menu.Divider />,
        ])}

        {!navbarRight.user_is_anonymous && [
          <Menu.Divider key="user-divider" />,
          <Menu.ItemGroup key="user-section" title={t('User')}>
            {navbarRight.user_profile_url && (
              <Menu.Item key="profile">
                <a href={navbarRight.user_profile_url}>{t('Profile')}</a>
              </Menu.Item>
            )}
            <Menu.Item key="info">
              <a href={navbarRight.user_info_url}>{t('Info')}</a>
            </Menu.Item>
            <Menu.Item key="logout">
              <a href={navbarRight.user_logout_url}>{t('Logout')}</a>
            </Menu.Item>
          </Menu.ItemGroup>,
        ]}
        {(navbarRight.version_string || navbarRight.version_sha) && [
          <Menu.Divider key="version-info-divider" />,
          <Menu.ItemGroup key="about-section" title={t('About')}>
            <div className="about-section">
              {navbarRight.version_string && (
                <div css={versionInfoStyles}>
                  Version: {navbarRight.version_string}
                </div>
              )}
              {navbarRight.version_sha && (
                <div css={versionInfoStyles}>
                  SHA: {navbarRight.version_sha}
                </div>
              )}
            </div>
          </Menu.ItemGroup>,
        ]}
      </SubMenu>
      {navbarRight.show_language_picker && (
        <LanguagePicker
          locale={navbarRight.locale}
          languages={navbarRight.languages}
        />
      )}
    </Menu>
    {navbarRight.documentation_url && (
      <StyledAnchor
        href={navbarRight.documentation_url}
        target="_blank"
        rel="noreferrer"
        title={t('Documentation')}
      >
        <i className="fa fa-question" />
        &nbsp;
      </StyledAnchor>
    )}
    {navbarRight.bug_report_url && (
      <StyledAnchor
        href={navbarRight.bug_report_url}
        target="_blank"
        rel="noreferrer"
        title={t('Report a bug')}
      >
        <i className="fa fa-bug" />
      </StyledAnchor>
    )}
    {navbarRight.user_is_anonymous && (
      <StyledAnchor href={navbarRight.user_login_url}>
        <i className="fa fa-fw fa-sign-in" />
        {t('Login')}
      </StyledAnchor>
    )}
  </StyledDiv>
);

export default RightMenu;
