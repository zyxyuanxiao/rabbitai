
/* eslint-disable no-unused-expressions */
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { Select, CreatableSelect } from 'src/components/Select';
import OnPasteSelect from 'src/components/Select/OnPasteSelect';
import SelectControl from 'src/explore/components/controls/SelectControl';
import { styledMount as mount } from 'spec/helpers/theming';

const defaultProps = {
  choices: [
    ['1 year ago', '1 year ago'],
    ['today', 'today'],
  ],
  name: 'row_limit',
  label: 'Row Limit',
  valueKey: 'value', // shallow isn't passing SelectControl.defaultProps.valueKey through
  onChange: sinon.spy(),
};

const options = [
  { value: '1 year ago', label: '1 year ago' },
  { value: 'today', label: 'today' },
];

describe('SelectControl', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<SelectControl {...defaultProps} />);
  });

  it('uses Select in onPasteSelect when freeForm=false', () => {
    wrapper = shallow(<SelectControl {...defaultProps} multi />);
    const select = wrapper.find(OnPasteSelect);
    expect(select.props().selectWrap).toBe(Select);
  });

  it('uses Creatable in onPasteSelect when freeForm=true', () => {
    wrapper = shallow(<SelectControl {...defaultProps} multi freeForm />);
    const select = wrapper.find(OnPasteSelect);
    expect(select.props().selectWrap).toBe(CreatableSelect);
  });

  it('calls props.onChange when select', () => {
    const select = wrapper.instance();
    select.onChange({ value: 50 });
    expect(defaultProps.onChange.calledWith(50)).toBe(true);
  });

  it('returns all options on select all', () => {
    const expectedValues = ['one', 'two'];
    const selectAllProps = {
      multi: true,
      allowAll: true,
      choices: expectedValues,
      name: 'row_limit',
      label: 'Row Limit',
      valueKey: 'value',
      onChange: sinon.spy(),
    };
    wrapper.setProps(selectAllProps);
    wrapper.instance().onChange([{ meta: true, value: 'Select all' }]);
    expect(selectAllProps.onChange.calledWith(expectedValues)).toBe(true);
  });

  describe('render', () => {
    it('renders with Select by default', () => {
      expect(wrapper.find(OnPasteSelect)).not.toExist();
      expect(wrapper.findWhere(x => x.type() === Select)).toHaveLength(1);
    });

    it('renders with OnPasteSelect when multi', () => {
      wrapper.setProps({ multi: true });
      expect(wrapper.find(OnPasteSelect)).toExist();
      expect(wrapper.findWhere(x => x.type() === Select)).toHaveLength(0);
    });

    it('renders with Creatable when freeForm', () => {
      wrapper.setProps({ freeForm: true });
      expect(wrapper.find(OnPasteSelect)).not.toExist();
      expect(wrapper.findWhere(x => x.type() === CreatableSelect)).toHaveLength(
        1,
      );
    });
    describe('empty placeholder', () => {
      describe('withMulti', () => {
        it('does not show a placeholder if there are no choices', () => {
          const withMulti = mount(
            <SelectControl
              {...defaultProps}
              choices={[]}
              multi
              placeholder="add something"
            />,
          );
          expect(withMulti.html()).not.toContain('option(s');
        });
      });
      describe('withSingleChoice', () => {
        it('does not show a placeholder if there are no choices', () => {
          const singleChoice = mount(
            <SelectControl
              {...defaultProps}
              choices={[]}
              multi
              placeholder="add something"
            />,
          );
          expect(singleChoice.html()).not.toContain('option(s');
        });
      });
      describe('default placeholder', () => {
        it('does not show a placeholder if there are no options', () => {
          const defaultPlaceholder = mount(
            <SelectControl {...defaultProps} choices={[]} multi />,
          );
          expect(defaultPlaceholder.html()).not.toContain('option(s');
        });
      });
      describe('all choices selected', () => {
        it('does not show a placeholder', () => {
          const allChoicesSelected = mount(
            <SelectControl
              {...defaultProps}
              multi
              value={['today', '1 year ago']}
            />,
          );
          expect(allChoicesSelected.html()).not.toContain('option(s');
        });
      });
    });
    describe('when select is multi', () => {
      it('does not render the placeholder when a selection has been made', () => {
        wrapper = mount(
          <SelectControl
            {...defaultProps}
            multi
            value={['today']}
            placeholder="add something"
          />,
        );
        expect(wrapper.html()).not.toContain('add something');
      });
      it('shows numbers of options as a placeholder by default', () => {
        wrapper = mount(<SelectControl {...defaultProps} multi />);
        expect(wrapper.html()).toContain('2 option(s');
      });
      it('reduces the number of options in the placeholder by the value length', () => {
        wrapper = mount(
          <SelectControl {...defaultProps} multi value={['today']} />,
        );
        expect(wrapper.html()).toContain('1 option(s');
      });
    });
    describe('when select is single', () => {
      it('does not render the placeholder when a selection has been made', () => {
        wrapper = mount(
          <SelectControl
            {...defaultProps}
            value={50}
            placeholder="add something"
          />,
        );
        expect(wrapper.html()).not.toContain('add something');
      });
    });
  });

  describe('optionsRemaining', () => {
    describe('isMulti', () => {
      it('returns the options minus selected values', () => {
        const wrapper = mount(
          <SelectControl {...defaultProps} multi value={['today']} />,
        );
        expect(wrapper.instance().optionsRemaining()).toEqual(1);
      });
    });
    describe('is not multi', () => {
      it('returns the length of all options', () => {
        wrapper = mount(
          <SelectControl
            {...defaultProps}
            value={50}
            placeholder="add something"
          />,
        );
        expect(wrapper.instance().optionsRemaining()).toEqual(2);
      });
    });
    describe('with Select all', () => {
      it('does not count it', () => {
        const props = { ...defaultProps, multi: true, allowAll: true };
        const wrapper = mount(<SelectControl {...props} />);
        expect(wrapper.instance().getOptions(props).length).toEqual(3);
        expect(wrapper.instance().optionsRemaining()).toEqual(2);
      });
    });
  });

  describe('getOptions', () => {
    it('returns the correct options', () => {
      wrapper.setProps(defaultProps);
      expect(wrapper.instance().getOptions(defaultProps)).toEqual(options);
    });

    it('shows Select-All when enabled', () => {
      const selectAllProps = {
        choices: ['one', 'two'],
        name: 'name',
        freeForm: true,
        allowAll: true,
        multi: true,
        valueKey: 'value',
      };
      wrapper.setProps(selectAllProps);
      expect(wrapper.instance().getOptions(selectAllProps)).toContainEqual({
        label: 'Select all',
        meta: true,
        value: 'Select all',
      });
    });

    it('returns the correct options when freeform is set to true', () => {
      const freeFormProps = {
        choices: [],
        freeForm: true,
        value: ['one', 'two'],
        name: 'row_limit',
        label: 'Row Limit',
        valueKey: 'custom_value_key',
        onChange: sinon.spy(),
      };
      // the last added option is at the top
      const expectedNewOptions = [
        { custom_value_key: 'two', label: 'two' },
        { custom_value_key: 'one', label: 'one' },
      ];
      wrapper.setProps(freeFormProps);
      expect(wrapper.instance().getOptions(freeFormProps)).toEqual(
        expectedNewOptions,
      );
    });
  });

  describe('UNSAFE_componentWillReceiveProps', () => {
    it('sets state.options if props.choices has changed', () => {
      const updatedOptions = [
        { value: 'three', label: 'three' },
        { value: 'four', label: 'four' },
      ];
      const newProps = {
        choices: [
          ['three', 'three'],
          ['four', 'four'],
        ],
        name: 'name',
        freeForm: false,
        value: null,
      };
      wrapper.setProps(newProps);
      expect(wrapper.state().options).toEqual(updatedOptions);
    });
  });
});
