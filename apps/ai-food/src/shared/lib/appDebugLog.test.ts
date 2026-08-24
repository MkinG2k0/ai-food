import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import {
  appDebugLog,
  bindAppDebugEnabled,
  buildAppDebugReport,
  clearAppDebugLog,
} from './appDebugLog';

describe('appDebugLog', () => {
  beforeEach(() => {
    clearAppDebugLog();
    bindAppDebugEnabled(() => false);
  });

  afterEach(() => {
    clearAppDebugLog();
    bindAppDebugEnabled(() => false);
  });

  it('does not collect lines when debug mode is off', () => {
    appDebugLog('photo', 'snapshot', 1);
    expect(buildAppDebugReport()).toContain('(empty)');
  });

  it('collects categorized lines when debug mode is on', () => {
    bindAppDebugEnabled(() => true);
    appDebugLog('photo', 'snapshot', 3);
    appDebugLog('analyze', 'network stream', 1200, { job: 'abc' });

    const report = buildAppDebugReport();
    expect(report).toContain('[photo] snapshot: 3ms');
    expect(report).toContain('[analyze] network stream: 1200ms · job=abc');
    expect(report).toContain('debug: on');
    expect(report).toContain(`appVersion: ${pkg.version}`);
  });
});
