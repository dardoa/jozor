import type { KindiLearningTrace } from '../types';
import type { KindiLearningEventInput } from './kindiLearningService';

type LearningService = Pick<
  typeof import('./kindiLearningService'),
  'logKindiLearningEvent' | 'logKindiSuccess'
>;

const withLearningService = (send: (service: LearningService) => void): void => {
  // Optional diagnostics must not fail a completed search or tree action.
  void import('./kindiLearningService').then(send).catch(() => {
    if (import.meta.env.DEV) {
      console.warn('[Kindi learning] Diagnostic service unavailable.');
    }
  });
};

export const logKindiLearningEvent = (event: KindiLearningEventInput): void => {
  withLearningService((service) => service.logKindiLearningEvent(event));
};

export const logKindiLearningSuccess = (trace?: KindiLearningTrace): void => {
  if (!trace) return;
  withLearningService((service) => service.logKindiSuccess(trace));
};
