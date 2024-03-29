
import { t } from '@rabbitai-ui/core';

import {
  FETCH_ALL_SLICES_FAILED,
  FETCH_ALL_SLICES_STARTED,
  SET_ALL_SLICES,
} from '../actions/sliceEntities';
import { HYDRATE_DASHBOARD } from '../actions/hydrate';

export const initSliceEntities = {
  slices: {},
  isLoading: true,
  errorMessage: null,
  lastUpdated: 0,
};

export default function sliceEntitiesReducer(
  state = initSliceEntities,
  action,
) {
  const actionHandlers = {
    [HYDRATE_DASHBOARD]() {
      return {
        ...action.data.sliceEntities,
      };
    },
    [FETCH_ALL_SLICES_STARTED]() {
      return {
        ...state,
        isLoading: true,
      };
    },
    [SET_ALL_SLICES]() {
      return {
        ...state,
        isLoading: false,
        slices: { ...state.slices, ...action.payload.slices },
        lastUpdated: new Date().getTime(),
      };
    },
    [FETCH_ALL_SLICES_FAILED]() {
      return {
        ...state,
        isLoading: false,
        lastUpdated: new Date().getTime(),
        errorMessage:
          action.payload.error || t('Could not fetch all saved charts'),
      };
    },
  };

  if (action.type in actionHandlers) {
    return actionHandlers[action.type]();
  }
  return state;
}
