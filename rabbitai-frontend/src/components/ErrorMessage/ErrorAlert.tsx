
import React, { useState, ReactNode } from 'react';
import { styled, rabbitaiTheme, t } from '@rabbitai-ui/core';
import { noOp } from 'src/utils/common';
import Modal from 'src/components/Modal';
import Button from 'src/components/Button';

import Icon from '../Icon';
import { ErrorLevel, ErrorSource } from './types';
import CopyToClipboard from '../CopyToClipboard';

const ErrorAlertDiv = styled.div<{ level: ErrorLevel }>`
  align-items: center;
  background-color: ${({ level, theme }) => theme.colors[level].light2};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  border: 1px solid ${({ level, theme }) => theme.colors[level].base};
  color: ${({ level, theme }) => theme.colors[level].dark2};
  padding: ${({ theme }) => 2 * theme.gridUnit}px;
  width: 100%;

  .top-row {
    display: flex;
    justify-content: space-between;
  }

  .error-body {
    padding-top: ${({ theme }) => theme.gridUnit}px;
    padding-left: ${({ theme }) => 8 * theme.gridUnit}px;
  }

  .icon {
    margin-right: ${({ theme }) => 2 * theme.gridUnit}px;
  }

  .link {
    color: ${({ level, theme }) => theme.colors[level].dark2};
    text-decoration: underline;
  }
`;

const ErrorModal = styled(Modal)<{ level: ErrorLevel }>`
  color: ${({ level, theme }) => theme.colors[level].dark2};
  overflow-wrap: break-word;

  .ant-modal-header {
    background-color: ${({ level, theme }) => theme.colors[level].light2};
    padding: ${({ theme }) => 4 * theme.gridUnit}px;
  }

  .icon {
    margin-right: ${({ theme }) => 2 * theme.gridUnit}px;
  }

  .header {
    display: flex;
    align-items: center;
    font-size: ${({ theme }) => theme.typography.sizes.l}px;
  }
`;

const LeftSideContent = styled.div`
  align-items: center;
  display: flex;
`;

interface ErrorAlertProps {
  body: ReactNode;
  copyText?: string;
  level: ErrorLevel;
  source?: ErrorSource;
  subtitle: ReactNode;
  title: ReactNode;
}

export default function ErrorAlert({
  body,
  copyText,
  level,
  source = 'dashboard',
  subtitle,
  title,
}: ErrorAlertProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  const isExpandable = ['explore', 'sqllab'].includes(source);

  return (
    <ErrorAlertDiv level={level} role="alert">
      <div className="top-row">
        <LeftSideContent>
          <Icon
            className="icon"
            name={level === 'error' ? 'error-solid' : 'warning-solid'}
            color={rabbitaiTheme.colors[level].base}
          />
          <strong>{title}</strong>
        </LeftSideContent>
        {!isExpandable && (
          <span
            role="button"
            tabIndex={0}
            className="link"
            onClick={() => setIsModalOpen(true)}
          >
            {t('See more')}
          </span>
        )}
      </div>
      {isExpandable ? (
        <div className="error-body">
          <p>{subtitle}</p>
          {body && (
            <>
              {!isBodyExpanded && (
                <span
                  role="button"
                  tabIndex={0}
                  className="link"
                  onClick={() => setIsBodyExpanded(true)}
                >
                  {t('See more')}
                </span>
              )}
              {isBodyExpanded && (
                <>
                  <br />
                  {body}
                  <span
                    role="button"
                    tabIndex={0}
                    className="link"
                    onClick={() => setIsBodyExpanded(false)}
                  >
                    {t('See less')}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <ErrorModal
          level={level}
          show={isModalOpen}
          onHide={() => setIsModalOpen(false)}
          title={
            <div className="header">
              <Icon
                className="icon"
                name={level === 'error' ? 'error-solid' : 'warning-solid'}
                color={rabbitaiTheme.colors[level].base}
              />
              <div className="title">{title}</div>
            </div>
          }
          footer={
            <>
              {copyText && (
                <CopyToClipboard
                  text={copyText}
                  shouldShowText={false}
                  wrapped={false}
                  copyNode={<Button onClick={noOp}>{t('Copy message')}</Button>}
                />
              )}
              <Button
                cta
                buttonStyle="primary"
                onClick={() => setIsModalOpen(false)}
              >
                {t('Close')}
              </Button>
            </>
          }
        >
          <>
            <p>{subtitle}</p>
            <br />
            {body}
          </>
        </ErrorModal>
      )}
    </ErrorAlertDiv>
  );
}
