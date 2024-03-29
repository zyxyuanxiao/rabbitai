// @ts-ignore
import { JsonObject, RabbitaiClientResponse, t } from '@rabbitai-ui/core';
import {
  RabbitaiError,
  ErrorTypeEnum,
} from 'src/components/ErrorMessage/types';
import COMMON_ERR_MESSAGES from './errorMessages';

// The response always contains an error attribute, can contain anything from the
// RabbitaiClientResponse object, and can contain a spread JSON blob
export type ClientErrorObject = {
  error: string;
  errors?: RabbitaiError[];
  link?: string;
  // marshmallow field validation returns the error mssage in the format
  // of { field: [msg1, msg2] }
  message?: string;
  severity?: string;
  stacktrace?: string;
} & Partial<RabbitaiClientResponse>;

interface ResponseWithTimeout extends Response {
  timeout: number;
}

export function parseErrorJson(responseObject: JsonObject): ClientErrorObject {
  let error = { ...responseObject };
  // Backwards compatibility for old error renderers with the new error object
  if (error.errors && error.errors.length > 0) {
    error.error = error.description = error.errors[0].message;
    error.link = error.errors[0]?.extra?.link;
  }

  if (error.stack) {
    error = {
      ...error,
      error:
        t('Unexpected error: ') +
        (error.description || t('(no description, click to see stack trace)')),
      stacktrace: error.stack,
    };
  } else if (error.responseText && error.responseText.indexOf('CSRF') >= 0) {
    error = {
      ...error,
      error: t(COMMON_ERR_MESSAGES.SESSION_TIMED_OUT),
    };
  }

  return { ...error, error: error.error }; // explicit ClientErrorObject
}

export function getClientErrorObject(
  response: RabbitaiClientResponse | ResponseWithTimeout | string,
): Promise<ClientErrorObject> {
  // takes a RabbitaiClientResponse as input, attempts to read response as Json if possible,
  // and returns a Promise that resolves to a plain object with error key and text value.
  return new Promise(resolve => {
    if (typeof response === 'string') {
      resolve({ error: response });
    } else {
      const responseObject =
        response instanceof Response ? response : response.response;
      if (responseObject && !responseObject.bodyUsed) {
        // attempt to read the body as json, and fallback to text. we must clone the
        // response in order to fallback to .text() because Response is single-read
        responseObject
          .clone()
          .json()
          .then((errorJson: any) => {
            const error = { ...responseObject, ...errorJson };
            resolve(parseErrorJson(error));
          })
          .catch(() => {
            // fall back to reading as text
            responseObject.text().then((errorText: any) => {
              resolve({ ...responseObject, error: errorText });
            });
          });
      } else if (
        'statusText' in response &&
        response.statusText === 'timeout' &&
        'timeout' in response
      ) {
        resolve({
          ...responseObject,
          error: 'Request timed out',
          errors: [
            {
              error_type: ErrorTypeEnum.FRONTEND_TIMEOUT_ERROR,
              extra: {
                timeout: response.timeout / 1000,
                issue_codes: [
                  {
                    code: 1000,
                    message: t(
                      'Issue 1000 - The dataset is too large to query.',
                    ),
                  },
                  {
                    code: 1001,
                    message: t(
                      'Issue 1001 - The database is under an unusual load.',
                    ),
                  },
                ],
              },
              level: 'error',
              message: 'Request timed out',
            },
          ],
        });
      } else {
        // fall back to Response.statusText or generic error of we cannot read the response
        let error = (response as any).statusText || (response as any).message;
        if (!error) {
          // eslint-disable-next-line no-console
          console.error('non-standard error:', response);
          error = t('An error occurred');
        }
        resolve({
          ...responseObject,
          error,
        });
      }
    }
  });
}
