
import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import EditableTable from 'src/components/EditableTitle';

describe('EditableTitle', () => {
  const callback = sinon.spy();
  const mockProps = {
    title: 'my title',
    canEdit: true,
    onSaveTitle: callback,
  };
  const mockEvent = {
    target: {
      value: 'new title',
    },
  };
  let editableWrapper = shallow(<EditableTable {...mockProps} />);
  const notEditableWrapper = shallow(
    <EditableTable title="my title" onSaveTitle={callback} />,
  );
  it('is valid', () => {
    expect(React.isValidElement(<EditableTable {...mockProps} />)).toBe(true);
  });
  it('should render title', () => {
    const titleElement = editableWrapper.find('input');
    expect(titleElement.props().value).toBe('my title');
    expect(titleElement.props().type).toBe('button');
  });
  it('should not render an input if it is not editable', () => {
    expect(notEditableWrapper.find('input')).not.toExist();
  });

  describe('should handle click', () => {
    it('should change title', () => {
      editableWrapper.find('input').simulate('click');
      expect(editableWrapper.find('input').props().type).toBe('text');
    });
  });

  describe('should handle change', () => {
    afterEach(() => {
      editableWrapper = shallow(<EditableTable {...mockProps} />);
    });
    it('should change title', () => {
      editableWrapper.find('input').simulate('change', mockEvent);
      expect(editableWrapper.find('input').props().value).toBe('new title');
    });
  });

  describe('should handle blur', () => {
    beforeEach(() => {
      editableWrapper.find('input').simulate('click');
    });
    afterEach(() => {
      callback.resetHistory();
      editableWrapper = shallow(<EditableTable {...mockProps} />);
    });

    it('default input type should be text', () => {
      expect(editableWrapper.find('input').props().type).toBe('text');
    });

    it('should trigger callback', () => {
      editableWrapper.find('input').simulate('change', mockEvent);
      editableWrapper.find('input').simulate('blur');
      expect(editableWrapper.find('input').props().type).toBe('button');
      expect(callback.callCount).toBe(1);
      expect(callback.getCall(0).args[0]).toBe('new title');
    });
    it('should not trigger callback', () => {
      editableWrapper.find('input').simulate('blur');
      expect(editableWrapper.find('input').props().type).toBe('button');
      // no change
      expect(callback.callCount).toBe(0);
    });
    it('should not save empty title', () => {
      editableWrapper.find('input').simulate('blur');
      expect(editableWrapper.find('input').props().type).toBe('button');
      expect(editableWrapper.find('input').props().value).toBe('my title');
      expect(callback.callCount).toBe(0);
    });
  });
});
