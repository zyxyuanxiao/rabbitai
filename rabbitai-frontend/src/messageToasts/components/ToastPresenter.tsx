
import React from 'react';
import { styled } from '@rabbitai-ui/core';
import { ToastMeta } from 'src/messageToasts/types';
import Toast from './Toast';

const StyledToastPresenter = styled.div`
  max-width: 600px;
  position: fixed;
  bottom: 0px;
  right: 0px;
  margin-right: 50px;
  margin-bottom: 50px;
  z-index: ${({ theme }) => theme.zIndex.max};

  .toast {
    background: ${({ theme }) => theme.colors.grayscale.dark1};
    border-radius: ${({ theme }) => theme.borderRadius};
    box-shadow: 0 2px 4px 0
      fade(
        ${({ theme }) => theme.colors.grayscale.dark2},
        ${({ theme }) => theme.opacity.mediumLight}
      );
    color: ${({ theme }) => theme.colors.grayscale.light5};
    opacity: 0;
    position: relative;
    transform: translateY(-100%);
    white-space: pre-line;
    will-change: transform, opacity;
    transition: transform ${({ theme }) => theme.transitionTiming}s,
      opacity ${({ theme }) => theme.transitionTiming}s;

    &:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
    }
  }

  .toast > button {
    color: ${({ theme }) => theme.colors.grayscale.light5};
    opacity: 1;
  }

  .toast--visible {
    opacity: 1;
    transform: translateY(0);
  }
`;

type ToastPresenterProps = {
  toasts: Array<ToastMeta>;
  removeToast: () => void;
};

export default function ToastPresenter({
  toasts,
  removeToast,
}: ToastPresenterProps) {
  return (
    toasts.length > 0 && (
      <StyledToastPresenter id="toast-presenter">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onCloseToast={removeToast} />
        ))}
      </StyledToastPresenter>
    )
  );
}
