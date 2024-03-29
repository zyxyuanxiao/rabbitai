
import { ADD_TOAST, REMOVE_TOAST } from '../actions';

export default function messageToastsReducer(toasts = [], action) {
  switch (action.type) {
    case ADD_TOAST: {
      const { payload: toast } = action;
      const result = toasts.slice();
      if (!toast.noDuplicate || !result.find(x => x.text === toast.text)) {
        return [toast, ...toasts];
      }
      return toasts;
    }

    case REMOVE_TOAST: {
      const {
        payload: { id },
      } = action;
      return [...toasts].filter(toast => toast.id !== id);
    }

    default:
      return toasts;
  }
}
