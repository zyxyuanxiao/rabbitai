
import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import DragDroppable from '../dnd/DragDroppable';
import DragHandle from '../dnd/DragHandle';
import DashboardComponent from '../../containers/DashboardComponent';
import DeleteComponentButton from '../DeleteComponentButton';
import HoverMenu from '../menu/HoverMenu';
import IconButton from '../IconButton';
import BackgroundStyleDropdown from '../menu/BackgroundStyleDropdown';
import WithPopoverMenu from '../menu/WithPopoverMenu';

import { componentShape } from '../../util/propShapes';
import backgroundStyleOptions from '../../util/backgroundStyleOptions';
import { BACKGROUND_TRANSPARENT } from '../../util/constants';

const propTypes = {
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,

  // grid related
  availableColumnCount: PropTypes.number.isRequired,
  columnWidth: PropTypes.number.isRequired,
  occupiedColumnCount: PropTypes.number.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  onResizeStop: PropTypes.func.isRequired,

  // dnd
  handleComponentDrop: PropTypes.func.isRequired,
  deleteComponent: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
};

class Row extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isFocused: false,
    };
    this.handleDeleteComponent = this.handleDeleteComponent.bind(this);
    this.handleUpdateMeta = this.handleUpdateMeta.bind(this);
    this.handleChangeBackground = this.handleUpdateMeta.bind(
      this,
      'background',
    );
    this.handleChangeFocus = this.handleChangeFocus.bind(this);
  }

  handleChangeFocus(nextFocus) {
    this.setState(() => ({ isFocused: Boolean(nextFocus) }));
  }

  handleUpdateMeta(metaKey, nextValue) {
    const { updateComponents, component } = this.props;
    if (nextValue && component.meta[metaKey] !== nextValue) {
      updateComponents({
        [component.id]: {
          ...component,
          meta: {
            ...component.meta,
            [metaKey]: nextValue,
          },
        },
      });
    }
  }

  handleDeleteComponent() {
    const { deleteComponent, component, parentId } = this.props;
    deleteComponent(component.id, parentId);
  }

  render() {
    const {
      component: rowComponent,
      parentComponent,
      index,
      availableColumnCount,
      columnWidth,
      occupiedColumnCount,
      depth,
      onResizeStart,
      onResize,
      onResizeStop,
      handleComponentDrop,
      editMode,
      isComponentVisible,
    } = this.props;

    const rowItems = rowComponent.children || [];

    const backgroundStyle = backgroundStyleOptions.find(
      opt =>
        opt.value === (rowComponent.meta.background || BACKGROUND_TRANSPARENT),
    );

    return (
      <DragDroppable
        component={rowComponent}
        parentComponent={parentComponent}
        orientation="row"
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        editMode={editMode}
      >
        {({ dropIndicatorProps, dragSourceRef }) => (
          <WithPopoverMenu
            isFocused={this.state.isFocused}
            onChangeFocus={this.handleChangeFocus}
            disableClick
            menuItems={[
              <BackgroundStyleDropdown
                id={`${rowComponent.id}-background`}
                value={backgroundStyle.value}
                onChange={this.handleChangeBackground}
              />,
            ]}
            editMode={editMode}
          >
            {editMode && (
              <HoverMenu innerRef={dragSourceRef} position="left">
                <DragHandle position="left" />
                <DeleteComponentButton onDelete={this.handleDeleteComponent} />
                <IconButton
                  onClick={this.handleChangeFocus}
                  className="fa fa-cog"
                />
              </HoverMenu>
            )}
            <div
              className={cx(
                'grid-row',
                rowItems.length === 0 && 'grid-row--empty',
                backgroundStyle.className,
              )}
              data-test={`grid-row-${backgroundStyle.className}`}
            >
              {rowItems.map((componentId, itemIndex) => (
                <DashboardComponent
                  key={componentId}
                  id={componentId}
                  parentId={rowComponent.id}
                  depth={depth + 1}
                  index={itemIndex}
                  availableColumnCount={
                    availableColumnCount - occupiedColumnCount
                  }
                  columnWidth={columnWidth}
                  onResizeStart={onResizeStart}
                  onResize={onResize}
                  onResizeStop={onResizeStop}
                  isComponentVisible={isComponentVisible}
                />
              ))}

              {dropIndicatorProps && <div {...dropIndicatorProps} />}
            </div>
          </WithPopoverMenu>
        )}
      </DragDroppable>
    );
  }
}

Row.propTypes = propTypes;

export default Row;
