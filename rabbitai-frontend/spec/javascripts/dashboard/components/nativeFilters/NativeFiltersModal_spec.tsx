
import React from 'react';
import { styledMount as mount } from 'spec/helpers/theming';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { Provider } from 'react-redux';
import Alert from 'src/components/Alert';
import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';
import { mockStore } from 'spec/fixtures/mockStore';
import { FiltersConfigModal } from 'src/dashboard/components/nativeFilters/FiltersConfigModal/FiltersConfigModal';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock('@rabbitai-ui/core', () => ({
  // @ts-ignore
  ...jest.requireActual('@rabbitai-ui/core'),
  getChartMetadataRegistry: () => ({
    items: {
      filter_select: {
        value: {
          datasourceCount: 1,
          behaviors: ['NATIVE_FILTER'],
        },
      },
    },
  }),
}));

describe('FiltersConfigModal', () => {
  const mockedProps = {
    isOpen: true,
    initialFilterId: 'DefaultsID',
    createNewOnOpen: true,
    onCancel: jest.fn(),
    onSave: jest.fn(),
  };
  function setup(overridesProps?: any) {
    return mount(
      <Provider store={mockStore}>
        <FiltersConfigModal {...mockedProps} {...overridesProps} />
      </Provider>,
    );
  }

  it('should be a valid react element', () => {
    expect(React.isValidElement(<FiltersConfigModal {...mockedProps} />)).toBe(
      true,
    );
  });

  it('the form validates required fields', async () => {
    const onSave = jest.fn();
    const wrapper = setup({ save: onSave });
    act(() => {
      wrapper
        .find('input')
        .first()
        .simulate('change', { target: { value: 'test name' } });

      wrapper.find('.ant-modal-footer button').at(1).simulate('click');
    });
    await waitForComponentToPaint(wrapper);
    expect(onSave.mock.calls).toHaveLength(0);
  });

  describe('when click cancel', () => {
    let onCancel: jest.Mock;
    let wrapper: ReactWrapper;

    beforeEach(() => {
      onCancel = jest.fn();
      wrapper = setup({ onCancel, createNewOnOpen: false });
    });

    async function clickCancel() {
      act(() => {
        wrapper.find('.ant-modal-footer button').at(0).simulate('click');
      });
      await waitForComponentToPaint(wrapper);
    }

    function addFilter() {
      act(() => {
        wrapper.find('[aria-label="Add filter"]').at(0).simulate('click');
      });
    }

    it('does not show alert when there is no unsaved filters', async () => {
      await clickCancel();
      expect(onCancel.mock.calls).toHaveLength(1);
    });

    it('shows correct alert message for an unsaved filter', async () => {
      addFilter();
      await clickCancel();
      expect(onCancel.mock.calls).toHaveLength(0);
      expect(wrapper.find(Alert).text()).toContain(
        'Are you sure you want to cancel? "New filter" will not be saved.',
      );
    });

    it('shows correct alert message for 2 unsaved filters', async () => {
      addFilter();
      addFilter();
      await clickCancel();
      expect(onCancel.mock.calls).toHaveLength(0);
      expect(wrapper.find(Alert).text()).toContain(
        'Are you sure you want to cancel? "New filter" and "New filter" will not be saved.',
      );
    });
  });
});
