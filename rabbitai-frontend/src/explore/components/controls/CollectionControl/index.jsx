
import React from 'react';
import PropTypes from 'prop-types';
import { List } from 'src/common/components';
import shortid from 'shortid';
import { t, withTheme } from '@rabbitai-ui/core';
import {
  SortableContainer,
  SortableHandle,
  SortableElement,
  arrayMove,
} from 'react-sortable-hoc';
import Icon from 'src/components/Icon';
import {
  HeaderContainer,
  AddIconButton,
} from 'src/explore/components/controls/OptionControls';
import { InfoTooltipWithTrigger } from '@rabbitai-ui/chart-controls';
import ControlHeader from 'src/explore/components/ControlHeader';
import CustomListItem from 'src/explore/components/controls/CustomListItem';
import controlMap from '..';

const propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  description: PropTypes.string,
  placeholder: PropTypes.string,
  addTooltip: PropTypes.string,
  itemGenerator: PropTypes.func,
  keyAccessor: PropTypes.func,
  onChange: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.array]),
  isFloat: PropTypes.bool,
  isInt: PropTypes.bool,
  controlName: PropTypes.string.isRequired,
};

const defaultProps = {
  label: null,
  description: null,
  onChange: () => {},
  placeholder: t('Empty collection'),
  itemGenerator: () => ({ key: shortid.generate() }),
  keyAccessor: o => o.key,
  value: [],
  addTooltip: t('Add an item'),
};
const SortableListItem = SortableElement(CustomListItem);
const SortableList = SortableContainer(List);
const SortableDragger = SortableHandle(() => (
  <i
    role="img"
    aria-label="drag"
    className="fa fa-bars text-primary"
    style={{ cursor: 'ns-resize' }}
  />
));

class CollectionControl extends React.Component {
  constructor(props) {
    super(props);
    this.onAdd = this.onAdd.bind(this);
  }

  onChange(i, value) {
    Object.assign(this.props.value[i], value);
    this.props.onChange(this.props.value);
  }

  onAdd() {
    this.props.onChange(this.props.value.concat([this.props.itemGenerator()]));
  }

  onSortEnd({ oldIndex, newIndex }) {
    this.props.onChange(arrayMove(this.props.value, oldIndex, newIndex));
  }

  removeItem(i) {
    this.props.onChange(this.props.value.filter((o, ix) => i !== ix));
  }

  renderList() {
    if (this.props.value.length === 0) {
      return <div className="text-muted">{this.props.placeholder}</div>;
    }
    const Control = controlMap[this.props.controlName];
    return (
      <SortableList
        useDragHandle
        lockAxis="y"
        onSortEnd={this.onSortEnd.bind(this)}
        bordered
        css={theme => ({
          borderRadius: theme.gridUnit,
        })}
      >
        {this.props.value.map((o, i) => {
          // label relevant only for header, not here
          const { label, ...commonProps } = this.props;
          return (
            <SortableListItem
              className="clearfix"
              css={{ justifyContent: 'flex-start' }}
              key={this.props.keyAccessor(o)}
              index={i}
            >
              <SortableDragger />
              <div
                css={theme => ({
                  flex: 1,
                  marginLeft: theme.gridUnit * 2,
                  marginRight: theme.gridUnit * 2,
                })}
              >
                <Control
                  {...commonProps}
                  {...o}
                  onChange={this.onChange.bind(this, i)}
                />
              </div>
              <InfoTooltipWithTrigger
                icon="times"
                label="remove-item"
                tooltip={t('Remove item')}
                bsStyle="primary"
                onClick={this.removeItem.bind(this, i)}
              />
            </SortableListItem>
          );
        })}
      </SortableList>
    );
  }

  render() {
    const { theme } = this.props;
    return (
      <div data-test="CollectionControl" className="CollectionControl">
        <HeaderContainer>
          <ControlHeader {...this.props} />
          <AddIconButton onClick={this.onAdd}>
            <Icon
              name="plus-large"
              width={theme.gridUnit * 3}
              height={theme.gridUnit * 3}
              color={theme.colors.grayscale.light5}
            />
          </AddIconButton>
        </HeaderContainer>
        {this.renderList()}
      </div>
    );
  }
}

CollectionControl.propTypes = propTypes;
CollectionControl.defaultProps = defaultProps;

export default withTheme(CollectionControl);
