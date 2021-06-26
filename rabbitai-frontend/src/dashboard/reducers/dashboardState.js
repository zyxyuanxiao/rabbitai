
/* eslint-disable camelcase */
import {
  ADD_SLICE,
  ON_CHANGE,
  ON_SAVE,
  REMOVE_SLICE,
  SET_COLOR_SCHEME,
  SET_EDIT_MODE,
  SET_MAX_UNDO_HISTORY_EXCEEDED,
  SET_UNSAVED_CHANGES,
  SHOW_BUILDER_PANE,
  TOGGLE_EXPAND_SLICE,
  TOGGLE_FAVE_STAR,
  TOGGLE_PUBLISHED,
  UPDATE_CSS,
  SET_REFRESH_FREQUENCY,
  SET_DIRECT_PATH,
  SET_FOCUSED_FILTER_FIELD,
  UNSET_FOCUSED_FILTER_FIELD,
} from '../actions/dashboardState';
import { HYDRATE_DASHBOARD } from '../actions/hydrate';

export default function dashboardStateReducer(state = {}, action) {
  const actionHandlers = {
    [HYDRATE_DASHBOARD]() {
      return { ...state, ...action.data.dashboardState };
    },
    [UPDATE_CSS]() {
      return { ...state, css: action.css };
    },
    [ADD_SLICE]() {
      const updatedSliceIds = new Set(state.sliceIds);
      updatedSliceIds.add(action.slice.slice_id);
      return {
        ...state,
        sliceIds: Array.from(updatedSliceIds),
      };
    },
    [REMOVE_SLICE]() {
      const { sliceId } = action;
      const updatedSliceIds = new Set(state.sliceIds);
      updatedSliceIds.delete(sliceId);

      return {
        ...state,
        sliceIds: Array.from(updatedSliceIds),
      };
    },
    [TOGGLE_FAVE_STAR]() {
      return { ...state, isStarred: action.isStarred };
    },
    [TOGGLE_PUBLISHED]() {
      return { ...state, isPublished: action.isPublished };
    },
    [SET_EDIT_MODE]() {
      return {
        ...state,
        editMode: action.editMode,
      };
    },
    [SET_MAX_UNDO_HISTORY_EXCEEDED]() {
      const { maxUndoHistoryExceeded = true } = action.payload;
      return { ...state, maxUndoHistoryExceeded };
    },
    [SHOW_BUILDER_PANE]() {
      return { ...state };
    },
    [SET_COLOR_SCHEME]() {
      return {
        ...state,
        colorScheme: action.colorScheme,
        updatedColorScheme: true,
      };
    },
    [TOGGLE_EXPAND_SLICE]() {
      const updatedExpandedSlices = { ...state.expandedSlices };
      const { sliceId } = action;
      if (updatedExpandedSlices[sliceId]) {
        delete updatedExpandedSlices[sliceId];
      } else {
        updatedExpandedSlices[sliceId] = true;
      }
      return { ...state, expandedSlices: updatedExpandedSlices };
    },
    [ON_CHANGE]() {
      return { ...state, hasUnsavedChanges: true };
    },
    [ON_SAVE]() {
      return {
        ...state,
        hasUnsavedChanges: false,
        maxUndoHistoryExceeded: false,
        editMode: false,
        updatedColorScheme: false,
        // server-side returns last_modified_time for latest change
        lastModifiedTime: action.lastModifiedTime,
      };
    },
    [SET_UNSAVED_CHANGES]() {
      const { hasUnsavedChanges } = action.payload;
      return { ...state, hasUnsavedChanges };
    },
    [SET_REFRESH_FREQUENCY]() {
      return {
        ...state,
        refreshFrequency: action.refreshFrequency,
        shouldPersistRefreshFrequency: action.isPersistent,
        hasUnsavedChanges: action.isPersistent,
      };
    },
    [SET_DIRECT_PATH]() {
      return {
        ...state,
        directPathToChild: action.path,
        directPathLastUpdated: Date.now(),
      };
    },
    [SET_FOCUSED_FILTER_FIELD]() {
      return {
        ...state,
        focusedFilterField: {
          chartId: action.chartId,
          column: action.column,
        },
      };
    },
    [UNSET_FOCUSED_FILTER_FIELD]() {
      // dashboard only has 1 focused filter field at a time,
      // but when user switch different filter boxes,
      // browser didn't always fire onBlur and onFocus events in order.
      if (
        !state.focusedFilterField ||
        action.chartId !== state.focusedFilterField.chartId ||
        action.column !== state.focusedFilterField.column
      ) {
        return state;
      }
      return {
        ...state,
        focusedFilterField: null,
      };
    },
  };

  if (action.type in actionHandlers) {
    return actionHandlers[action.type]();
  }
  return state;
}