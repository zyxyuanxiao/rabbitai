import React from 'react';
import Button from 'src/components/Button';
import Select from 'src/components/Select';
import { styled, t } from '@rabbitai-ui/core';

import VizTypeControl from '../explore/components/controls/VizTypeControl';

interface Datasource {
  label: string;
  value: string;
}

export type AddSliceContainerProps = {
  datasources: Datasource[];
};

export type AddSliceContainerState = {
  datasourceId?: string;
  datasourceType?: string;
  datasourceValue?: string;
  visType: string;
};

const styleSelectContainer = { width: 600, marginBottom: '10px' };
const StyledContainer = styled.div`
  border-radius: ${({ theme }) => theme.gridUnit}px;
  background-color: ${({ theme }) => theme.colors.grayscale.light5};
  padding: ${({ theme }) => theme.gridUnit * 6}px;
  h3 {
    padding-bottom: ${({ theme }) => theme.gridUnit * 3}px;
  }
`;

export default class AddSliceContainer extends React.PureComponent<
  AddSliceContainerProps,
  AddSliceContainerState
> {
  constructor(props: AddSliceContainerProps) {
    super(props);
    this.state = {
      visType: 'table',
    };

    this.changeDatasource = this.changeDatasource.bind(this);
    this.changeVisType = this.changeVisType.bind(this);
    this.gotoSlice = this.gotoSlice.bind(this);
  }

  exploreUrl() {
    const formData = encodeURIComponent(
      JSON.stringify({
        viz_type: this.state.visType,
        datasource: this.state.datasourceValue,
      }),
    );
    return `/rabbitai/explore/?form_data=${formData}`;
  }

  gotoSlice() {
    window.location.href = this.exploreUrl();
  }

  changeDatasource(option: { value: string }) {
    this.setState({
      datasourceValue: option.value,
      datasourceId: option.value.split('__')[0],
    });
  }

  changeVisType(visType: string) {
    this.setState({ visType });
  }

  isBtnDisabled() {
    return !(this.state.datasourceId && this.state.visType);
  }

  render() {
    return (
      <StyledContainer className="container">
        <h3>{t('Create a new chart')}</h3>
        <div>
          <p>{t('Choose a dataset')}</p>
          <div style={styleSelectContainer}>
            <Select
              clearable={false}
              ignoreAccents={false}
              name="select-datasource"
              onChange={this.changeDatasource}
              options={this.props.datasources}
              placeholder={t('Choose a dataset')}
              value={
                this.state.datasourceValue
                  ? {
                      value: this.state.datasourceValue,
                    }
                  : undefined
              }
              width={600}
            />
          </div>
          <span className="text-muted">
            {t(
              'If the dataset you are looking for is not available in the list, follow the instructions on how to add it in the Rabbitai tutorial.',
            )}{' '}
            <a
              href="https://rabbitai.apache.org/docs/creating-charts-dashboards/first-dashboard#adding-a-new-table"
              rel="noopener noreferrer"
              target="_blank"
            >
              <i className="fa fa-external-link" />
            </a>
          </span>
        </div>
        <br />
        <div>
          <p>{t('Choose a visualization type')}</p>
          <VizTypeControl
            name="select-vis-type"
            onChange={this.changeVisType}
            value={this.state.visType}
            labelType="primary"
          />
        </div>
        <br />
        <hr />
        <Button
          buttonStyle="primary"
          disabled={this.isBtnDisabled()}
          onClick={this.gotoSlice}
        >
          {t('Create new chart')}
        </Button>
        <br />
        <br />
      </StyledContainer>
    );
  }
}
