
import React, { FunctionComponent, useState } from 'react';
import { styled, t } from '@rabbitai-ui/core';
import { useSingleViewResource } from 'src/views/CRUD/hooks';
import { isEmpty, isNil } from 'lodash';
import Icon from 'src/components/Icon';
import Modal from 'src/components/Modal';
import TableSelector from 'src/components/TableSelector';
import withToasts from 'src/messageToasts/enhancers/withToasts';

type DatasetAddObject = {
  id: number;
  database: number;
  schema: string;
  table_name: string;
};
interface DatasetModalProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  onDatasetAdd?: (dataset: DatasetAddObject) => void;
  onHide: () => void;
  show: boolean;
}

const StyledIcon = styled(Icon)`
  margin: auto ${({ theme }) => theme.gridUnit * 2}px auto 0;
`;

const TableSelectorContainer = styled.div`
  padding-bottom: 340px;
  width: 65%;
`;

const DatasetModal: FunctionComponent<DatasetModalProps> = ({
  addDangerToast,
  addSuccessToast,
  onDatasetAdd,
  onHide,
  show,
}) => {
  const [currentSchema, setSchema] = useState('');
  const [currentTableName, setTableName] = useState('');
  const [datasourceId, setDatasourceId] = useState<number>(0);
  const [disableSave, setDisableSave] = useState(true);
  const { createResource } = useSingleViewResource<Partial<DatasetAddObject>>(
    'dataset',
    t('dataset'),
    addDangerToast,
  );

  const onChange = ({
    dbId,
    schema,
    tableName,
  }: {
    dbId: number;
    schema: string;
    tableName: string;
  }) => {
    setDatasourceId(dbId);
    setDisableSave(isNil(dbId) || isEmpty(tableName));
    setSchema(schema);
    setTableName(tableName);
  };

  const onSave = () => {
    const data = {
      database: datasourceId,
      ...(currentSchema ? { schema: currentSchema } : {}),
      table_name: currentTableName,
    };
    createResource(data).then(response => {
      if (!response) {
        return;
      }
      if (onDatasetAdd) {
        onDatasetAdd({ id: response.id, ...response });
      }
      addSuccessToast(t('The dataset has been saved'));
      onHide();
    });
  };

  return (
    <Modal
      disablePrimaryButton={disableSave}
      onHandledPrimaryAction={onSave}
      onHide={onHide}
      primaryButtonName={t('Add')}
      show={show}
      title={
        <>
          <StyledIcon name="warning-solid" />
          {t('Add dataset')}
        </>
      }
    >
      <TableSelectorContainer>
        <TableSelector
          clearable={false}
          dbId={datasourceId}
          formMode
          handleError={addDangerToast}
          onChange={onChange}
          schema={currentSchema}
          tableName={currentTableName}
        />
      </TableSelectorContainer>
    </Modal>
  );
};

export default withToasts(DatasetModal);
