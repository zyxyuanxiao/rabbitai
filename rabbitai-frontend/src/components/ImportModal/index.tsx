
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import { styled, t } from '@rabbitai-ui/core';

import Icon from 'src//components/Icon';
import Modal from 'src/components/Modal';
import { useImportResource } from 'src/views/CRUD/hooks';
import { ImportResourceName } from 'src/views/CRUD/types';

export const StyledIcon = styled(Icon)`
  margin: auto ${({ theme }) => theme.gridUnit * 2}px auto 0;
`;

const HelperMessage = styled.div`
  display: block;
  color: ${({ theme }) => theme.colors.grayscale.base};
  font-size: ${({ theme }) => theme.typography.sizes.s - 1}px;
`;

const StyledInputContainer = styled.div`
  padding-bottom: ${({ theme }) => theme.gridUnit * 2}px;
  padding-top: ${({ theme }) => theme.gridUnit * 2}px;

  & > div {
    margin: ${({ theme }) => theme.gridUnit}px 0;
  }

  &.extra-container {
    padding-top: 8px;
  }

  .confirm-overwrite {
    margin-bottom: ${({ theme }) => theme.gridUnit * 2}px;
  }

  .input-container {
    display: flex;
    align-items: center;

    label {
      display: flex;
      margin-right: ${({ theme }) => theme.gridUnit * 2}px;
    }

    i {
      margin: 0 ${({ theme }) => theme.gridUnit}px;
    }
  }

  input,
  textarea {
    flex: 1 1 auto;
  }

  textarea {
    height: 160px;
    resize: none;
  }

  input::placeholder,
  textarea::placeholder {
    color: ${({ theme }) => theme.colors.grayscale.light1};
  }

  textarea,
  input[type='text'],
  input[type='number'] {
    padding: ${({ theme }) => theme.gridUnit * 1.5}px
      ${({ theme }) => theme.gridUnit * 2}px;
    border-style: none;
    border: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
    border-radius: ${({ theme }) => theme.gridUnit}px;

    &[name='name'] {
      flex: 0 1 auto;
      width: 40%;
    }

    &[name='sqlalchemy_uri'] {
      margin-right: ${({ theme }) => theme.gridUnit * 3}px;
    }
  }
`;

export interface ImportModelsModalProps {
  resourceName: ImportResourceName;
  resourceLabel: string;
  passwordsNeededMessage: string;
  confirmOverwriteMessage: string;
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  onModelImport: () => void;
  show: boolean;
  onHide: () => void;
  passwordFields?: string[];
  setPasswordFields?: (passwordFields: string[]) => void;
}

const ImportModelsModal: FunctionComponent<ImportModelsModalProps> = ({
  resourceName,
  resourceLabel,
  passwordsNeededMessage,
  confirmOverwriteMessage,
  addDangerToast,
  addSuccessToast,
  onModelImport,
  show,
  onHide,
  passwordFields = [],
  setPasswordFields = () => {},
}) => {
  const [isHidden, setIsHidden] = useState<boolean>(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [needsOverwriteConfirm, setNeedsOverwriteConfirm] = useState<boolean>(
    false,
  );
  const [confirmedOverwrite, setConfirmedOverwrite] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearModal = () => {
    setUploadFile(null);
    setPasswordFields([]);
    setPasswords({});
    setNeedsOverwriteConfirm(false);
    setConfirmedOverwrite(false);
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleErrorMsg = (msg: string) => {
    clearModal();
    addDangerToast(msg);
  };

  const {
    state: { alreadyExists, passwordsNeeded },
    importResource,
  } = useImportResource(resourceName, resourceLabel, handleErrorMsg);

  useEffect(() => {
    setPasswordFields(passwordsNeeded);
  }, [passwordsNeeded, setPasswordFields]);

  useEffect(() => {
    setNeedsOverwriteConfirm(alreadyExists.length > 0);
  }, [alreadyExists, setNeedsOverwriteConfirm]);

  // Functions
  const hide = () => {
    setIsHidden(true);
    onHide();
    clearModal();
  };

  const onUpload = () => {
    if (uploadFile === null) {
      return;
    }

    importResource(uploadFile, passwords, confirmedOverwrite).then(result => {
      if (result) {
        addSuccessToast(t('The import was successful'));
        clearModal();
        onModelImport();
      }
    });
  };

  const changeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target as HTMLInputElement;
    setUploadFile((files && files[0]) || null);
  };

  const confirmOverwrite = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetValue = (event.currentTarget?.value as string) ?? '';
    setConfirmedOverwrite(targetValue.toUpperCase() === t('OVERWRITE'));
  };

  const renderPasswordFields = () => {
    if (passwordFields.length === 0) {
      return null;
    }

    return (
      <>
        <h5>Database passwords</h5>
        <HelperMessage>{passwordsNeededMessage}</HelperMessage>
        {passwordFields.map(fileName => (
          <StyledInputContainer key={`password-for-${fileName}`}>
            <div className="control-label">
              {fileName}
              <span className="required">*</span>
            </div>
            <input
              name={`password-${fileName}`}
              autoComplete={`password-${fileName}`}
              type="password"
              value={passwords[fileName]}
              onChange={event =>
                setPasswords({ ...passwords, [fileName]: event.target.value })
              }
            />
          </StyledInputContainer>
        ))}
      </>
    );
  };

  const renderOverwriteConfirmation = () => {
    if (!needsOverwriteConfirm) {
      return null;
    }

    return (
      <>
        <StyledInputContainer>
          <div className="confirm-overwrite">{confirmOverwriteMessage}</div>
          <div className="control-label">
            {t('Type "%s" to confirm', t('OVERWRITE'))}
          </div>
          <input
            data-test="overwrite-modal-input"
            id="overwrite"
            type="text"
            onChange={confirmOverwrite}
          />
        </StyledInputContainer>
      </>
    );
  };

  // Show/hide
  if (isHidden && show) {
    setIsHidden(false);
  }

  return (
    <Modal
      name="model"
      className="import-model-modal"
      disablePrimaryButton={
        uploadFile === null || (needsOverwriteConfirm && !confirmedOverwrite)
      }
      onHandledPrimaryAction={onUpload}
      onHide={hide}
      primaryButtonName={needsOverwriteConfirm ? t('Overwrite') : t('Import')}
      primaryButtonType={needsOverwriteConfirm ? 'danger' : 'primary'}
      width="750px"
      show={show}
      title={<h4>{t('Import %s', resourceLabel)}</h4>}
    >
      <StyledInputContainer>
        <div className="control-label">
          <label htmlFor="modelFile">
            {t('File')}
            <span className="required">*</span>
          </label>
        </div>
        <input
          ref={fileInputRef}
          data-test="model-file-input"
          name="modelFile"
          id="modelFile"
          type="file"
          accept=".yaml,.json,.yml,.zip"
          onChange={changeFile}
        />
      </StyledInputContainer>
      {renderPasswordFields()}
      {renderOverwriteConfirmation()}
    </Modal>
  );
};

export default ImportModelsModal;
