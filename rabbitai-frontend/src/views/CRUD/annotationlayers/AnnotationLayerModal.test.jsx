
import React from 'react';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import fetchMock from 'fetch-mock';
import AnnotationLayerModal from 'src/views/CRUD/annotationlayers/AnnotationLayerModal';
import Modal from 'src/components/Modal';
import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';
import { styledMount as mount } from 'spec/helpers/theming';

const mockData = { id: 1, name: 'test', descr: 'test description' };
const FETCH_ANNOTATION_LAYER_ENDPOINT = 'glob:*/api/v1/annotation_layer/*';
const ANNOTATION_LAYER_PAYLOAD = { result: mockData };

fetchMock.get(FETCH_ANNOTATION_LAYER_ENDPOINT, ANNOTATION_LAYER_PAYLOAD);

const mockStore = configureStore([thunk]);
const store = mockStore({});

const mockedProps = {
  addDangerToast: () => {},
  onLayerAdd: jest.fn(() => []),
  onHide: () => {},
  show: true,
  layer: mockData,
};

async function mountAndWait(props = mockedProps) {
  const mounted = mount(
    <Provider store={store}>
      <AnnotationLayerModal show {...props} />
    </Provider>,
  );
  await waitForComponentToPaint(mounted);

  return mounted;
}

describe('AnnotationLayerModal', () => {
  let wrapper;

  beforeAll(async () => {
    wrapper = await mountAndWait();
  });

  it('renders', () => {
    expect(wrapper.find(AnnotationLayerModal)).toExist();
  });

  it('renders a Modal', () => {
    expect(wrapper.find(Modal)).toExist();
  });

  it('renders add header when no layer is included', async () => {
    const addWrapper = await mountAndWait({});
    expect(
      addWrapper.find('[data-test="annotation-layer-modal-title"]').text(),
    ).toEqual('Add annotation layer');
  });

  it('renders edit header when layer prop is included', () => {
    expect(
      wrapper.find('[data-test="annotation-layer-modal-title"]').text(),
    ).toEqual('Edit annotation layer properties');
  });

  it('renders input element for name', () => {
    expect(wrapper.find('input[name="name"]')).toExist();
  });

  it('renders textarea element for description', () => {
    expect(wrapper.find('textarea[name="descr"]')).toExist();
  });
});
